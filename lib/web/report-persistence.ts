import type { Locale } from "@prisma/client";
import { upsertReadyReport } from "../db/report-repository";
import type { GenerateDailyResult } from "./generation-service";

export function currentLocale(): Locale {
  return process.env.REPORT_LOCALE === "en" ? "en" : "zh";
}

export function reportSummary(result: GenerateDailyResult): string {
  const overview = result.report.daily_overview?.trim();
  if (overview) return overview.slice(0, 240);
  return result.report.tech_briefs[0]?.summary ?? result.report.editor_note ?? "";
}

export async function persistGenerationResult(result: GenerateDailyResult) {
  return upsertReadyReport({
    date: result.date,
    locale: currentLocale(),
    report: result.report,
    html: result.html,
    summary: reportSummary(result),
    articles: result.articles,
  });
}
