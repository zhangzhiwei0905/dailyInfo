import "./_env";

import type { Locale } from "@prisma/client";
import type { ArticleInput, DailyReport } from "../lib/ai/pipeline";
import { prisma } from "../lib/db/prisma";
import { groupRaw, renderHtml } from "../lib/output/render";
import { sources } from "../lib/sources/registry";

const date = process.argv[2];
const locale = (process.argv[3] === "en" ? "en" : "zh") as Locale;

async function main() {
  if (!date) {
    console.error("Usage: tsx scripts/rerender-db-report.ts <YYYY-MM-DD> [zh|en]");
    process.exit(1);
  }

  const report = await prisma.report.findUnique({
    where: { dateKey_locale: { dateKey: date, locale } },
    include: { articles: true },
  });

  if (!report || report.status !== "ready" || !report.reportJson) {
    console.error(`[rerender-db-report] no ready ${locale} report for ${date}`);
    process.exit(1);
  }

  const articles: ArticleInput[] = report.articles.map((article) => ({
    sourceId: article.sourceId,
    source: article.sourceName,
    category: article.category,
    title: article.title,
    url: article.url,
    excerpt: article.excerpt ?? undefined,
    summary: article.summary ?? undefined,
    meta: article.meta ?? undefined,
    publishedAt: article.publishedAt ?? undefined,
    sourceRank: article.sourceRank ?? undefined,
    engagementScore: article.engagementScore ?? undefined,
    heatScore: article.heatScore ?? undefined,
    recommendationScore: article.recommendationScore ?? undefined,
    recommendationReason: article.recommendationReason ?? undefined,
  }));

  const raw = groupRaw(articles, sources);
  const html = renderHtml(report.reportJson as unknown as DailyReport, raw, date);

  await prisma.report.update({
    where: { dateKey_locale: { dateKey: date, locale } },
    data: { html },
  });

  console.log(`[rerender-db-report] updated ${date} ${locale}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
