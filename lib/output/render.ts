import type {
  ArticleInput,
  BriefItem,
  DailyReport,
  TradingSection,
} from "../ai/pipeline";
import type { WatchlistPick } from "../ai/trading-commentary";
import { sortArticlesForReading } from "../articles/recommendation";
import { REPORT_LOCALE } from "../sources/registry";
import { getReportTz } from "../utils";
import type { Category, SourceDef } from "../sources/types";
import { V2EX_OFF_TOPIC_RE } from "../sources/v2ex";
import type { TickerAnalysis } from "../trading/signals";
import {
  getAssetGroupLabels,
  ASSET_GROUP_ORDER,
  type AssetGroup,
} from "../trading/watchlist";
import { renderReportSiteNav, reportSiteNavStyles } from "./site-nav";

// ----- i18n -----

/**
 * Localized UI strings. `t` resolves to TEXTS_ZH or TEXTS_EN at module
 * init based on REPORT_LOCALE. All hardcoded display text routes through
 * this object so adding a third locale = adding one more table.
 */
const TEXTS_ZH = {
  siteTitle: "每日简报",
  catTech: "技术动态",
  catFinance: "财经要点",
  catPolitics: "时政观察",
  catTrading: "市场行情",
  subAiModel: "AI 大模型",
  subDevCommunity: "开发者社区",
  subTechCompanies: "科技公司动态",
  subChinaEconomy: "中国经济",
  subGlobalFinance: "全球财经",
  subChinaPolitics: "国内时政",
  subWorldAffairs: "国际要闻",
  emptySource: "该源今日无内容。",
  emptyCategory: "该分类今日无内容。",
  emptyGroup: "该组今日无数据。",
  footer: "内容均来自原媒体，本站仅作摘要整理与回链。",
  summaryLabelNews: "AI 总结",
  summaryLabelIntro: "AI 总结",
  tradingMarketOverview: "市场总览",
  tradingTodayFocus: "今日关注",
  tradingAllAssets: "全部资产",
  tradingRiskCaveat: "风险提示",
  widgetCryptoFearGreed: "加密恐慌贪婪",
  widgetCryptoCap: "加密总市值",
  widgetBtcDom: "BTC 主导率",
  widgetVolume24h: "24h 成交量",
  widgetActiveCoins: "活跃币",
  ticker5d: "5 日",
  tickerVs52wHigh: "距 52w 高",
  tickerTrend: "趋势",
  tickerMacd: "MACD / 信号",
  signalToday: "今天",
  signalDaysAgoSuffix: "天前",
  trendBullish: "多头",
  trendBearish: "空头",
  trendNeutral: "中性",
  mdTodayOverview: "今日总览",
  mdEditorNote: "编辑短评",
  mdTodayKeywords: "今日关键词",
  mdImportance: "重要度",
  archiveLink: "← 历史归档",
  reportHeading: "今日简报",
  nextSolarTermLabel: "下一节气",
  sortRecommended: "推荐",
  sortTime: "时间",
  sortSource: "来源",
  topicOverviewLabel: "主题速览",
  topicQuietFinance: "当日无明确财经主线，后续可在财经栏目查看原始来源更新。",
  topicQuietGeneric: "当日未形成高置信主题主线，可在下方栏目继续查看原始条目。",
  generatedManual: "手动生成",
  generatedScheduled: "定时任务",
  generatedAt: "生成于",
};

const TEXTS_EN: typeof TEXTS_ZH = {
  siteTitle: "Daily Brief",
  catTech: "Tech",
  catFinance: "Finance",
  catPolitics: "World",
  catTrading: "Markets",
  subAiModel: "AI Models",
  subDevCommunity: "Dev Community",
  subTechCompanies: "Tech Companies",
  subChinaEconomy: "China Economy",
  subGlobalFinance: "Global Finance",
  subChinaPolitics: "China Politics",
  subWorldAffairs: "World Affairs",
  emptySource: "No content from this source today.",
  emptyCategory: "No content in this category today.",
  emptyGroup: "No data for this group today.",
  footer:
    "Content sourced from original publishers; this site provides summary and backlinks only.",
  summaryLabelNews: "Summary",
  summaryLabelIntro: "Summary",
  tradingMarketOverview: "Market Overview",
  tradingTodayFocus: "Today's Focus",
  tradingAllAssets: "All Assets",
  tradingRiskCaveat: "Risk Disclaimer",
  widgetCryptoFearGreed: "Crypto Fear/Greed",
  widgetCryptoCap: "Crypto Market Cap",
  widgetBtcDom: "BTC Dominance",
  widgetVolume24h: "24h Volume",
  widgetActiveCoins: "Active coins",
  ticker5d: "5d",
  tickerVs52wHigh: "vs 52w High",
  tickerTrend: "Trend",
  tickerMacd: "MACD / Signal",
  signalToday: "today",
  signalDaysAgoSuffix: "d ago",
  trendBullish: "Bullish",
  trendBearish: "Bearish",
  trendNeutral: "Neutral",
  mdTodayOverview: "Today's Overview",
  mdEditorNote: "Editor's Note",
  mdTodayKeywords: "Keywords",
  mdImportance: "Importance",
  archiveLink: "← Archive",
  reportHeading: "Today's Brief",
  nextSolarTermLabel: "Next solar term",
  sortRecommended: "Recommended",
  sortTime: "Time",
  sortSource: "Source",
  topicOverviewLabel: "Topic Overview",
  topicQuietFinance: "No clear finance through-line emerged today; check the finance tab for source updates.",
  topicQuietGeneric: "No high-confidence theme emerged today; review the source items below for details.",
  generatedManual: "Manual",
  generatedScheduled: "Scheduled",
  generatedAt: "Generated at",
};

const STR = REPORT_LOCALE === "en" ? TEXTS_EN : TEXTS_ZH;
const ASSET_GROUP_LABELS_LOCALIZED = getAssetGroupLabels(REPORT_LOCALE);

// ----- types -----

export type SourceGroup = {
  sourceId: string;
  sourceName: string;
  items: ArticleInput[];
  /**
   * When true, items come from multiple merged sources and the renderer
   * should label each article with `a.source` since the source-tab row
   * is suppressed (only one synthetic group).
   */
  merged?: boolean;
};

export type SubGroup = {
  id: string;
  name: string;
  sources: SourceGroup[];
};

export type RawByCategory = Record<Category, SubGroup[]>;

// ----- labels & ordering -----

const CATEGORY_LABELS: Record<Category, string> = {
  tech: STR.catTech,
  finance: STR.catFinance,
  politics: STR.catPolitics,
};

const CATEGORY_DIGEST_LABELS: Record<Category, string> = {
  tech: STR.catTech,
  finance: STR.catFinance,
  politics: STR.catPolitics,
};

/**
 * L2 ordering per category. Categories not listed render flat (no L2 tabs).
 */
const SUBCATEGORY_ORDER: Partial<Record<Category, string[]>> = {
  tech: ["ai-model", "dev-community", "tech-companies"],
  finance: ["china-economy", "global-finance"],
  politics: ["china-politics", "world-affairs"],
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  "ai-model": STR.subAiModel,
  "dev-community": STR.subDevCommunity,
  "tech-companies": STR.subTechCompanies,
  "china-economy": STR.subChinaEconomy,
  "global-finance": STR.subGlobalFinance,
  "china-politics": STR.subChinaPolitics,
  "world-affairs": STR.subWorldAffairs,
};

/**
 * Per-source item caps in the raw display, keyed by "category:subcategory".
 * Each source inside the subcategory shows up to N items. Missing keys = no cap.
 *
 * Default 20 across all L3-tabbed subcategories keeps each tab a single
 * comfortable scroll instead of 25-30 items. Merged subgroups (blog-weekly,
 * finance:news, politics:world) ignore this — they use MERGED_SUBGROUP_LIMITS.
 */
const SOURCE_DISPLAY_LIMITS: Record<string, number> = {
  "tech:dev-community": 20,
};

/**
 * Sources whose fetcher returns items already sorted by an engagement/heat
 * algorithm we want to preserve. groupRaw skips its default date-desc sort
 * for these so the final render reflects the source's own ranking.
 */
