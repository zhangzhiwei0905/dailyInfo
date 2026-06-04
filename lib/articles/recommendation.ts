import type { RawArticle } from "../sources/types";

type RecommendationInput = Pick<
  RawArticle,
  "sourceId" | "sourceRank" | "engagementScore" | "publishedAt"
>;

export function normalizeEngagement(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  if (value <= 0) return 0;
  const normalized = Math.log10(value + 1) / 3;
  return Math.min(100, normalized * 100);
}

function recencyScore(publishedAt: Date | undefined, now: Date): number {
  if (!publishedAt) return 45;
  const ageHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / 3_600_000);
  return Math.max(0, 100 - ageHours * 4);
}

function rankScore(sourceRank: number | undefined): number {
  if (!sourceRank || sourceRank <= 0) return 55;
  return Math.max(0, 100 - (sourceRank - 1) * 8);
}

export function recommendationReason(input: RecommendationInput): string {
  if ((input.engagementScore ?? 0) > 0) return "来源热度靠前";
  if (input.sourceRank !== undefined) return "来源排位靠前";
  if (input.publishedAt) return "发布时间较新";
  return "来源顺序稳定";
}

function scoreArticle(article: RawArticle, now: Date): RawArticle {
  const heatScore = normalizeEngagement(article.engagementScore);
  const recency = recencyScore(article.publishedAt, now);
  const rank = rankScore(article.sourceRank);
  const score =
    heatScore === undefined
      ? recency * 0.58 + rank * 0.42
      : heatScore * 0.45 + recency * 0.25 + rank * 0.2 + 10;

  return {
    ...article,
    heatScore,
    recommendationScore: Math.round(score * 100) / 100,
    recommendationReason: recommendationReason(article),
  };
}

function sortByRecommendation(articles: RawArticle[]): RawArticle[] {
  return [...articles].sort((a, b) => {
    const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
}

function applyDiversityPenalty(articles: RawArticle[]): RawArticle[] {
  const seenBySource = new Map<string, number>();
  return articles.map((article) => {
    const seen = seenBySource.get(article.sourceId) ?? 0;
    seenBySource.set(article.sourceId, seen + 1);
    if (seen === 0 || article.recommendationScore === undefined) return article;
    return {
      ...article,
      recommendationScore: Math.max(
        0,
        Math.round((article.recommendationScore - Math.min(12, seen * 3)) * 100) / 100,
      ),
    };
  });
}

export function applyRecommendationScores(
  articles: RawArticle[],
  options: { now?: Date } = {},
): RawArticle[] {
  const now = options.now ?? new Date();
  return sortByRecommendation(applyDiversityPenalty(sortByRecommendation(articles.map((article) => scoreArticle(article, now)))));
}

export function sortArticlesForReading<T extends RawArticle>(articles: T[]): T[] {
  return [...articles].sort((a, b) => {
    const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
}
