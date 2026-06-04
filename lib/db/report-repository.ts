import type { Locale, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { ArticleInput, DailyReport } from "../ai/pipeline";

export async function upsertReadyReport(input: {
  date: string;
  locale: Locale;
  report: DailyReport;
  html: string;
  summary: string;
  articles: ArticleInput[];
}) {
  const report = await prisma.report.upsert({
    where: { dateKey_locale: { dateKey: input.date, locale: input.locale } },
    update: {
      status: "ready",
      reportJson: input.report as unknown as Prisma.InputJsonValue,
      html: input.html,
      summary: input.summary,
      generatedAt: new Date(),
      articles: { deleteMany: {} },
    },
    create: {
      dateKey: input.date,
      locale: input.locale,
      status: "ready",
      reportJson: input.report as unknown as Prisma.InputJsonValue,
      html: input.html,
      summary: input.summary,
      generatedAt: new Date(),
    },
  });

  if (input.articles.length > 0) {
    await prisma.reportArticle.createMany({
      data: input.articles.map((article) => ({
        reportId: report.id,
        sourceId: article.sourceId,
        sourceName: article.source,
        category: article.category,
        title: article.title,
        url: article.url,
        excerpt: article.excerpt ?? null,
        summary: article.summary ?? null,
        meta: article.meta ?? null,
        publishedAt: article.publishedAt ?? null,
        sourceRank: article.sourceRank ?? null,
        engagementScore: article.engagementScore ?? null,
        heatScore: article.heatScore ?? null,
        recommendationScore: article.recommendationScore ?? null,
        recommendationReason: article.recommendationReason ?? null,
        rawJson: {
          sourceId: article.sourceId,
          title: article.title,
          url: article.url,
          excerpt: article.excerpt ?? null,
          meta: article.meta ?? null,
          sourceRank: article.sourceRank ?? null,
          engagementScore: article.engagementScore ?? null,
          heatScore: article.heatScore ?? null,
          recommendationScore: article.recommendationScore ?? null,
          recommendationReason: article.recommendationReason ?? null,
        },
      })),
    });
  }

  return report;
}

export async function findReportHtml(date: string, locale: Locale): Promise<string | null> {
  const report = await prisma.report.findUnique({
    where: { dateKey_locale: { dateKey: date, locale } },
    select: { html: true, status: true },
  });
  if (!report || report.status !== "ready") return null;
  return report.html;
}

export async function listReadyReports(locale: Locale) {
  return prisma.report.findMany({
    where: { locale, status: "ready" },
    orderBy: { dateKey: "desc" },
    select: { dateKey: true, summary: true, generatedAt: true },
  });
}
