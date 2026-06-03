import type { Locale, RunTrigger } from "@prisma/client";
import { prisma } from "../db/prisma";
import { listEnabledSourceDefs } from "../db/source-repository";
import { generateDailyBrief } from "./generation-service";
import { persistGenerationResult } from "./report-persistence";

let inProcess = false;

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
      log: (line) => logLines.push(line),
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
        logExcerpt: logLines.slice(-40).join("\n"),
      },
    });
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
    throw error;
  } finally {
    inProcess = false;
  }
}
