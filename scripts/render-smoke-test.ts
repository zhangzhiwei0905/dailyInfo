import assert from "node:assert/strict";

import type { ArticleInput, DailyReport, TradingSection } from "../lib/ai/pipeline";
import { groupRaw, renderHtml } from "../lib/output/render";
import { sources } from "../lib/sources/registry";

const sampleArticle: ArticleInput = {
  sourceId: "qbitai",
  source: "量子位",
  title: "A focused local news workflow",
  url: "https://example.com/news",
  excerpt: "A compact article used to exercise the HTML renderer.",
  summary: "A concise summary should occupy the right-hand reading column.",
  meta: "Python · ★ 6,463 · 🍴 455 · 📈 1,265 stars today",
  category: "tech",
  publishedAt: new Date("2026-06-03T08:00:00+08:00"),
};

const trading: TradingSection = {
  generated_at: "2026-06-03T00:00:00.000Z",
  market_overview: "Market data exists in the report JSON.",
  risk_caveat: "For testing only.",
  watchlist: [
    {
      symbol: "AAPL",
      display_name: "Apple",
      stance: "Neutral",
      rationale: "Renderer smoke-test fixture.",
    },
  ],
  tickers: [
    {
      symbol: "AAPL",
      displayName: "Apple",
      group: "us-equity",
      currency: "USD",
      exchangeName: "NASDAQ",
      currentPrice: 199,
      pct1Day: 0.4,
      pct5Day: 1.2,
      pct52WeekHigh: -4.2,
      pct52WeekLow: 21.5,
      sma20: 197,
      sma50: 192,
      sma200: 180,
      rsi14: 58,
      macd: 1.2,
      macdSignal: 1,
      macdHistogram: 0.2,
      trend: "bullish",
      rsiState: "normal",
      signals: [],
    },
  ],
};

const report: DailyReport = {
  hero_headline: "One calm brief for the day",
  daily_overview: "A short overview used by the renderer smoke test.",
  topic_overviews: [
    { category: "tech", summary: "Tech sources point to a calmer workflow layer for builders." },
    { category: "finance", summary: "Finance has no dominant thread in this fixture." },
    { category: "politics", summary: "World news remains separated from product and market signals." },
  ],
  tech_briefs: [],
  finance_briefs: [],
  politics_briefs: [],
  editor_note: "",
  keywords: [],
  trading,
};

const raw = groupRaw([sampleArticle], sources);
const html = renderHtml(report, raw, "2026-06-03");

assert.equal(html.includes('data-tab="trading"'), false);
assert.equal(html.includes('data-panel="trading"'), false);
assert.equal(html.includes("市场行情"), false);
assert.equal(html.includes("AAPL"), false);
assert.match(html, /class="tab active" data-tab="tech"/);
assert.match(html, /class="panel active" data-panel="tech"/);
assert.match(html, /<h1 class="report-title">今日简报<\/h1>/);
assert.equal(html.includes('<h1 class="report-title">2026-06-03</h1>'), false);
assert.equal(html.includes('<span class="eyebrow">每日简报</span>'), false);
assert.match(html, /<div class="date-details"[\s\S]*?<span class="date-chip-value">星期三<\/span>/);
assert.match(html, /<div class="date-details"[\s\S]*?<span class="date-chip-value">四月18日<\/span>/);
assert.match(html, /<div class="date-details"[\s\S]*?<span class="date-chip-value">今日无节气<\/span>/);
assert.match(html, /下一节气 · 6月6日 芒种/);
assert.match(html, /<span class="hero-eyebrow">主题速览<\/span>/);
assert.match(html, /<article class="topic-card topic-tech">[\s\S]*?Tech sources point to a calmer workflow layer for builders\./);
assert.match(html, /<article class="topic-card topic-finance">[\s\S]*?Finance has no dominant thread in this fixture\./);
assert.equal(html.includes('<p class="hero-headline">One calm brief for the day</p>'), false);
assert.match(
  html,
  /<h3 class="article-title">[\s\S]*?<\/h3>\s*<div class="article-facts">[\s\S]*?Python · ★ 6,463 · 🍴 455 · 📈 1,265 stars today[\s\S]*?06\/03 08:00[\s\S]*?<\/div>/,
);
assert.equal(html.includes("中文介绍"), false);
assert.match(html, /<div class="article-summary-card">[\s\S]*?<span class="summary-label">AI 总结<\/span>[\s\S]*?A concise summary should occupy the right-hand reading column\./);
assert.match(html, /<div class="article-excerpt-card">[\s\S]*?<span class="excerpt-label">原文摘录<\/span>[\s\S]*?A compact article used to exercise the HTML renderer\./);

console.log("[render-smoke-test] ok");
