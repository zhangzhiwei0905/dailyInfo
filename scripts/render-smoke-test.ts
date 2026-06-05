import assert from "node:assert/strict";

import type { ArticleInput, DailyReport, TradingSection } from "../lib/ai/pipeline";
import { groupRaw, renderHtml } from "../lib/output/render";
import { injectReportSiteNav, prepareReportFrameHtml } from "../lib/output/site-nav";
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

const communityArticle: ArticleInput = {
  sourceId: "oschina-news",
  source: "开源中国资讯",
  title: "A source-diverse engineering story",
  url: "https://example.com/oschina",
  excerpt: "A second article from another tech source.",
  summary: "A second summary should appear in the default mixed tech view.",
  category: "tech",
  publishedAt: new Date("2026-06-03T09:00:00+08:00"),
};

const githubTrendingArticle: ArticleInput = {
  sourceId: "github-trending",
  source: "GitHub Trending",
  title: "owner/project",
  url: "https://github.com/owner/project",
  excerpt: "A fast-moving repository from the daily GitHub Trending list.",
  summary: "A concise summary for a trending open-source project.",
  meta: "TypeScript · ★ 12,345 · forks 678 · 321 stars today",
  category: "tech",
};

const domesticPoliticsArticle: ArticleInput = {
  sourceId: "chinanews-china",
  source: "中新网国内",
  title: "Domestic policy signal",
  url: "https://example.com/china",
  excerpt: "A domestic politics item.",
  summary: "Domestic coverage should sit under the China politics subcategory.",
  category: "politics",
  publishedAt: new Date("2026-06-03T10:00:00+08:00"),
};

const worldPoliticsArticle: ArticleInput = {
  sourceId: "npr-world",
  source: "NPR World",
  title: "World diplomacy signal",
  url: "https://example.com/world",
  excerpt: "A world politics item.",
  summary: "World coverage should sit under the world politics subcategory.",
  category: "politics",
  publishedAt: new Date("2026-06-03T11:00:00+08:00"),
};

const chinaFinanceArticle: ArticleInput = {
  sourceId: "chinanews-finance",
  source: "中新网财经",
  title: "Domestic market signal",
  url: "https://example.com/china-finance",
  excerpt: "A China finance item.",
  summary: "China finance coverage should be selectable under finance.",
  category: "finance",
  publishedAt: new Date("2026-06-03T12:00:00+08:00"),
};