const PRESERVE_FETCH_ORDER_SOURCES = new Set([
  "attentionvc-ai",
  "huggingface-papers",
]);

function displayLimitFor(
  category: Category,
  subId: string | undefined,
): number | undefined {
  if (!subId) return undefined;
  return SOURCE_DISPLAY_LIMITS[`${category}:${subId}`];
}

/**
 * Subcategories that should collapse their sources into a single flat
 * time-sorted list (no L3 source tabs), keyed by "category:subcategory".
 * Value = number of items kept after merging. Each rendered article
 * will display its `source` label inline since the per-source tab row
 * is suppressed.
 *
 * Used when:
 *  - sources are heterogeneous but each publishes few items (blog-weekly)
 *  - the user explicitly wants a curated time-sorted feed rather than
 *    per-source browsing (finance:news, only authoritative sources)
 *
 * Exported so daily.ts can read the cap to keep enrichment in sync.
 */
export const MERGED_SUBGROUP_LIMITS: Record<string, number> = {
  "tech:ai-model": 15,
  "tech:dev-community": 15,
  "tech:tech-companies": 15,
  "finance:china-economy": 12,
  "finance:global-finance": 12,
  "politics:china-politics": 12,
  "politics:world-affairs": 15,
};

/**
 * Politics sources (especially Al Jazeera / BBC / The Diplomat) regularly
 * mix in World Cup / Olympic / football coverage. Filter at the title level
 * so the merged "国际要闻" stream stays politics-only.
 *
 * Pattern is intentionally specific — avoid generic words like "team" or
 * "match" that overlap with diplomacy headlines.
 */
const POLITICS_SPORTS_RE =
  /\b(World\s*Cup|Olympics?|UEFA|FIFA|NBA|NFL|NHL|MLB|ATP|WTA|Premier\s*League|Bundesliga|La\s*Liga|Serie\s*A|Champions\s*League|Eurovision|Wimbledon|Grand\s*Slam|F1|Formula\s*1|Ronaldo|Messi|Mbappe|Beckham|Lukaku|Mitoma|sportsman|footballer|squad)\b|世界杯|奥运|残奥|冬奥|欧冠|英超|西甲|意甲|德甲|网球|足球|篮球|高尔夫|棒球|板球|橄榄球/i;

export function isSportsArticle(title: string): boolean {
  return POLITICS_SPORTS_RE.test(title);
}

function mergedLimitFor(
  category: Category,
  subId: string,
): number | undefined {
  return MERGED_SUBGROUP_LIMITS[`${category}:${subId}`];
}

// ----- grouping -----

export function groupRaw(
  articles: ArticleInput[],
  registry: SourceDef[],
): RawByCategory {
  const subcatOf = new Map<string, string | undefined>();
  for (const s of registry) subcatOf.set(s.id, s.subcategory);
  // Drop articles from sources that have since been disabled — important
  // when scripts/render.ts re-renders against a stale sidecar that still
  // contains the disabled sources' fetched data.
  const enabledIds = new Set(
    registry.filter((s) => s.enabled !== false).map((s) => s.id),
  );

  type Bucket = { sourceName: string; items: ArticleInput[] };
  const buckets: Record<Category, Map<string, Bucket>> = {
    tech: new Map(),
    finance: new Map(),
    politics: new Map(),
  };
  // Pre-seed empty buckets for every enabled source so per-source-tabbed
  // subcategories (e.g. cn-community) still render a tab for sources that
  // returned 0 items today. Without this, a transient LinuxDo Cloudflare
  // block would silently collapse the L3 tab nav, making users wonder
  // whether the other forum even exists.
  for (const s of registry) {
    if (s.enabled === false) continue;
    if (!buckets[s.category].has(s.id)) {
      buckets[s.category].set(s.id, { sourceName: s.name, items: [] });
    }
  }

  for (const a of articles) {
    if (!enabledIds.has(a.sourceId)) continue;
    if (a.category === "politics" && isSportsArticle(a.title)) continue;
    if (
      (a.sourceId === "v2ex-hot" || a.sourceId === "linuxdo") &&
      V2EX_OFF_TOPIC_RE.test(a.title)
    )
      continue;
    const map = buckets[a.category];
    let b = map.get(a.sourceId);
    if (!b) {
      b = { sourceName: a.source, items: [] };
      map.set(a.sourceId, b);
    }
    b.items.push(a);
  }

  for (const cat of Object.keys(buckets) as Category[]) {
    for (const [id, b] of buckets[cat].entries()) {
      if (PRESERVE_FETCH_ORDER_SOURCES.has(id)) continue;
      b.items = sortArticlesForReading(b.items);
    }
  }

  function toSourceGroup(
    sourceId: string,
    b: Bucket,
    limit: number | undefined,
  ): SourceGroup {
    return {
      sourceId,
      sourceName: b.sourceName,
      items: limit ? b.items.slice(0, limit) : b.items,
    };
  }

  function sortByRegistry(list: SourceGroup[]): SourceGroup[] {
    return [...list].sort((a, b) => {
      const ia = registry.findIndex((s) => s.id === a.sourceId);
      const ib = registry.findIndex((s) => s.id === b.sourceId);
      return ia - ib;
    });
  }

  const out: RawByCategory = { tech: [], finance: [], politics: [] };

  for (const cat of Object.keys(buckets) as Category[]) {
    const order = SUBCATEGORY_ORDER[cat];
    if (!order) {
      // Flat: one synthetic subgroup with every source.
      const sources: SourceGroup[] = [];
      for (const [id, b] of buckets[cat].entries()) {
        sources.push(toSourceGroup(id, b, undefined));
      }
      out[cat] = sources.length
        ? [{ id: "all", name: CATEGORY_LABELS[cat], sources: sortByRegistry(sources) }]
        : [];
      continue;
    }
    // Subcategory split: bucket each source under its registered subcategory.
    const subs: SubGroup[] = [];
    for (const subId of order) {
      const mergeLimit = mergedLimitFor(cat, subId);
      if (mergeLimit !== undefined) {
        // Merge: flatten all sources under this subcategory into a single
        // time-sorted SourceGroup. Articles keep their `source` field so
        // the renderer can label them.
        const flat: ArticleInput[] = [];
        for (const [id, b] of buckets[cat].entries()) {
          if (subcatOf.get(id) === subId) flat.push(...b.items);
        }
        if (flat.length === 0) continue;
        const sortedFlat = sortArticlesForReading(flat);
        subs.push({
          id: subId,
          name: SUBCATEGORY_LABELS[subId] ?? subId,
          sources: [
            {
              sourceId: "_merged",
              sourceName: SUBCATEGORY_LABELS[subId] ?? subId,
              items: sortedFlat.slice(0, mergeLimit),
              merged: true,
            },
          ],
        });
        continue;
      }

      const limit = displayLimitFor(cat, subId);
      const sources: SourceGroup[] = [];
      for (const [id, b] of buckets[cat].entries()) {
        if (subcatOf.get(id) === subId) sources.push(toSourceGroup(id, b, limit));
      }
      if (sources.length === 0) continue;
      subs.push({
        id: subId,
        name: SUBCATEGORY_LABELS[subId] ?? subId,
        sources: sortByRegistry(sources),
      });
    }
    out[cat] = subs;
  }

  return out;
}

// ----- HTML helpers -----

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonAttr(value: unknown): string {
  return escapeHtml(JSON.stringify(value));
}

