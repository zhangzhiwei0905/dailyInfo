import type { Locale, RunTrigger } from "@prisma/client";
import { prisma } from "../db/prisma";
import { listEnabledSourceDefs } from "../db/source-repository";
import { generateDailyBrief } from "./generation-service";
import { persistGenerationResult } from "./report-persistence";

let inProcess = false;

// Active SSE subscribers keyed by run id
const subscribers = new Map<string, Set<(event: string, data: string) => void>>();

function broadcast(runId: string, event: string, data: string) {
  const subs = subscribers.get(runId);
  if (!subs) return;
  for (const send of subs) send(event, data);
}

export function subscribeRun(runId: string, send: (event: string, data: string) => void): () => void {
  if (!subscribers.has(runId)) subscribers.set(runId, new Set());
  subscribers.get(runId)!.add(send);
  return () => {
    const subs = subscribers.get(runId);
    if (subs) {
      subs.delete(send);
      if (subs.size === 0) subscribers.delete(runId);
    }
  };
}

export function isGenerationRunning(): boolean {
  return inProcess;
}

export async function runGeneration(input: {
  date: string;
  locale: Locale;
  trigger: RunTrigger;
}): Promise<void> {
  if (inProcess) throw new Error("generation already running in this process");
  inProcess = true;
  const run = await prisma.generationRun.create({
    data: {
      dateKey: input.date,
      locale: input.locale,
      trigger: input.trigger,
      status: "running",
    },
  });
  const logLines: string[] = [];

  try {
    const sources = await listEnabledSourceDefs(input.locale);
    const result = await generateDailyBrief({
      date: input.date,
      sources,
      writeFiles: true,
      outputMarkdown: process.env.OUTPUT_MARKDOWN === "true",
      includeTrading: true,
      log: (line) => {
        logLines.push(line);
        broadcast(run.id, "log", line);
      },
    });
    const report = await persistGenerationResult(result);
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        reportId: report.id,
        status: "success",
        finishedAt: new Date(),
        articlesCount: result.articles.length,
        llmBackend: process.env.LLM_BACKEND ?? "claude-cli",
        errorMessage: null,
        logExcerpt: logLines.slice(-40).join("\n"),
      },
    });
    broadcast(run.id, "done", "success");
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        logExcerpt: logLines.slice(-40).join("\n"),
      },
    });
    broadcast(run.id, "done", "failed");
    throw error;
  } finally {
    inProcess = false;
    // Clean up subscribers after a short delay so clients can receive the final event
    setTimeout(() => subscribers.delete(run.id), 5_000);
  }
}

export function startManualGeneration(input: { date: string; locale: Locale }): void {
  void runGeneration({ ...input, trigger: "manual" }).catch((error) => {
    console.error("[generation] manual generation failed", error);
  });
}
