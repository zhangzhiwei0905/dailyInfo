import fs from "node:fs";
import path from "node:path";

import {
  enrichArticleSummaries,
  enrichFinanceNewsSummaries,
  enrichGithubTrendingSummaries,
  enrichTrendingPapersSummaries,
  enrichXViralSummaries,
} from "../ai/enrich";
import { applyRecommendationScores } from "../articles/recommendation";
import { getModelTag, validateBackendCredentials } from "../ai/llm";
import {
  generateDailyReport,
  type ArticleInput,
  type DailyReport,
  type TradingSection,
} from "../ai/pipeline";
import { generateTradingCommentary } from "../ai/trading-commentary";
import {
  groupRaw,
  isSportsArticle,
  MERGED_SUBGROUP_LIMITS,
  renderHtml,
  renderMarkdown,
} from "../output/render";
import { fetchSource } from "../sources/dispatch";
import type { SourceDef } from "../sources/types";
import { fetchCryptoGlobal } from "../trading/coingecko";
import { fetchCryptoFearGreed } from "../trading/fear-greed";
import { analyzeWatchlist } from "../trading/runner";

export type GenerateDailyOptions = {
  date: string;
  sources: SourceDef[];
  outputDir?: string;
  writeFiles?: boolean;
  outputMarkdown?: boolean;
  includeTrading?: boolean;
  log?: (line: string) => void;
};

export type GenerateDailyResult = {
  date: string;
  articles: ArticleInput[];
  report: DailyReport;
  html: string;
  markdown?: string;
};

function reportLocale(): "zh" | "en" {
  return process.env.REPORT_LOCALE === "en" ? "en" : "zh";
}

async function fetchAll(
  sourceDefs: SourceDef[],
  log: (line: string) => void,
): Promise<ArticleInput[]> {
  const articles: ArticleInput[] = [];
  const enabled = sourceDefs.filter((s) => s.enabled !== false);
  for (const source of enabled) {
    try {
      const items = await fetchSource(source);
      log(`  ${source.id.padEnd(20)} ${items.length}`);
      articles.push(...items.map((it) => ({ ...it, source: source.name })));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`  ${source.id.padEnd(20)} FAILED - ${message}`);
    }
  }
  return applyRecommendationScores(articles) as ArticleInput[];
}

async function enrichGithub(
  articles: ArticleInput[],
  log: (line: string) => void,
): Promise<void> {
  const gh = articles.filter((a) => a.sourceId === "github-trending");
  if (gh.length === 0) return;
  log(`[daily] enriching ${gh.length} GitHub Trending repos with ${reportLocale()} summaries`);
  const summaries = await enrichGithubTrendingSummaries(gh);
  for (const article of gh) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }
}

async function enrichTrendingPapers(
  articles: ArticleInput[],
  log: (line: string) => void,
): Promise<void> {
  const papers = articles.filter((a) => a.sourceId === "huggingface-papers").slice(0, 20);
  if (papers.length === 0) return;
  log(`[daily] enriching ${papers.length} trending papers with ${reportLocale()} summaries`);
  const summaries = await enrichTrendingPapersSummaries(
    papers.map((a) => ({ url: a.url, title: a.title, excerpt: a.excerpt })),
  );
  for (const article of papers) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }
}

async function enrichMergedSubgroup(
  articles: ArticleInput[],
  sourceDefs: SourceDef[],
  category: "tech" | "finance" | "politics",
  subcategory: string,
  log: (line: string) => void,
): Promise<void> {
  const subSources = sourceDefs.filter(
    (s) => s.category === category && s.subcategory === subcategory && s.enabled !== false,
  );
  const enabledIds = new Set(subSources.map((s) => s.id));
  const sameLocaleIds = new Set(
    subSources.filter((s) => (s.lang ?? "en") === reportLocale()).map((s) => s.id),
  );
  const limit = MERGED_SUBGROUP_LIMITS[`${category}:${subcategory}`] ?? 12;
  const top = articles
    .filter((a) => enabledIds.has(a.sourceId))
    .filter((a) => category !== "politics" || !isSportsArticle(a.title))
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .slice(0, limit);
  const toEnrich = top.filter((a) => !sameLocaleIds.has(a.sourceId));
  if (toEnrich.length === 0) return;
  log(`[daily] enriching ${toEnrich.length}/${top.length} ${category}:${subcategory} items`);
  const summaries = await enrichFinanceNewsSummaries(toEnrich);
  for (const article of toEnrich) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }
}

async function enrichXViral(
  articles: ArticleInput[],
  log: (line: string) => void,
): Promise<void> {
  const posts = articles.filter((a) => a.sourceId === "attentionvc-ai").slice(0, 20);
  if (posts.length === 0) return;
  log(`[daily] enriching ${posts.length} X posts with ${reportLocale()} summaries`);
  const summaries = await enrichXViralSummaries(
    posts.map((a) => ({
      url: a.url,
      title: a.title,
      excerpt: a.excerpt,
      author: a.url.match(/x\.com\/([^/]+)\//)?.[1] ?? "",
    })),
  );
  for (const article of posts) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }
}