function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function formatDate(d: Date | undefined): string {
  if (!d) return "";
  try {
    // zh: "05/20 16:00"  · en: "May 20, 4:00 PM" → keep 24h en-GB style "20/05 16:00"
    const localeTag = REPORT_LOCALE === "en" ? "en-GB" : "zh-CN";
    return d.toLocaleString(localeTag, {
      timeZone: getReportTz(),
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

type DateDisplay = {
  fullDate: string;
  weekday: string;
  lunar: string;
  solarTermToday: string;
  nextSolarTerm: string;
  nextSolarTermDate: string;
};

type TopicOverviewView = {
  category: Category;
  label: string;
  summary: string;
  count: number;
};

const SOLAR_TERM_COEFFICIENTS = [
  6.11, 20.84, 4.6295, 19.4599, 6.3826, 21.4155, 5.59, 20.888,
  6.318, 21.86, 6.5, 22.2, 7.928, 23.65, 8.35, 23.95,
  8.44, 23.822, 9.098, 24.218, 8.218, 23.08, 7.9, 22.6,
] as const;

const SOLAR_TERMS_ZH = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
] as const;

const SOLAR_TERMS_EN = [
  "Minor Cold", "Major Cold", "Start of Spring", "Rain Water",
  "Awakening of Insects", "Spring Equinox", "Clear and Bright", "Grain Rain",
  "Start of Summer", "Grain Buds", "Grain in Ear", "Summer Solstice",
  "Minor Heat", "Major Heat", "Start of Autumn", "End of Heat",
  "White Dew", "Autumn Equinox", "Cold Dew", "Frost Descent",
  "Start of Winter", "Minor Snow", "Major Snow", "Winter Solstice",
] as const;

function localNoon(date: string): Date {
  return new Date(`${date}T12:00:00`);
}

function dateKeyInReportTz(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: getReportTz(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function formatFullDate(d: Date): string {
  const localeTag = REPORT_LOCALE === "en" ? "en-US" : "zh-CN";
  return d.toLocaleDateString(localeTag, {
    timeZone: getReportTz(),
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatWeekday(d: Date): string {
  const localeTag = REPORT_LOCALE === "en" ? "en-US" : "zh-CN";
  if (REPORT_LOCALE === "zh") {
    return d.toLocaleDateString("zh-CN", {
      timeZone: getReportTz(),
      weekday: "short",
    }); // e.g. "周五"
  }
  return d.toLocaleDateString("en-US", {
    timeZone: getReportTz(),
    weekday: "long",
  }); // e.g. "Friday"
}

function formatShortMonthDay(d: Date): string {
  const localeTag = REPORT_LOCALE === "en" ? "en-US" : "zh-CN";
  return d.toLocaleDateString(localeTag, {
    timeZone: getReportTz(),
    month: "short",
    day: "numeric",
  });
}

function formatLunarDate(d: Date): string {
  try {
    if (REPORT_LOCALE === "zh") {
      // zh-CN-u-ca-chinese produces e.g. "四月二十" which is ideal
      const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
        timeZone: getReportTz(),
        month: "long",
        day: "numeric",
      }).formatToParts(d);
      return parts.map((p) => p.value).join("");
    }
    return new Intl.DateTimeFormat("en-u-ca-chinese", {
      timeZone: getReportTz(),
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

function solarTermDate(year: number, termIndex: number): Date {
  const y = year % 100;
  const day = Math.floor(y * 0.2422 + SOLAR_TERM_COEFFICIENTS[termIndex]) - Math.floor((y - 1) / 4);
  const month = Math.floor(termIndex / 2);
  return new Date(year, month, day, 12);
}

function getSolarTermInfo(date: string): Pick<DateDisplay, "solarTermToday" | "nextSolarTerm" | "nextSolarTermDate"> {
  const base = localNoon(date);
  const year = base.getFullYear();
  const terms = [year, year + 1].flatMap((y) =>
    SOLAR_TERMS_ZH.map((zh, i) => ({
      zh,
      en: SOLAR_TERMS_EN[i],
      date: solarTermDate(y, i),
    })),
  );
  const currentKey = dateKeyInReportTz(base);
  const today = terms.find((term) => dateKeyInReportTz(term.date) === currentKey);
  const next = terms.find((term) => term.date.getTime() > base.getTime());
  const labelFor = (term: { zh: string; en: string }) =>
    REPORT_LOCALE === "en" ? term.en : term.zh;
  return {
    solarTermToday: today ? labelFor(today) : "",
    nextSolarTerm: next ? labelFor(next) : "",
    nextSolarTermDate: next ? formatShortMonthDay(next.date) : "",
  };
}

function getDateDisplay(date: string): DateDisplay {
  const d = localNoon(date);
  return {
    fullDate: formatFullDate(d),
    weekday: formatWeekday(d),
    lunar: formatLunarDate(d),
    ...getSolarTermInfo(date),
  };
}

function summarizeBriefs(briefs: BriefItem[], fallback: string): string {
  const ranked = [...briefs]
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, 2);
  if (ranked.length === 0) return fallback;
  return ranked.map((b) => b.summary).join(" ");
}

function getTopicOverviews(report: DailyReport, counts: Record<Category, number>): TopicOverviewView[] {
  const generated = new Map<Category, string>();
  for (const item of report.topic_overviews ?? []) {
    if (item.category === "tech" || item.category === "finance" || item.category === "politics") {
      if (item.summary) generated.set(item.category, item.summary);
    }
  }
  const fallbackByCategory: Record<Category, string> = {
    tech: summarizeBriefs(report.tech_briefs, STR.topicQuietGeneric),
    finance: summarizeBriefs(report.finance_briefs, STR.topicQuietFinance),
    politics: summarizeBriefs(report.politics_briefs, STR.topicQuietGeneric),
  };
  return (["tech", "politics", "finance"] as Category[]).map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    summary: generated.get(category) ?? fallbackByCategory[category],
    count: counts[category],
  }));
}

function renderTopicOverviewCards(topics: TopicOverviewView[]): string {
  return topics
    .map(
      (topic) => `<article class="topic-card topic-${topic.category}">
        <div class="topic-head">
          <span class="topic-label">${escapeHtml(topic.label)}</span>
          <span class="topic-count">${topic.count}</span>
        </div>
        <p>${escapeHtml(topic.summary)}</p>
      </article>`,
    )
    .join("");
}

// ----- raw article renderers -----

function renderArticleHtml(a: ArticleInput, showSource = false): string {
  const title = escapeHtml(a.title);
  const url = escapeHtml(a.url);
  const excerpt = a.excerpt ? escapeHtml(a.excerpt) : "";
  // Backwards-compat: old sidecar JSON files may carry `cnSummary` instead.
  const summaryText = a.summary ?? (a as unknown as { cnSummary?: string }).cnSummary;
  const summary = summaryText ? escapeHtml(summaryText) : "";
  const meta = a.meta ? escapeHtml(a.meta) : "";
  const time = formatDate(a.publishedAt);
  const sourceLabel = showSource && a.source ? escapeHtml(a.source) : "";
  const metaLine = [sourceLabel, time].filter(Boolean).join(" · ");
  const facts = [meta, metaLine].filter(Boolean);
  const favoritePayload = {
    url: a.url,
    title: a.title,
    sourceId: a.sourceId,
    sourceName: a.source,
    category: a.category,
    excerpt: a.excerpt ?? null,
    summary: summaryText ?? null,
    meta: a.meta ?? null,
    publishedAt: a.publishedAt?.toISOString() ?? null,
  };
  return `<article class="article" data-sort-score="${a.recommendationScore ?? 0}" data-sort-time="${a.publishedAt?.getTime() ?? 0}" data-sort-source="${escapeHtml(a.sourceId)}">
  <div class="article-main">
    <div class="article-heading">
      <h3 class="article-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
      <button class="favorite-star" type="button" aria-label="收藏文章" title="收藏文章" data-favorite-url="${url}" data-favorite-article="${jsonAttr(favoritePayload)}">☆</button>
    </div>
    ${facts.length > 0 ? `<div class="article-facts">${facts.map((fact) => `<p>${fact}</p>`).join("")}</div>` : ""}
  </div>
  <div class="article-body">
    ${excerpt ? `<div class="article-excerpt-card"><span class="excerpt-label">原文摘录</span><p class="article-excerpt">${excerpt}</p></div>` : ""}
    ${summary ? `<div class="article-summary-card"><span class="summary-label">${STR.summaryLabelNews}</span><p class="article-summary">${summary}</p></div>` : ""}
  </div>
</article>`;
}

function renderSourceContent(
  category: Category,
  subId: string,
  source: SourceGroup,
  isActive: boolean,
): string {
  const showSource = source.merged === true;
  return `<div class="source-content${isActive ? " active" : ""}" data-source-content="${escapeHtml(source.sourceId)}" data-sub="${escapeHtml(subId)}" data-cat="${category}">
    ${source.items.length === 0 ? `<p class="empty">${STR.emptySource}</p>` : source.items.map((a) => renderArticleHtml(a, showSource)).join("\n")}
  </div>`;
}

function renderSourceTabs(
  category: Category,
  subId: string,
  sources: SourceGroup[],
): string {
  // Single-source L2s (X 推文 / GitHub Trending) skip the L3 row — the L2 tab
  // label already identifies the dataset. L3 only earns its row when there
  // are ≥2 sources to switch between (e.g. 社区讨论 V2EX vs LinuxDo).
  if (sources.length < 2) return "";
  return `<nav class="source-tabs">${sources
    .map(
      (s, i) =>
        `<button class="source-tab${i === 0 ? " active" : ""}" data-source="${escapeHtml(s.sourceId)}" data-sub="${escapeHtml(subId)}" data-cat="${category}">${escapeHtml(s.sourceName)}<span class="count">${s.items.length}</span></button>`,
    )
    .join("")}</nav>`;
}

function renderSubContent(category: Category, sub: SubGroup, isActive: boolean): string {
  return `<div class="sub-content${isActive ? " active" : ""}" data-sub-content="${escapeHtml(sub.id)}" data-cat="${category}">
    ${renderSourceTabs(category, sub.id, sub.sources)}
    <div class="sort-bar" data-sort-bar="${escapeHtml(sub.id)}">
      <button class="sort-btn active" data-sort-mode="recommended">${STR.sortRecommended}</button>
      <span class="sort-sep"></span>
      <button class="sort-btn" data-sort-mode="time">${STR.sortTime}</button>
      <span class="sort-sep"></span>
      <button class="sort-btn" data-sort-mode="source">${STR.sortSource}</button>
    </div>
    <div class="source-contents">
      ${sub.sources.map((s, i) => renderSourceContent(category, sub.id, s, i === 0)).join("\n")}
    </div>
  </div>`;
}

function renderRawCategoryPanel(
  category: Category,
  subs: SubGroup[],
): string {
  if (subs.length === 0) {
    return `<p class="empty">${STR.emptyCategory}</p>`;
  }
  if (subs.length === 1) {
    return renderSubContent(category, subs[0], true);
  }
  const subTabs = subs
    .map((s, i) => {
      const count = s.sources.reduce((n, src) => n + src.items.length, 0);
      return `<button class="sub-tab${i === 0 ? " active" : ""}" data-sub="${escapeHtml(s.id)}" data-cat="${category}">${escapeHtml(s.name)}<span class="count">${count}</span></button>`;
    })
    .join("");
  const panels = subs
    .map((s, i) => renderSubContent(category, s, i === 0))
    .join("\n");
  return `<nav class="sub-tabs">${subTabs}</nav>\n<div class="sub-contents">${panels}</div>`;
}

// ----- top-level renderer -----

export function renderHtml(
  report: DailyReport,
  raw: RawByCategory,
  date: string,
  meta?: { durationMs?: number; trigger?: string; generatedAt?: string },
): string {
  const trading = report.trading;
  const generatedAtDate = meta?.generatedAt ? new Date(meta.generatedAt) : null;
  // UI-only suppression: keep trading data in the JSON cache, but do not
  // surface the market panel while the product direction is news-first.
  const showTradingPanel = false;

  // Split tech raw subgroups: "tech" L1 panel (github-trending + ai-news)
  // vs. "community" L1 panel (cn-community). Keeps the registry simple
  const sumItems = (subs: SubGroup[]) =>
    subs.reduce(
      (n, sg) => n + sg.sources.reduce((m, s) => m + s.items.length, 0),
      0,
    );
  const counts = {
    tech: sumItems(raw.tech),
    finance: sumItems(raw.finance),
    politics: sumItems(raw.politics),
  };
  const dateDisplay = getDateDisplay(date);
  const topicOverviews = getTopicOverviews(report, counts);
  const pageDescription =
    topicOverviews.map((t) => t.summary).join(" ") ||
    report.daily_overview ||
    report.hero_headline ||
    STR.footer;

  return `<!doctype html>
<html lang="${REPORT_LOCALE === "en" ? "en" : "zh-CN"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeHtml(pageDescription)}">
<meta name="theme-color" content="#f6f4ef">
<title>${STR.siteTitle} · ${date}</title>
<style>
  :root {
    --bg: #f6f4ef;
    --bg-elevated: rgba(255, 255, 252, 0.82);
    --fg: #111111;
    --fg-soft: #3d3d38;
    --muted: #77746b;
    --rule: rgba(20, 20, 18, 0.11);
    --card: rgba(255, 255, 252, 0.62);
    --link: #0f5f8c;
    --accent: #111111;
    --accent-fg: #fbfaf6;
    --cool: #dbe9ea;
    --cool-strong: #0f5f8c;
    --rank-high-bg: #111111;
    --rank-high-fg: #fbfaf6;
    --rank-mid-bg: #dbe9ea;
    --rank-mid-fg: #164c59;
    --rank-low-bg: rgba(17, 17, 17, 0.08);
    --rank-low-fg: #4a4944;
    --shadow: 0 24px 70px rgba(45, 42, 35, 0.12);
    --radius: 1.35rem;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #11110f;
      --bg-elevated: rgba(28, 28, 25, 0.82);
      --fg: #f7f4ec;
      --fg-soft: #d8d2c3;
      --muted: #a8a090;
      --rule: rgba(247, 244, 236, 0.13);
      --card: rgba(247, 244, 236, 0.07);
      --link: #9ccfd9;
      --accent: #f7f4ec;
      --accent-fg: #11110f;
      --cool: rgba(156, 207, 217, 0.14);
      --cool-strong: #9ccfd9;
      --rank-high-bg: #f7f4ec;
      --rank-high-fg: #11110f;
      --rank-mid-bg: rgba(156, 207, 217, 0.17);
      --rank-mid-fg: #b8e3ea;
      --rank-low-bg: rgba(247, 244, 236, 0.1);
      --rank-low-fg: #c7c0b1;
      --shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
    }
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 78% 0%, rgba(219, 233, 234, 0.72), transparent 34rem),
      radial-gradient(circle at 8% 16%, rgba(255, 255, 252, 0.82), transparent 28rem),
      linear-gradient(180deg, var(--bg), var(--bg));
    color: var(--fg);
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display",
      "SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB",
      "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.18;
    background-image:
      linear-gradient(rgba(17, 17, 17, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(17, 17, 17, 0.025) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(180deg, #000, transparent 72%);
  }
  main {
    width: min(100% - 2rem, 1180px);
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 5rem) 0 4.5rem;
  }
  a { color: inherit; }
  button { -webkit-tap-highlight-color: transparent; }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--cool-strong);
    outline-offset: 4px;
  }

  /* ===== header ===== */
  .skip-link {
    position: absolute;
    left: 1rem;
    top: 1rem;
    z-index: 3;
    transform: translateY(-160%);
    background: var(--accent);
    color: var(--accent-fg);
    padding: 0.65rem 0.9rem;
    border-radius: 999px;
    text-decoration: none;
    transition: transform 0.2s ease;
  }
  .skip-link:focus { transform: translateY(0); }
  header.report-header {
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.85rem;
    padding: clamp(0.9rem, 2.4vw, 1.4rem) 0 clamp(1.15rem, 3vw, 2rem);
    border-bottom: 1px solid var(--rule);
    margin-bottom: 1.4rem;
  }
  .header-top {
    display: grid;
    grid-template-columns: minmax(12rem, max-content) minmax(0, 1fr);
    gap: clamp(0.8rem, 3vw, 1.8rem);
    align-items: end;
  }
  .eyebrow {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--muted);
    font-weight: 650;
  }
  h1.report-title {
    font-size: clamp(2.25rem, 5.4vw, 4.2rem);
    font-weight: 740;
    margin: 0;
    letter-spacing: 0;
    line-height: 1;
    text-wrap: balance;
  }
  .date-stack {
    min-width: 0;
  }
  .date-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: flex-end;
    margin: 0 0 0.12rem;
  }
  .date-chip {
    min-width: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 0.45rem;
    max-width: 100%;
    padding: 0.36rem 0.62rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: color-mix(in srgb, var(--card) 76%, transparent);
  }
  .date-chip-label {
    display: inline;
    margin: 0;
    color: var(--muted);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .date-chip-value {
    display: inline;
    color: var(--fg);
    font-size: 0.84rem;
    font-weight: 650;
    line-height: 1.2;
    white-space: nowrap;
  }
  .date-chip-sub {
    display: inline;
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.2;
    white-space: nowrap;
  }
  .archive-link {
    display: inline-block;
    margin-bottom: 1.3rem;
    font-size: 0.85rem;
    color: var(--muted);
    text-decoration: none;
    border-bottom: 1px solid var(--rule);
    padding-bottom: 1px;
  }
  .archive-link:hover { color: var(--fg); border-bottom-color: var(--fg); }
  .hero-card {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: clamp(0.8rem, 2.5vw, 1.4rem);
    align-items: start;
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 1.05rem;
    box-shadow: 0 18px 52px rgba(45, 42, 35, 0.09);
    padding: clamp(0.85rem, 2.2vw, 1.25rem);
    backdrop-filter: blur(18px);
    position: relative;
    overflow: hidden;
  }
  .hero-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(135deg, transparent 0 68%, color-mix(in srgb, var(--cool) 72%, transparent) 68% 100%);
    opacity: 0.58;
  }
  .hero-card > * { position: relative; }
  .hero-eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 650;
  }
  .topic-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.55rem;
    margin: 0;
  }
  .topic-card {
    position: relative;
    padding: 0.78rem 0.85rem 0.82rem 0.95rem;
    border: 1px solid var(--rule);
    border-radius: 0.82rem;
    background: color-mix(in srgb, var(--bg-elevated) 72%, transparent);
    overflow: hidden;
  }
  .topic-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: var(--accent);
    opacity: 0.8;
  }
  .topic-card.topic-tech::before { background: var(--cool-strong); }
  .topic-card.topic-politics::before { background: #8d7b50; }
  .topic-card.topic-finance::before { background: #46745b; }
  .topic-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.55rem;
    margin-bottom: 0.28rem;
  }
  .topic-label {
    color: var(--fg);
    font-size: 0.88rem;
    font-weight: 760;
  }
  .topic-count {
    display: inline-grid;
    min-width: 1.8rem;
    height: 1.35rem;
    place-items: center;
    border-radius: 999px;
    background: var(--fg);
    color: var(--bg);
    font-size: 0.72rem;
    font-weight: 720;
    font-variant-numeric: tabular-nums;
  }
  .topic-card p {
    margin: 0;
    color: var(--fg-soft);
    font-size: 0.82rem;
    line-height: 1.54;
    text-wrap: pretty;
  }

  /* ===== primary tabs ===== */
  .tabs {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 0.45rem;
    margin: 0 0 1.45rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--rule);
    flex-wrap: nowrap;
    overflow-x: auto;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(18px);
  }
  .tab {
    background: transparent;
    border: 1px solid transparent;
    padding: 0.72rem 1rem;
    border-radius: 999px;
    font-size: 0.95rem;
    font-weight: 650;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: color 0.22s ease, background 0.22s ease, transform 0.22s ease;
  }
  .tab:hover { color: var(--fg); background: var(--card); transform: translateY(-1px); }
  .tab:active { transform: translateY(0) scale(0.98); }
  .tab.active {
    color: var(--accent-fg);
    background: var(--accent);
    border-color: var(--accent);
  }
  .tab .count {
    font-size: 0.72rem;
    color: currentColor;
    margin-left: 0.4rem;
    opacity: 0.66;
    font-weight: 560;
    font-variant-numeric: tabular-nums;
  }
  .panel { display: none; }
  .panel.active {
    display: block;
    animation: panelIn 0.35s ease both;
  }
  @keyframes panelIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ===== digest (AI 简报) — compact ===== */
  .digest-category { margin-bottom: 1.1rem; }
  .category-header {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    margin: 0 0 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--rule);
  }
  .category-title {
    font-size: clamp(1.35rem, 3vw, 2.3rem);
    font-weight: 730;
    color: var(--fg);
    margin: 0;
    letter-spacing: 0;
    line-height: 1;
  }
  .category-count {
    font-size: 0.7rem;
    color: var(--muted);
    background: var(--card);
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
  }
  .brief-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  @media (min-width: 720px) {
    .brief-list { grid-template-columns: 1fr 1fr; }
  }
  .brief {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 1rem;
    padding: 0.95rem 1.05rem;
    transition: border-color 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease;
  }
  .brief:hover {
    border-color: var(--muted);
    transform: translateY(-2px);
    box-shadow: 0 14px 38px rgba(45, 42, 35, 0.09);
  }
  .brief-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.3rem;
  }
  .brief-source {
    font-size: 0.72rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .brief-rank {
    font-size: 0.7rem;
    padding: 0.12rem 0.5rem;
    border-radius: 0.45rem;
    font-weight: 600;
    flex-shrink: 0;
  }
  .brief-rank.high { background: var(--rank-high-bg); color: var(--rank-high-fg); }
  .brief-rank.mid  { background: var(--rank-mid-bg);  color: var(--rank-mid-fg); }
  .brief-rank.low  { background: var(--rank-low-bg);  color: var(--rank-low-fg); }
  .brief-title {
    font-size: 0.98rem;
    font-weight: 600;
    margin: 0 0 0.3rem;
    line-height: 1.35;
  }
  .brief-title a { color: var(--fg); text-decoration: none; }
  .brief-title a:hover { color: var(--link); text-decoration: underline; }
  .brief-summary {
    margin: 0;
    color: var(--fg-soft);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  .editor-card {
    background: var(--card);
    border-left: 3px solid var(--muted);
    border-radius: 0.5rem;
    padding: 1rem 1.3rem;
    margin: 1.5rem 0 1.2rem;
  }
  .editor-card .eyebrow { display: block; margin-bottom: 0.4rem; }
  .editor-text {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--fg);
  }
  .keywords { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1.5rem; }
  .keyword {
    background: var(--card);
    color: var(--fg-soft);
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.8rem;
  }

  /* ===== L2 sub-tabs ===== */
  .sub-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin: 1rem 0 1.4rem;
  }
  .sub-tab {
    background: transparent;
    border: 1px solid var(--rule);
    padding: 0.62rem 1rem;
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 650;
    color: var(--fg-soft);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
  }
  .sub-tab:hover { border-color: var(--muted); color: var(--fg); transform: translateY(-1px); }
  .sub-tab:active { transform: translateY(0) scale(0.98); }
  .sub-tab.active {
    background: var(--accent);
    color: var(--accent-fg);
    border-color: var(--accent);
  }
  .sub-tab .count {
    font-size: 0.7rem;
    opacity: 0.75;
    margin-left: 0.4rem;
    font-weight: 400;
  }
  .sub-content { display: none; }
  .sub-content.active { display: block; }

  /* ===== L3 source-tabs ===== */
  .source-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.9rem 0 1.6rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--rule);
  }
  .source-tab {
    background: none;
    border: 1px solid var(--rule);
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    font-size: 0.83rem;
    color: var(--fg-soft);
    cursor: pointer;
    font-family: inherit;
    transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  }
  .source-tab:hover { border-color: var(--muted); color: var(--fg); }
  .source-tab.active {
    background: var(--fg);
    color: var(--bg);
    border-color: var(--fg);
  }
  .source-tab .count {
    font-size: 0.7rem;
    opacity: 0.75;
    margin-left: 0.3rem;
  }
  .source-content { display: none; }
  .source-content.active { display: block; }

  /* ===== sort switcher ===== */
  .sort-bar {
    display: flex;
    align-items: center;
    gap: 0;
    justify-content: flex-end;
    padding: 0.55rem 0 0.4rem;
  }
  .sort-bar::before {
    content: "";
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 0.35rem;
    opacity: 0.35;
    background: currentColor;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4h10M3 8h7M3 12h4'/%3E%3C/svg%3E") center/contain no-repeat;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4h10M3 8h7M3 12h4'/%3E%3C/svg%3E") center/contain no-repeat;
  }
  .sort-btn {
    background: transparent;
    border: none;
    padding: 0.28rem 0.55rem;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: color 0.2s ease, background 0.2s ease, transform 0.15s ease;
    position: relative;
  }
  .sort-btn + .sort-btn { margin-left: 0.1rem; }
  .sort-btn:hover {
    color: var(--fg);
    background: var(--card);
  }
  .sort-btn:active {
    transform: scale(0.96);
  }
  .sort-btn.active {
    color: var(--fg-soft);
    font-weight: 650;
  }
  .sort-btn.active::after {
    content: "";
    position: absolute;
    left: 0.45rem;
    right: 0.45rem;
    bottom: 0.1rem;
    height: 1.5px;
    border-radius: 1px;
    background: var(--fg);
    opacity: 0.7;
  }
  .sort-sep {
    display: inline-block;
    width: 1px;
    height: 10px;
    margin: 0 0.2rem;
    background: var(--rule);
    flex-shrink: 0;
  }

  /* ===== article cards in raw panels ===== */
  .article {
    display: grid;
    grid-template-columns: minmax(0, 0.72fr) minmax(16rem, 1fr);
    gap: clamp(0.9rem, 3vw, 2.4rem);
    padding: clamp(1.15rem, 2.4vw, 2rem) 0;
    border-bottom: 1px solid var(--rule);
  }
  .article:first-child { padding-top: 0; }
  .article:last-child { border-bottom: none; }
  .article-title {
    font-size: clamp(1.25rem, 2.2vw, 1.9rem);
    margin: 0;
    font-weight: 720;
    line-height: 1.12;
    text-wrap: balance;
  }
  .article-title a { color: var(--fg); text-decoration: none; }
  .article-title a:hover { color: var(--link); }
  .article-main {
    min-width: 0;
  }
  .article-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2.25rem;
    align-items: start;
    gap: 0.65rem;
  }
  .favorite-star {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--bg-elevated);
    color: var(--muted);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
  }
  .favorite-star:hover {
    border-color: var(--accent);
    color: var(--accent);
    transform: translateY(-1px);
  }
  .favorite-star.saved {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--rule));
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-elevated));
    color: var(--accent);
  }
  .favorite-star.busy {
    opacity: 0.62;
    pointer-events: none;
  }
  .article-facts {
    margin-top: 0.8rem;
    display: grid;
    gap: 0.28rem;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.45;
    font-variant-numeric: tabular-nums;
  }
  .article-facts p {
    margin: 0;
  }
  .article-body {
    min-width: 0;
    width: 100%;
    display: grid;
    gap: 0.8rem;
  }
  .article-excerpt-card,
  .article-summary-card {
    position: relative;
    width: 100%;
    padding: 0.95rem 1.1rem 0.95rem 1.25rem;
    border: 1px solid var(--rule);
    border-radius: 0.95rem;
    overflow: hidden;
  }
  .article-excerpt-card {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--cool) 55%, transparent), transparent 78%),
      var(--card);
  }
  .article-summary-card {
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent 78%),
      color-mix(in srgb, var(--bg-elevated) 72%, var(--card));
  }
  .article-excerpt-card::before,
  .article-summary-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    opacity: 0.78;
  }
  .article-excerpt-card::before { background: var(--cool-strong); }
  .article-summary-card::before { background: var(--accent); }
  .excerpt-label,
  .summary-label {
    display: inline-block;
    margin-bottom: 0.38rem;
    font-size: 0.68rem;
    font-weight: 720;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .excerpt-label { color: var(--cool-strong); }
  .summary-label { color: var(--accent); }
  .article-excerpt,
  .article-summary {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.7;
    max-width: none;
    text-wrap: pretty;
  }
  .article-excerpt { color: var(--fg-soft); }
  .article-summary { color: var(--fg); }

  .empty {
    color: var(--muted);
    text-align: center;
    padding: 2rem 0;
    font-size: 0.9rem;
  }

  footer {
    margin-top: 4rem;
    border-top: 1px solid var(--rule);
    padding-top: 1.4rem;
    color: var(--muted);
    font-size: 0.82rem;
  }
  .generated-info {
    margin-top: 0.35rem;
    font-size: 0.76rem;
    color: var(--muted);
    opacity: 0.72;
  }
  @media (max-width: 760px) {
    main { width: min(100% - 1.1rem, 1180px); padding-top: 1.3rem; }
    header.report-header {
      min-height: 0;
      grid-template-columns: 1fr;
      gap: 0.85rem;
      padding-bottom: 1.15rem;
    }
    .header-top {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }
    h1.report-title { font-size: clamp(2.25rem, 12vw, 3.6rem); }
    .date-details {
      justify-content: flex-start;
      gap: 0.32rem;
      margin: 0;
    }
    .date-chip { padding: 0.32rem 0.5rem; }
    .date-chip-sub { white-space: normal; }
    .sort-bar { justify-content: flex-start; }
    .hero-card { border-radius: 0.9rem; }
    .hero-card {
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }
    .topic-grid { grid-template-columns: 1fr; }
    .tabs { margin-inline: -0.15rem; }
    .article {
      grid-template-columns: 1fr;
      gap: 0.6rem;
    }
    .article-title { font-size: 1.22rem; }
  }
${reportSiteNavStyles()}
</style>
</head>
<body>
<a class="skip-link" href="#content">Skip to content</a>
<main class="main-nav-spacer">
  ${renderReportSiteNav(date)}
  <header class="report-header">
    <div class="header-top">
      <div class="date-stack">
      <h1 class="report-title">${STR.reportHeading}</h1>
      ${process.env.WEB_MODE === "true" ? `<a class="archive-link" href="../archive.html">${STR.archiveLink}</a>` : ""}
      </div>
      <div class="date-details" aria-label="${escapeHtml(dateDisplay.fullDate)}">
        <div class="date-chip">
          <span class="date-chip-value">${escapeHtml(dateDisplay.weekday)}</span>
          <span class="date-chip-sub">${escapeHtml(dateDisplay.fullDate)}</span>
        </div>
        ${dateDisplay.lunar ? `<div class="date-chip">
          <span class="date-chip-label">农历</span>
          <span class="date-chip-value">${escapeHtml(dateDisplay.lunar)}</span>
        </div>` : ""}
        ${dateDisplay.solarTermToday ? `<div class="date-chip">
          <span class="date-chip-value">${escapeHtml(dateDisplay.solarTermToday)}</span>
        </div>` : ""}
        ${dateDisplay.nextSolarTerm ? `<div class="date-chip">
          <span class="date-chip-sub">${STR.nextSolarTermLabel} · ${escapeHtml(dateDisplay.nextSolarTermDate)} ${escapeHtml(dateDisplay.nextSolarTerm)}</span>
        </div>` : ""}
      </div>
    </div>
    <section class="hero-card" aria-label="${STR.topicOverviewLabel}">
      <span class="hero-eyebrow">${STR.topicOverviewLabel}</span>
      <div class="topic-grid">
        ${renderTopicOverviewCards(topicOverviews)}
      </div>
    </section>
  </header>

  <nav class="tabs" role="tablist" aria-label="${STR.siteTitle}">
    <button class="tab active" data-tab="tech">${CATEGORY_LABELS.tech}<span class="count">${counts.tech}</span></button>
    ${showTradingPanel && trading ? `<button class="tab" data-tab="trading">${STR.catTrading}<span class="count">${trading.tickers.length}</span></button>` : ""}
    <button class="tab" data-tab="politics">${CATEGORY_LABELS.politics}<span class="count">${counts.politics}</span></button>
    <button class="tab" data-tab="finance">${CATEGORY_LABELS.finance}<span class="count">${counts.finance}</span></button>
  </nav>

  <section id="content" class="panel active" data-panel="tech">
    ${renderRawCategoryPanel("tech", raw.tech)}
  </section>
  ${showTradingPanel && trading ? `<section class="panel" data-panel="trading">${renderTradingPanel(trading)}</section>` : ""}
  <section class="panel" data-panel="politics">
    ${renderRawCategoryPanel("politics", raw.politics)}
  </section>
  <section class="panel" data-panel="finance">
    ${renderRawCategoryPanel("finance", raw.finance)}
  </section>

  <footer>
    ${STR.footer}
    ${meta?.durationMs != null && generatedAtDate ? `<p class="generated-info">${STR.generatedAt} ${generatedAtDate.toLocaleString(REPORT_LOCALE === "en" ? "en-US" : "zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })} · ${meta.durationMs >= 60_000 ? `${Math.round(meta.durationMs / 60_000)}m${Math.round((meta.durationMs % 60_000) / 1000)}s` : `${Math.round(meta.durationMs / 1000)}s`}${meta.trigger ? ` · ${meta.trigger === "manual" ? STR.generatedManual : meta.trigger === "schedule" ? STR.generatedScheduled : ""}` : ""}</p>` : ""}
  </footer>
</main>
<script>
  document.querySelectorAll('.tabs > .tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;
      document.querySelectorAll('.tabs > .tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      document.querySelectorAll('.panel').forEach(function (p) {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });
  // Scope sub-tab / source-tab toggles to the parent .panel so two L1 panels
  // can share the same data-cat (e.g. tech main + community both data-cat=tech)
  // without stomping on each other's active state.
  document.querySelectorAll('.sub-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.closest('.panel');
      if (!panel) return;
      var sub = btn.dataset.sub;
      panel.querySelectorAll('.sub-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      panel.querySelectorAll('.sub-content').forEach(function (p) {
        p.classList.toggle('active', p.dataset.subContent === sub);
      });
    });
  });
  document.querySelectorAll('.source-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var subContent = btn.closest('.sub-content');
      if (!subContent) return;
      var src = btn.dataset.source;
      subContent.querySelectorAll('.source-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      subContent.querySelectorAll('.source-content').forEach(function (p) {
        p.classList.toggle('active', p.dataset.sourceContent === src);
      });
    });
  });
  // Sort switcher — reorders article elements within each sub-content
  document.querySelectorAll('.sort-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var bar = btn.closest('.sort-bar');
      if (!bar) return;
      var subContent = bar.closest('.sub-content');
      if (!subContent) return;
      var mode = btn.dataset.sortMode;
      bar.querySelectorAll('.sort-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      if (mode === 'recommended') {
        // Recommended — sort within each source-content
        subContent.querySelectorAll('.source-content').forEach(function (container) {
          var articles = Array.prototype.slice.call(container.querySelectorAll('article.article'));
          if (articles.length < 2) return;
          articles.sort(function (a, b) {
            return parseFloat(b.dataset.sortScore) - parseFloat(a.dataset.sortScore);
          });
          articles.forEach(function (el) { container.appendChild(el); });
        });
      } else {
        // Time / Source — pool all articles across all source-contents
        var allArticles = [];
        subContent.querySelectorAll('.source-content').forEach(function (container) {
          var articles = Array.prototype.slice.call(container.querySelectorAll('article.article'));
          allArticles.push.apply(allArticles, articles);
        });
        if (allArticles.length > 1) {
          allArticles.sort(function (a, b) {
            if (mode === 'time') {
              return parseFloat(b.dataset.sortTime) - parseFloat(a.dataset.sortTime);
            }
            // source mode — group by source alphabetically, then by time desc
            var srcDiff = a.dataset.sortSource < b.dataset.sortSource ? -1 :
                          a.dataset.sortSource > b.dataset.sortSource ? 1 : 0;
            if (srcDiff !== 0) return srcDiff;
            return parseFloat(b.dataset.sortTime) - parseFloat(a.dataset.sortTime);
          });
          allArticles.forEach(function (el) {
            el.parentNode.appendChild(el);
          });
        }
      }
      // Persist sort choice in URL query param
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('sort', mode);
        history.replaceState(null, '', url.toString());
      } catch (e) {}
    });
  });
  // Restore sort from URL query param on load
  (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get('sort');
      if (!mode || mode === 'recommended') return;
      document.querySelectorAll('.sort-btn[data-sort-mode="' + mode + '"]').forEach(function (btn) {
        btn.click();
      });
    } catch (e) {}
  })();
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.favorite-star'));
    if (buttons.length === 0 || !window.fetch) return;
    var urls = buttons.map(function (btn) { return btn.dataset.favoriteUrl; }).filter(Boolean);
    function setState(btn, saved) {
      btn.classList.toggle('saved', saved);
      btn.textContent = saved ? '★' : '☆';
      btn.setAttribute('aria-label', saved ? '取消收藏文章' : '收藏文章');
      btn.setAttribute('title', saved ? '取消收藏文章' : '收藏文章');
    }
    fetch('/api/favorites?urls=' + encodeURIComponent(urls.join('\\n')))
      .then(function (res) { return res.ok ? res.json() : { savedUrls: [] }; })
      .then(function (data) {
        var saved = new Set(data.savedUrls || []);
        buttons.forEach(function (btn) { setState(btn, saved.has(btn.dataset.favoriteUrl)); });
      })
      .catch(function () {});
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextSaved = !btn.classList.contains('saved');
        var article = {};
        try { article = JSON.parse(btn.dataset.favoriteArticle || '{}'); } catch (error) {}
        article.reportDate = ${scriptString(date)};
        btn.classList.add('busy');
        setState(btn, nextSaved);
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: btn.dataset.favoriteUrl, saved: nextSaved, article: article })
        })
          .then(function (res) { if (!res.ok) throw new Error('favorite failed'); return res.json(); })
          .then(function (data) { setState(btn, Boolean(data.saved)); })
          .catch(function () { setState(btn, !nextSaved); })
          .finally(function () { btn.classList.remove('busy'); });
      });
    });
  })();