const macroFinanceArticle: ArticleInput = {
  sourceId: "cnbc-economy",
  source: "CNBC Economy",
  title: "Macro economy signal",
  url: "https://example.com/macro",
  excerpt: "A macro economy item.",
  summary: "Macro economy coverage should be selectable under finance.",
  category: "finance",
  publishedAt: new Date("2026-06-03T13:00:00+08:00"),
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

const raw = groupRaw(
  [
    sampleArticle,
    communityArticle,
    githubTrendingArticle,
    domesticPoliticsArticle,
    worldPoliticsArticle,
    chinaFinanceArticle,
    macroFinanceArticle,
  ],
  sources,
);
const html = renderHtml(report, raw, "2026-06-03");

assert.equal(html.includes('data-tab="trading"'), false);
assert.equal(html.includes('data-panel="trading"'), false);
assert.equal(html.includes("市场行情"), false);
assert.equal(html.includes("AAPL"), false);
assert.match(html, /class="tab active" data-tab="tech"/);
assert.match(html, /class="panel active" data-panel="tech"/);
// tech-overview (综合) tab removed; first sub-tab is now the first registered subcategory
assert.match(html, /class="sub-tab active" data-sub="github-trending"/);
assert.match(html, /data-sub="github-trending"[\s\S]*?GitHub Trending/);
assert.match(html, /data-source-content="github-trending"[\s\S]*?owner\/project/);
assert.match(html, /data-panel="politics"[\s\S]*?data-sub="china"[\s\S]*?国内/);
assert.match(html, /data-panel="politics"[\s\S]*?data-sub="world"[\s\S]*?国际/);
assert.match(html, /data-panel="finance"[\s\S]*?data-sub="china-finance"[\s\S]*?国内财经/);
assert.match(html, /data-panel="finance"[\s\S]*?data-sub="macro-economy"[\s\S]*?宏观经济/);
assert.match(html, /<h1 class="report-title">今日简报<\/h1>/);
assert.equal(html.includes('<h1 class="report-title">2026-06-03</h1>'), false);
assert.equal(html.includes('<span class="eyebrow">每日简报</span>'), false);
assert.match(html, /<div class="date-details"[\s\S]*?<span class="date-chip-value">周三<\/span>/);
assert.match(html, /<div class="date-details"[\s\S]*?<span class="date-chip-value">四月18日<\/span>/);
assert.equal(html.includes('今日无节气'), false);
assert.match(html, /下一节气 · 6月6日 芒种/);
assert.match(html, /class="sort-bar"/);
assert.match(html, /class="sort-btn active" data-sort-mode="recommended"/);
assert.match(html, /data-sort-mode="time"/);
assert.match(html, /data-sort-mode="source"/);
assert.match(html, /data-sort-score="[\d.]+"/);
assert.match(html, /<span class="hero-eyebrow">主题速览<\/span>/);
assert.match(html, /<main class="main-nav-spacer">/);
assert.match(html, /<nav class="site-nav" aria-label="站点导航">/);
assert.match(html, /position: fixed/);
assert.match(html, /top: 1rem/);
assert.match(html, /@media \(min-width: 768px\)/);
assert.match(html, /padding: 0\.625rem 1rem/);
assert.match(html, /font-size: 0\.875rem/);
assert.match(html, /font-weight: 600/);
assert.match(html, /<a class="site-brand" href="\/report">/);
assert.match(html, /href="\/report" aria-current="page"[\s\S]*?首页/);
assert.match(html, /href="\/archive"[\s\S]*?历史归档/);
assert.match(html, /href="\/admin"[\s\S]*?管理后台/);
assert.match(html, /<article class="topic-card topic-tech">[\s\S]*?Tech sources point to a calmer workflow layer for builders\./);
assert.match(html, /<article class="topic-card topic-finance">[\s\S]*?Finance has no dominant thread in this fixture\./);
assert.equal(html.includes('<p class="hero-headline">One calm brief for the day</p>'), false);
assert.match(
  html,
  /<div class="article-heading">[\s\S]*?<h3 class="article-title">[\s\S]*?<\/h3>[\s\S]*?class="favorite-star"[\s\S]*?<\/div>\s*<div class="article-facts">[\s\S]*?Python · ★ 6,463 · 🍴 455 · 📈 1,265 stars today[\s\S]*?06\/03 08:00[\s\S]*?<\/div>/,
);
assert.equal(html.includes("中文介绍"), false);
assert.match(html, /<div class="article-summary-card">[\s\S]*?<span class="summary-label">AI 总结<\/span>[\s\S]*?A concise summary should occupy the right-hand reading column\./);
assert.match(html, /<div class="article-excerpt-card">[\s\S]*?<span class="excerpt-label">原文摘录<\/span>[\s\S]*?A compact article used to exercise the HTML renderer\./);
assert.match(html, /class="favorite-star"/);
assert.match(html, /data-favorite-url="https:\/\/example\.com\/news"/);
assert.match(html, /aria-label="收藏文章"/);
assert.match(html, /\/api\/favorites/);
assert.match(html, /loadFavoriteStates|savedUrls/);

const staleNavHtml = `<!doctype html><html><head><style>
  .site-nav { top: 1rem; box-shadow: 0 14px 42px rgba(45, 42, 35, 0.08); }
  .site-nav-link { padding: 0.62rem 0.95rem; font-size: 0.9rem; font-weight: 680; }
  @media (min-width: 720px) { .site-nav { top: 1.5rem; } }
</style></head><body><main class="main-nav-spacer">
  <nav class="site-nav" aria-label="站点导航">
    <a class="site-brand" href="/report">DailyBrief<span>每日简报</span></a>
    <div class="site-nav-links">
      <a class="site-nav-link active" href="/report" aria-current="page">首页</a>
      <a class="site-nav-link" href="/archive">历史归档</a>
      <a class="site-nav-link" href="/admin">管理后台</a>
    </div>
  </nav>
  <article>Stored report body</article>
</main></body></html>`;
const upgradedNavHtml = injectReportSiteNav(staleNavHtml, "2026-06-03");
assert.equal((upgradedNavHtml.match(/class="site-nav"/g) ?? []).length, 1);
assert.match(upgradedNavHtml, /href="\/report" aria-current="page"[\s\S]*?首页/);
assert.match(upgradedNavHtml, /href="\/archive"[\s\S]*?历史归档/);
assert.match(upgradedNavHtml, /href="\/favorites"[\s\S]*?我的收藏/);
assert.match(upgradedNavHtml, /href="\/admin"[\s\S]*?管理后台/);
assert.match(upgradedNavHtml, /@media \(min-width: 768px\)/);
assert.match(upgradedNavHtml, /padding: 0\.625rem 1rem/);
assert.ok(
  upgradedNavHtml.lastIndexOf("padding: 0.625rem 1rem") >
    upgradedNavHtml.indexOf("0.62rem 0.95rem"),
);
assert.ok(
  upgradedNavHtml.lastIndexOf("@media (min-width: 768px)") >
    upgradedNavHtml.indexOf("min-width: 720px"),
);

const framedReportHtml = prepareReportFrameHtml(staleNavHtml, "2026-06-03");
assert.equal(framedReportHtml.includes('class="site-nav"'), false);
assert.equal(framedReportHtml.includes("dailybrief-report-site-nav"), false);
assert.match(framedReportHtml, /Stored report body/);
assert.match(framedReportHtml, /\/api\/favorites/);

console.log("[render-smoke-test] ok");