function fallbackArticleSummary(article: ArticleInput): string {
  const source = article.source ? `${article.source}：` : "";
  const detail = article.excerpt?.trim() || article.title;
  return `${source}${detail}`.replace(/\s+/g, " ").slice(0, 180);
}

async function applyArticleSummaries(
  batch: ArticleInput[],
  log: (line: string) => void,
): Promise<void> {
  const summaries = await enrichArticleSummaries(batch);
  for (const article of batch) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }

  const stillMissing = batch.filter((article) => !article.summary);
  if (stillMissing.length === 0) return;

  log(`[daily] retrying article summaries one by one: ${stillMissing.length}`);
  for (const article of stillMissing) {
    const retry = await enrichArticleSummaries([article]);
    article.summary = retry.get(article.url) || fallbackArticleSummary(article);
  }
}

async function enrichMissingArticleSummaries(
  articles: ArticleInput[],
  log: (line: string) => void,
): Promise<void> {
  const missing = articles.filter((article) => !article.summary);
  if (missing.length === 0) return;
  const summaryBatchSize = 15;
  log(`[daily] enriching ${missing.length} article summaries`);
  for (let i = 0; i < missing.length; i += summaryBatchSize) {
    const batch = missing.slice(i, i + summaryBatchSize);
    await applyArticleSummaries(batch, log);
  }
}

async function runTrading(log: (line: string) => void): Promise<TradingSection | null> {
  log("[daily] analyzing watchlist + crypto context");
  const [tickers, cryptoFearGreed, cryptoGlobal] = await Promise.all([
    analyzeWatchlist(),
    fetchCryptoFearGreed(),
    fetchCryptoGlobal(),
  ]);
  if (tickers.length === 0) return null;
  const commentary = await generateTradingCommentary({
    tickers,
    cryptoFearGreed: cryptoFearGreed ?? undefined,
    cryptoGlobal: cryptoGlobal ?? undefined,
  });
  return {
    ...commentary,
    tickers,
    crypto_fear_greed: cryptoFearGreed ?? undefined,
    crypto_global: cryptoGlobal ?? undefined,
    generated_at: new Date().toISOString(),
  };
}

function writeCompatibilityFiles(
  result: GenerateDailyResult,
  outputDir: string,
  outputMarkdown: boolean,
): void {
  const dateDir = path.join(outputDir, result.date);
  fs.mkdirSync(dateDir, { recursive: true });
  const base = path.join(dateDir, result.date);
  fs.writeFileSync(`${base}.json`, JSON.stringify(result.report, null, 2), "utf8");
  fs.writeFileSync(
    `${base}-articles.json`,
    JSON.stringify({ date: result.date, articles: result.articles }, null, 2),
    "utf8",
  );
  fs.writeFileSync(`${base}.html`, result.html, "utf8");
  if (outputMarkdown && result.markdown) {
    fs.writeFileSync(`${base}.md`, result.markdown, "utf8");
  }
}

export async function generateDailyBrief(
  options: GenerateDailyOptions,
): Promise<GenerateDailyResult> {
  const log = options.log ?? (() => undefined);
  validateBackendCredentials();
  log(`[daily] ${options.date} - fetching sources`);
  const articles = await fetchAll(options.sources, log);
  if (articles.length === 0) throw new Error("no articles fetched - aborting");

  await enrichGithub(articles, log);
  await enrichTrendingPapers(articles, log);
  await enrichMergedSubgroup(articles, options.sources, "finance", "news", log);
  await enrichMergedSubgroup(articles, options.sources, "politics", "world", log);
  await enrichMergedSubgroup(articles, options.sources, "tech", "ai-news", log);
  await enrichXViral(articles, log);
  await enrichMissingArticleSummaries(articles, log);

  let trading: TradingSection | null = null;
  if (options.includeTrading !== false) {
    try {
      trading = await runTrading(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[daily] trading section failed: ${message}`);
    }
  }

  log(`[daily] generating digest with ${getModelTag()}`);
  const { report } = await generateDailyReport(articles);
  if (trading) report.trading = trading;
  const raw = groupRaw(articles, options.sources);
  const html = renderHtml(report, raw, options.date);
  const markdown = options.outputMarkdown ? renderMarkdown(report, options.date) : undefined;
  const result = { date: options.date, articles, report, html, markdown };
  if (options.writeFiles !== false) {
    writeCompatibilityFiles(result, options.outputDir ?? "daily_reports", options.outputMarkdown ?? false);
  }
  return result;
}