</script>
</body>
</html>`;
}

// ----- trading panel -----

const SIGNAL_TONE: Record<string, "bull" | "bear" | "caution"> = {
  "golden-cross": "bull",
  "macd-bull-cross": "bull",
  "above-sma50-sma200": "bull",
  "near-52w-high": "bull",
  "death-cross": "bear",
  "macd-bear-cross": "bear",
  "below-sma50-sma200": "bear",
  "near-52w-low": "bear",
  "rsi-overbought": "caution",
  "rsi-oversold": "caution",
};

const TREND_LABEL: Record<TickerAnalysis["trend"], string> = {
  bullish: STR.trendBullish,
  bearish: STR.trendBearish,
  neutral: STR.trendNeutral,
};

function stanceClass(stance: string): "bull" | "bear" | "neutral" {
  // Supports both legacy ("看多"/"看空") and current ("偏上行"/"偏下行")
  // stance values. The current values were chosen to avoid Sonnet's
  // "no investment advice" guardrail; rendering keeps both readable.
  if (/多|涨|上行|bull/i.test(stance)) return "bull";
  if (/空|跌|下行|bear/i.test(stance)) return "bear";
  return "neutral";
}

function fmtNum(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  // Use thousand separators only for prices >= 1000
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n.toFixed(dp);
}

function fmtPct(n: number, dp = 2): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(dp)}%`;
}

