import type { Category, Prisma, SavedArticle } from "@prisma/client";
import { prisma } from "./prisma";

export type FavoriteSort = "saved" | "recommended" | "latest";

export type FavoriteArticleInput = {
  url: string;
  title: string;
  sourceId?: string | null;
  sourceName?: string | null;
  category?: Category | null;
  excerpt?: string | null;
  summary?: string | null;
  meta?: string | null;
  publishedAt?: Date | string | null;
  reportDate?: string | null;
};

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeFavoriteUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function listSavedUrls(urls: string[]): Promise<string[]> {
  const normalized = urls
    .map((url) => normalizeFavoriteUrl(url))
    .filter((url): url is string => Boolean(url));
  if (normalized.length === 0) return [];

  const rows = await prisma.savedArticle.findMany({
    where: { url: { in: normalized } },
    select: { url: true },
  });
  return rows.map((row) => row.url);
}

export async function setSavedArticle(input: FavoriteArticleInput, saved: boolean) {
  const url = normalizeFavoriteUrl(input.url);
  if (!url) throw new Error("invalid url");

  if (!saved) {
    await prisma.savedArticle.deleteMany({ where: { url } });
    return { saved: false };
  }

  const publishedAt = parseDate(input.publishedAt);
  await prisma.savedArticle.upsert({
    where: { url },
    update: {
      title: input.title,
      sourceId: input.sourceId ?? null,
      sourceName: input.sourceName ?? null,
      category: input.category ?? null,
      excerpt: input.excerpt ?? null,
      summary: input.summary ?? null,
      meta: input.meta ?? null,
      publishedAt,
      lastReportDate: input.reportDate ?? null,
    },
    create: {
      url,
      title: input.title,
      sourceId: input.sourceId ?? null,
      sourceName: input.sourceName ?? null,
      category: input.category ?? null,
      excerpt: input.excerpt ?? null,
      summary: input.summary ?? null,
      meta: input.meta ?? null,
      publishedAt,
      firstReportDate: input.reportDate ?? null,
      lastReportDate: input.reportDate ?? null,
    },
  });
  return { saved: true };
}

async function sortByRecommendation(rows: SavedArticle[]): Promise<SavedArticle[]> {
  if (rows.length === 0) return rows;
  const urls = rows.map((row) => row.url);
  const articleScores = await prisma.reportArticle.findMany({
    where: {
      url: { in: urls },
      recommendationScore: { not: null },
    },
    select: {
      url: true,
      recommendationScore: true,
      publishedAt: true,
      report: { select: { dateKey: true } },
    },
    orderBy: [{ report: { dateKey: "desc" } }, { recommendationScore: "desc" }],
  });
  const scoreByUrl = new Map<string, number>();
  for (const article of articleScores) {
    if (!scoreByUrl.has(article.url)) {
      scoreByUrl.set(article.url, article.recommendationScore ?? 0);
    }
  }

  return [...rows].sort((a, b) => {
    const scoreDiff = (scoreByUrl.get(b.url) ?? 0) - (scoreByUrl.get(a.url) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.savedAt.getTime() - a.savedAt.getTime();
  });
}

export async function listSavedArticles(sort: FavoriteSort = "saved") {
  const orderBy: Prisma.SavedArticleOrderByWithRelationInput[] =
    sort === "latest"
      ? [{ publishedAt: "desc" }, { savedAt: "desc" }]
      : [{ savedAt: "desc" }];

  const rows = await prisma.savedArticle.findMany({ orderBy });
  if (sort !== "recommended") return rows;
  return sortByRecommendation(rows);
}
