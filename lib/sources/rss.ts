import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { curlFetch } from "./curl-fetch";
import type { Category, RawArticle } from "./types";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; DailyBriefBot/1.0; +https://github.com/)",
  },
});

const CURL_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function extractArticleText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, svg, nav, header, footer, aside").remove();
  const selectors = [
    "article p",
    ".entry-content p",
    ".post-content p",
    ".article-content p",
    ".content p",
    "main p",
    "p",
  ];

  for (const selector of selectors) {
    const paragraphs = $(selector)
      .toArray()
      .map((el) => normalizeText($(el).text()))
      .filter((text) => text.length >= 24 && !/^©|版权|声明|广告|相关阅读/.test(text))
      .slice(0, 3);
    const text = paragraphs.join(" ");
    if (text.length >= 50) return text.slice(0, 360);
  }
  return "";
}

async function hydrateExcerptFromArticle(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": CURL_HEADERS["User-Agent"],
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": CURL_HEADERS["Accept-Language"],
      },
    });
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("html") && !contentType.includes("text")) {
      return "";
    }
    return extractArticleText(await response.text());
  } catch {
    return "";
  }
}

async function hydrateExcerptsFromArticles(articles: RawArticle[]): Promise<RawArticle[]> {
  const hydrated = await Promise.all(
    articles.map(async (article) => {
      const articleText = await hydrateExcerptFromArticle(article.url);
      if (!articleText) return article;
      return { ...article, excerpt: articleText };
    }),
  );
  return hydrated;
}

export async function fetchRss(
  sourceId: string,
  url: string,
  category: Category,
  options: { limit?: number; useCurl?: boolean; hydrateShortExcerpt?: boolean } = {},
): Promise<RawArticle[]> {
  const limit = options.limit ?? 10;

  let feed;
  if (options.useCurl) {
    const xml = await curlFetch(url, CURL_HEADERS);
    feed = await parser.parseString(xml);
  } else {
    feed = await parser.parseURL(url);
  }

  const articles = (feed.items ?? [])
    .slice(0, limit)
    .map((item, index) => ({
      sourceId,
      title: (item.title ?? "").trim(),
      url: (item.link ?? "").trim(),
      excerpt: stripHtml(item.contentSnippet ?? item.content ?? "").slice(
        0,
        300,
      ),
      publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
      sourceRank: index + 1,
      category,
    }))
    .filter((a) => a.title && a.url);

  if (options.hydrateShortExcerpt === false) return articles;
  return hydrateExcerptsFromArticles(articles);
}