function renderPickCard(p: WatchlistPick): string {
  const cls = stanceClass(p.stance);
  const symbol = escapeHtml(p.symbol);
  const name = escapeHtml(p.display_name ?? p.symbol);
  const stance = escapeHtml(p.stance);
  const rationale = escapeHtml(p.rationale ?? "");
  return `<article class="trading-pick stance-${cls}">
    <header class="pick-head">
      <div class="pick-symbol-block">
        <span class="pick-symbol">${symbol}</span>
        <span class="pick-name">${name}</span>
      </div>
      <span class="pick-stance pick-stance-${cls}">${stance}</span>
    </header>
    <p class="pick-rationale">${rationale}</p>
  </article>`;
}

function renderTickerCard(t: TickerAnalysis): string {
  const trendCls = t.trend;
  const priceCls = t.pct1Day >= 0 ? "positive" : "negative";
  const pct5Cls = t.pct5Day >= 0 ? "positive" : "negative";
  const signals = t.signals
    .map((s) => {
      const tone = SIGNAL_TONE[s.type] ?? "caution";
      const ageSuffix =
        s.daysAgo !== undefined
          ? ` <span class="signal-age">(${s.daysAgo === 0 ? STR.signalToday : `${s.daysAgo} ${STR.signalDaysAgoSuffix}`})</span>`
          : "";
      return `<span class="signal-pill tone-${tone}">${escapeHtml(s.label)}${ageSuffix}</span>`;
    })
    .join("");
  const currencyPrefix = t.currency === "USD" ? "$" : t.currency === "HKD" ? "HK$" : t.currency === "CNY" ? "¥" : "";
  return `<article class="ticker-card">
    <header class="ticker-head">
      <div class="ticker-id">
        <h3 class="ticker-symbol">${escapeHtml(t.symbol)}</h3>
        <p class="ticker-name">${escapeHtml(t.displayName)}</p>
      </div>
      <div class="ticker-price-block">
        <span class="ticker-price">${currencyPrefix}${fmtNum(t.currentPrice)}</span>
        <span class="ticker-pct ${priceCls}">${fmtPct(t.pct1Day)}</span>
      </div>
    </header>
    <dl class="ticker-indicators">
      <div><dt>${STR.ticker5d}</dt><dd class="${pct5Cls}">${fmtPct(t.pct5Day)}</dd></div>
      <div><dt>${STR.tickerVs52wHigh}</dt><dd>${fmtPct(t.pct52WeekHigh, 1)}</dd></div>
      <div><dt>RSI(14)</dt><dd class="rsi-${t.rsiState}">${fmtNum(t.rsi14, 1)}</dd></div>
      <div><dt>${STR.tickerTrend}</dt><dd class="trend-${trendCls}">${TREND_LABEL[t.trend]}</dd></div>
      <div><dt>SMA 20 / 50 / 200</dt><dd>${fmtNum(t.sma20)} / ${fmtNum(t.sma50)} / ${fmtNum(t.sma200)}</dd></div>
      <div><dt>${STR.tickerMacd}</dt><dd>${fmtNum(t.macd, 3)} / ${fmtNum(t.macdSignal, 3)}</dd></div>
    </dl>
    ${signals ? `<div class="ticker-signals">${signals}</div>` : ""}
  </article>`;
}

