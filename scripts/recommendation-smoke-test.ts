import assert from "node:assert/strict";
import {
  applyRecommendationScores,
  normalizeEngagement,
  recommendationReason,
} from "../lib/articles/recommendation";
import type { RawArticle } from "../lib/sources/types";

const now = new Date("2026-06-04T08:00:00.000Z");

assert.equal(normalizeEngagement(undefined), undefined);
assert.equal(normalizeEngagement(0), 0);
assert.ok(Math.abs((normalizeEngagement(10) ?? 0) - 34.71308950527416) < 0.0000000001);
assert.equal(Math.round(normalizeEngagement(1000) ?? 0), 100);

assert.equal(
  recommendationReason({
    sourceId: "github-trending",
    sourceRank: 1,
    engagementScore: 800,
    publishedAt: undefined,
  }),
  "来源热度靠前",
);
assert.equal(
  recommendationReason({
    sourceId: "rss-news",
    sourceRank: undefined,
    engagementScore: undefined,
    publishedAt: now,
  }),
  "发布时间较新",
);

const articles: RawArticle[] = [
  {
    sourceId: "plain-rss",
    title: "Newest plain RSS",
    url: "https://example.com/rss-new",
    category: "tech",
    publishedAt: new Date("2026-06-04T07:30:00.000Z"),
  },
  {
    sourceId: "github-trending",
    title: "Hot repo",
    url: "https://example.com/repo",
    category: "tech",
    sourceRank: 1,
    engagementScore: 900,
  },
  {
    sourceId: "v2ex-hot",
    title: "Repeated source item",
    url: "https://example.com/v2ex-1",
    category: "tech",
    sourceRank: 1,
    engagementScore: 50,
    publishedAt: new Date("2026-06-04T06:00:00.000Z"),
  },
];

const scored = applyRecommendationScores(articles, { now });

assert.equal(scored.length, 3);
assert.ok((scored[0].recommendationScore ?? 0) >= (scored[1].recommendationScore ?? 0));
assert.ok(scored.every((article) => typeof article.recommendationScore === "number"));
assert.match(scored.find((article) => article.url === "https://example.com/repo")?.recommendationReason ?? "", /热度|排位/);
assert.equal(scored.find((article) => article.url === "https://example.com/rss-new")?.heatScore, undefined);

console.log("[recommendation-smoke-test] ok");