function fearGreedTone(value: number): "fear-extreme" | "fear" | "neutral" | "greed" | "greed-extreme" {
  if (value <= 24) return "fear-extreme";
  if (value <= 44) return "fear";
  if (value <= 55) return "neutral";
  if (value <= 74) return "greed";
  return "greed-extreme";
}

function fmtBigUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  return `$${n.toFixed(0)}`;
}

function renderCryptoWidgets(t: TradingSection): string {
  const fg = t.crypto_fear_greed;
  const cg = t.crypto_global;
  if (!fg && !cg) return "";
  const items: string[] = [];
  if (fg) {
    const tone = fearGreedTone(fg.value);
    items.push(`<div class="crypto-widget fg-${tone}">
      <div class="widget-label">${STR.widgetCryptoFearGreed}</div>
      <div class="widget-value">${fg.value}</div>
      <div class="widget-sub">${escapeHtml(fg.classificationCn)}</div>
    </div>`);
  }
  if (cg) {
    const tone = cg.marketCapChangePct24h >= 0 ? "positive" : "negative";
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetCryptoCap}</div>
      <div class="widget-value">${fmtBigUsd(cg.totalMarketCapUsd)}</div>
      <div class="widget-sub ${tone}">${fmtPct(cg.marketCapChangePct24h)} / 24h</div>
    </div>`);
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetBtcDom}</div>
      <div class="widget-value">${cg.btcDominance.toFixed(1)}%</div>
      <div class="widget-sub">ETH ${cg.ethDominance.toFixed(1)}%</div>
    </div>`);
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetVolume24h}</div>
      <div class="widget-value">${fmtBigUsd(cg.total24hVolumeUsd)}</div>
      <div class="widget-sub">${STR.widgetActiveCoins} ${cg.activeCryptocurrencies.toLocaleString()}</div>
    </div>`);
  }
  return `<div class="crypto-widgets">${items.join("")}</div>`;
}

function renderTradingPanel(trading: TradingSection): string {
  const tickers = trading.tickers;
  const groupCounts: Record<AssetGroup, number> = {
    "us-equity": 0,
    crypto: 0,
    "china-equity": 0,
    "commodity-fx": 0,
    macro: 0,
  };
  for (const t of tickers) groupCounts[t.group as AssetGroup] = (groupCounts[t.group as AssetGroup] ?? 0) + 1;

  const groupTabs = ASSET_GROUP_ORDER.map(
    (g, i) =>
      `<button class="trading-group-tab${i === 0 ? " active" : ""}" data-group="${g}">${escapeHtml(ASSET_GROUP_LABELS_LOCALIZED[g])}<span class="count">${groupCounts[g] ?? 0}</span></button>`,
  ).join("");

  const groupPanels = ASSET_GROUP_ORDER.map((g, i) => {
    const groupTickers = tickers.filter((t) => t.group === g);
    // Crypto sub-tab carries an extra header widget panel (F&G + global stats)
    const cryptoWidgets =
      g === "crypto" ? renderCryptoWidgets(trading) : "";
    return `<div class="trading-group-content${i === 0 ? " active" : ""}" data-group="${g}">
      ${cryptoWidgets}
      ${groupTickers.length === 0 ? `<p class="empty">${STR.emptyGroup}</p>` : groupTickers.map(renderTickerCard).join("")}
    </div>`;
  }).join("");

  const overview = escapeHtml(trading.market_overview ?? "");
  const risk = escapeHtml(trading.risk_caveat ?? "");

  return `<section class="trading-overview-card">
    <span class="eyebrow">${STR.tradingMarketOverview}</span>
    <p class="overview-text trading-overview-text">${overview}</p>
  </section>

  ${
    trading.watchlist.length > 0
      ? `<section class="trading-watchlist">
    <h2 class="category-title trading-section-title">${STR.tradingTodayFocus}</h2>
    <div class="trading-picks">
      ${trading.watchlist.map(renderPickCard).join("\n")}
    </div>
  </section>`
      : ""
  }

  <section class="trading-tickers">
    <h2 class="category-title trading-section-title">${STR.tradingAllAssets}</h2>
    <nav class="trading-group-tabs">${groupTabs}</nav>
    <div class="trading-group-contents">${groupPanels}</div>
  </section>

  ${
    risk
      ? `<section class="trading-risk">
    <span class="eyebrow">${STR.tradingRiskCaveat}</span>
    <p>${risk}</p>
  </section>`
      : ""
  }`;
}

// ----- markdown -----

function renderBriefMarkdown(b: BriefItem): string {
  const importance = Number.isFinite(b.importance) ? b.importance : 0;
  return `### [${b.title}](${b.url})\n${b.source} · ${STR.mdImportance} ${importance}/10\n\n${b.summary}\n`;
}

function renderSectionMarkdown(title: string, briefs: BriefItem[]): string {
  if (briefs.length === 0) return "";
  return `## ${title}\n\n${briefs.map(renderBriefMarkdown).join("\n")}\n`;
}

export function renderMarkdown(report: DailyReport, date: string): string {
  const blocks: string[] = [];
  blocks.push(`# ${STR.siteTitle} · ${date}\n`);
  if (report.hero_headline) blocks.push(`> ${report.hero_headline}\n`);
  if (report.daily_overview) {
    blocks.push(`## ${STR.mdTodayOverview}\n\n${report.daily_overview}\n`);
  }
  blocks.push(
    renderSectionMarkdown(CATEGORY_DIGEST_LABELS.tech, report.tech_briefs),
  );
  blocks.push(
    renderSectionMarkdown(
      CATEGORY_DIGEST_LABELS.finance,
      report.finance_briefs,
    ),
  );
  blocks.push(
    renderSectionMarkdown(
      CATEGORY_DIGEST_LABELS.politics,
      report.politics_briefs,
    ),
  );
  if (report.editor_note) {
    blocks.push(`## ${STR.mdEditorNote}\n\n${report.editor_note}\n`);
  }
  if (report.keywords.length > 0) {
    blocks.push(
      `## ${STR.mdTodayKeywords}\n\n${report.keywords.map((k) => `\`#${k}\``).join(" ")}\n`,
    );
  }
  return blocks.filter(Boolean).join("\n");
}
