# DailyBrief Favorites and Recommendation Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user favorites feature with star controls on report articles, a `我的收藏` page, and stable rule-based `综合推荐` ordering.

**Architecture:** Add persistent favorite snapshots keyed by article URL, add ranking metadata to report articles, and keep report pages self-contained by rendering star controls plus a dependency-free script into generated and injected report HTML. Use focused helpers for favorite persistence and recommendation scoring so React pages, APIs, and report rendering do not parse source-specific strings in multiple places.

**Tech Stack:** Next.js App Router, React Server Components, Prisma 7, PostgreSQL, TypeScript, inline report HTML/CSS/JS, Node `assert` smoke tests.

---

## File Structure

- Modify `prisma/schema.prisma`: add `SavedArticle`; add ranking columns to `ReportArticle`.
- Create `prisma/migrations/202606040001_favorites_and_ranking/migration.sql`: SQL migration for the new table and columns.
- Modify `lib/sources/types.ts`: add optional ranking metadata fields to `RawArticle`.
- Create `lib/articles/recommendation.ts`: score parsing, score normalization, recommendation reasons, and list ordering.
- Modify source fetchers with strong engagement signals:
  - `lib/sources/github-trending.ts`
  - `lib/sources/hackernews.ts`
  - `lib/sources/huggingface-papers.ts`
  - `lib/sources/v2ex.ts`
  - `lib/sources/attentionvc.ts`
- Modify `lib/web/generation-service.ts`: apply recommendation metadata before enrichment/render/persistence.
- Modify `lib/db/report-repository.ts`: persist ranking fields on `ReportArticle`.
- Create `lib/db/favorite-repository.ts`: favorite upsert/delete/list/state helpers.
- Create `app/api/favorites/route.ts`: GET batch state and POST save/unsave API.
- Create `app/favorites/page.tsx`: personal favorites reading-list page.
- Modify `components/public/MainNavigation.tsx`: add `/favorites` nav item and active path.
- Modify `lib/output/site-nav.ts`: add `/favorites` to injected report navigation.
- Modify `lib/output/render.ts`: render star button, article metadata, favorite styles, favorite script, and recommendation sorting.
- Modify `scripts/render-smoke-test.ts`: assert report HTML contains favorite star controls and scripts.
- Modify `scripts/web-smoke-test.ts`: assert new routes, nav item, schema fields, and API route exist.
- Create `scripts/recommendation-smoke-test.ts`: test recommendation scoring behavior.
- Modify `package.json`: add `scripts/recommendation-smoke-test.ts` to `npm test`.

---

## Task 1: Schema and Smoke-Test Contracts

**Files:**
- Modify: `scripts/web-smoke-test.ts`
- Modify: `package.json`
- Create: `scripts/recommendation-smoke-test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202606040001_favorites_and_ranking/migration.sql`

- [ ] **Step 1: Write failing web smoke assertions**

Add these assertions to `scripts/web-smoke-test.ts` after the existing `MainNavigation` assertions:

```ts
assert.match(mainNavigation, /href: "\/favorites"/);
assert.match(mainNavigation, /label: "我的收藏"/);
assert.match(mainNavigation, /pathname === "\/favorites"/);
```

Add these required files to the `requiredFiles` array:

```ts
"app/favorites/page.tsx",
"app/api/favorites/route.ts",
"lib/db/favorite-repository.ts",
"lib/articles/recommendation.ts",
"scripts/recommendation-smoke-test.ts",
```

Add these schema assertions after `const sourceConfig = ...`:

```ts
const prismaSchema = fs.readFileSync("prisma/schema.prisma", "utf8");
assert.match(prismaSchema, /model SavedArticle/);
assert.match(prismaSchema, /url\s+String\s+@unique/);
assert.match(prismaSchema, /recommendationScore\s+Float\?/);
assert.match(prismaSchema, /recommendationReason\s+String\?/);
assert.match(prismaSchema, /engagementScore\s+Float\?/);
assert.match(prismaSchema, /heatScore\s+Float\?/);
assert.match(prismaSchema, /sourceRank\s+Int\?/);
```

Add these route assertions near the other route assertions:

```ts
const favoritesPage = fs.readFileSync("app/favorites/page.tsx", "utf8");
assert.match(favoritesPage, /listSavedArticles/);
assert.match(favoritesPage, /我的收藏/);
assert.match(favoritesPage, /sort/);
assert.equal(favoritesPage.includes("<table"), false);

const favoritesApiRoute = fs.readFileSync("app/api/favorites/route.ts", "utf8");
assert.match(favoritesApiRoute, /export async function GET/);
assert.match(favoritesApiRoute, /export async function POST/);
assert.match(favoritesApiRoute, /listSavedUrls/);
assert.match(favoritesApiRoute, /setSavedArticle/);
assert.match(favoritesApiRoute, /status: 400/);
```

- [ ] **Step 2: Write failing recommendation smoke test**

Create `scripts/recommendation-smoke-test.ts` with:

```ts
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
assert.equal(normalizeEngagement(10), 34.65735902799726);
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
```

- [ ] **Step 3: Wire failing recommendation smoke test into `npm test`**

Change `package.json`:

```json
"test": "tsx scripts/render-smoke-test.ts && tsx scripts/web-smoke-test.ts && tsx scripts/rss-excerpt-smoke-test.ts && tsx scripts/recommendation-smoke-test.ts"
```

- [ ] **Step 4: Run tests and verify red**

Run:

```bash
npm test
```

Expected: FAIL because `app/favorites/page.tsx`, `app/api/favorites/route.ts`, `lib/db/favorite-repository.ts`, `lib/articles/recommendation.ts`, and schema fields do not exist yet.

- [ ] **Step 5: Add Prisma schema**

In `prisma/schema.prisma`, update `ReportArticle`:

```prisma
model ReportArticle {
  id                   String   @id @default(cuid())
  reportId             String
  report               Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  sourceId             String
  sourceName           String
  category             Category
  title                String
  url                  String
  excerpt              String?
  summary              String?
  meta                 String?
  publishedAt          DateTime?
  sourceRank           Int?
  engagementScore      Float?
  heatScore            Float?
  recommendationScore  Float?
  recommendationReason String?
  rawJson              Json?
}
```

Add below `ReportArticle`:

```prisma
model SavedArticle {
  id              String    @id @default(cuid())
  url             String    @unique
  title           String
  sourceId        String?
  sourceName      String?
  category        Category?
  excerpt         String?
  summary         String?
  meta            String?
  publishedAt     DateTime?
  firstReportDate String?
  lastReportDate  String?
  savedAt         DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

- [ ] **Step 6: Add SQL migration**

Create `prisma/migrations/202606040001_favorites_and_ranking/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "ReportArticle"
ADD COLUMN "sourceRank" INTEGER,
ADD COLUMN "engagementScore" DOUBLE PRECISION,
ADD COLUMN "heatScore" DOUBLE PRECISION,
ADD COLUMN "recommendationScore" DOUBLE PRECISION,
ADD COLUMN "recommendationReason" TEXT;

-- CreateTable
CREATE TABLE "SavedArticle" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceId" TEXT,
  "sourceName" TEXT,
  "category" "Category",
  "excerpt" TEXT,
  "summary" TEXT,
  "meta" TEXT,
  "publishedAt" TIMESTAMP(3),
  "firstReportDate" TEXT,
  "lastReportDate" TEXT,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SavedArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedArticle_url_key" ON "SavedArticle"("url");

-- CreateIndex
CREATE INDEX "SavedArticle_savedAt_idx" ON "SavedArticle"("savedAt");
```

- [ ] **Step 7: Run Prisma generate**

Run:

```bash
npm exec prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 8: Commit schema contract**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/202606040001_favorites_and_ranking/migration.sql scripts/web-smoke-test.ts scripts/recommendation-smoke-test.ts package.json
git commit -m "Add favorites and ranking schema contract" -m "The favorites feature needs persistent saved article snapshots and report-level ranking metadata before API and rendering work can be built safely." -m "Constraint: ReportArticle rows are regenerated per date, so SavedArticle stores its own URL-keyed snapshot." -m "Tested: npm test fails at missing implementation as expected." -m "Not-tested: Prisma migration execution and runtime routes are not implemented yet."
```

---

## Task 2: Recommendation Scoring Helper and Source Metadata

**Files:**
- Create: `lib/articles/recommendation.ts`
- Modify: `lib/sources/types.ts`
- Modify: `lib/sources/github-trending.ts`
- Modify: `lib/sources/hackernews.ts`
- Modify: `lib/sources/huggingface-papers.ts`
- Modify: `lib/sources/v2ex.ts`
- Modify: `lib/sources/attentionvc.ts`
- Modify: `lib/web/generation-service.ts`

- [ ] **Step 1: Extend `RawArticle` type**

Add optional fields to `lib/sources/types.ts` inside `RawArticle`:

```ts
  sourceRank?: number;
  engagementScore?: number;
  heatScore?: number;
  recommendationScore?: number;
  recommendationReason?: string;
```

- [ ] **Step 2: Implement recommendation helper**

Create `lib/articles/recommendation.ts`:

```ts
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

function recommendationScore(article: RawArticle, now: Date): RawArticle {
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

function applyDiversityPenalty(articles: RawArticle[]): RawArticle[] {
  const seenBySource = new Map<string, number>();
  return articles.map((article) => {
    const seen = seenBySource.get(article.sourceId) ?? 0;
    seenBySource.set(article.sourceId, seen + 1);
    if (seen === 0 || article.recommendationScore === undefined) return article;
    return {
      ...article,
      recommendationScore: Math.max(0, Math.round((article.recommendationScore - Math.min(12, seen * 3)) * 100) / 100),
    };
  });
}

export function applyRecommendationScores(
  articles: RawArticle[],
  options: { now?: Date } = {},
): RawArticle[] {
  const now = options.now ?? new Date();
  const scored = articles.map((article) => recommendationScore(article, now));
  const sorted = [...scored].sort((a, b) => {
    const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
  return applyDiversityPenalty(sorted).sort((a, b) => {
    const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
}
```

- [ ] **Step 3: Add source ranking metadata**

In `lib/sources/github-trending.ts`, in the returned article object inside `$("article.Box-row").each((i, el) => { ... })`, add:

```ts
sourceRank: i + 1,
engagementScore: Number((starsToday ?? "").replace(/[^\d]/g, "")) || undefined,
```

If `starsToday` is not numeric in current code, add this local helper near `metaParts`:

```ts
const starsTodayValue = Number((starsToday ?? "").replace(/[^\d]/g, "")) || undefined;
```

and use:

```ts
engagementScore: starsTodayValue,
```

- [ ] **Step 4: Add Hacker News metadata**

In `lib/sources/hackernews.ts`, when mapping each item, add:

```ts
sourceRank: index + 1,
engagementScore: (it.score ?? 0) + (it.descendants ?? 0) * 2,
```

If the map callback does not currently expose `index`, change `.map((it) => ({` to `.map((it, index) => ({`.

- [ ] **Step 5: Add Hugging Face metadata**

In `lib/sources/huggingface-papers.ts`, when mapping sorted papers, add:

```ts
sourceRank: index + 1,
engagementScore: p.paper.upvotes ?? undefined,
```

If the map callback does not expose `index`, change it to `.map((p, index) => ({`.

- [ ] **Step 6: Add V2EX metadata**

In `lib/sources/v2ex.ts`, when mapping candidates, add:

```ts
sourceRank: index + 1,
engagementScore: topic.replies,
```

If the map callback does not expose `index`, change it to `.map(({ topic, nodeTitle }, index) => ({`.

- [ ] **Step 7: Add AttentionVC metadata**

In `lib/sources/attentionvc.ts`, when mapping entries, add:

```ts
sourceRank: e.rank,
engagementScore: e.score ?? (e.rank ? Math.max(1, 101 - e.rank) : undefined),
```

If the API entry type has no `score`, use:

```ts
engagementScore: e.rank ? Math.max(1, 101 - e.rank) : undefined,
```

- [ ] **Step 8: Apply scores in generation service**

In `lib/web/generation-service.ts`, import:

```ts
import { applyRecommendationScores } from "../articles/recommendation";
```

In `fetchAll`, replace:

```ts
  return articles;
```

with:

```ts
  return applyRecommendationScores(articles);
```

- [ ] **Step 9: Run recommendation smoke test**

Run:

```bash
npx tsx scripts/recommendation-smoke-test.ts
```

Expected: `[recommendation-smoke-test] ok`.

- [ ] **Step 10: Run full test**

Run:

```bash
npm test
```

Expected: still FAIL on missing favorites files or schema persistence if later tasks are not complete; recommendation smoke test itself should pass when run directly.

- [ ] **Step 11: Commit recommendation helper**

Run:

```bash
git add lib/articles/recommendation.ts lib/sources/types.ts lib/sources/github-trending.ts lib/sources/hackernews.ts lib/sources/huggingface-papers.ts lib/sources/v2ex.ts lib/sources/attentionvc.ts lib/web/generation-service.ts scripts/recommendation-smoke-test.ts
git commit -m "Score articles for recommendation sorting" -m "Recommendation ordering needs stable local metadata so report and favorites views can rank articles without LLM reranking or fake page-view numbers." -m "Constraint: Source signals are inconsistent, so scores normalize real engagement only when present and fall back to recency plus source rank." -m "Tested: npx tsx scripts/recommendation-smoke-test.ts" -m "Not-tested: Full npm test remains blocked until favorites routes are implemented."
```

---

## Task 3: Persist Ranking Fields and Favorite Repository

**Files:**
- Modify: `lib/db/report-repository.ts`
- Create: `lib/db/favorite-repository.ts`

- [ ] **Step 1: Persist ranking fields**

In `lib/db/report-repository.ts`, add these fields inside the `createMany` data object:

```ts
        sourceRank: article.sourceRank ?? null,
        engagementScore: article.engagementScore ?? null,
        heatScore: article.heatScore ?? null,
        recommendationScore: article.recommendationScore ?? null,
        recommendationReason: article.recommendationReason ?? null,
```

Also add them inside `rawJson`:

```ts
          sourceRank: article.sourceRank ?? null,
          engagementScore: article.engagementScore ?? null,
          heatScore: article.heatScore ?? null,
          recommendationScore: article.recommendationScore ?? null,
          recommendationReason: article.recommendationReason ?? null,
```

- [ ] **Step 2: Implement favorite repository**

Create `lib/db/favorite-repository.ts`:

```ts
import type { Category, Prisma } from "@prisma/client";
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

export async function listSavedArticles(sort: FavoriteSort) {
  const orderBy: Prisma.SavedArticleOrderByWithRelationInput[] =
    sort === "latest"
      ? [{ publishedAt: "desc" }, { savedAt: "desc" }]
      : [{ savedAt: "desc" }];

  return prisma.savedArticle.findMany({ orderBy });
}
```

- [ ] **Step 3: Run type generation**

Run:

```bash
npm exec prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 4: Run build for type check**

Run:

```bash
npm run build
```

Expected: build may still fail if required app routes are not implemented. No TypeScript errors should originate from `lib/db/report-repository.ts` or `lib/db/favorite-repository.ts`.

- [ ] **Step 5: Commit persistence helpers**

Run:

```bash
git add lib/db/report-repository.ts lib/db/favorite-repository.ts
git commit -m "Persist favorite snapshots and ranking metadata" -m "Saved articles must survive report regeneration, while report articles need stable recommendation fields for sorting and rendering." -m "Constraint: ReportArticle rows are date snapshots that are deleted and recreated by upsertReadyReport." -m "Tested: npm exec prisma generate" -m "Not-tested: Build still depends on routes and UI tasks not implemented yet."
```

---

## Task 4: Favorites API and Favorites Page

**Files:**
- Create: `app/api/favorites/route.ts`
- Create: `app/favorites/page.tsx`
- Modify: `components/public/MainNavigation.tsx`
- Modify: `lib/output/site-nav.ts`

- [ ] **Step 1: Implement favorites API**

Create `app/api/favorites/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  listSavedUrls,
  normalizeFavoriteUrl,
  setSavedArticle,
  type FavoriteArticleInput,
} from "@/lib/db/favorite-repository";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repeated = searchParams.getAll("url");
  const packed = searchParams.get("urls");
  const urls = repeated.length > 0 ? repeated : packed ? packed.split("\n") : [];
  const savedUrls = await listSavedUrls(urls);
  return NextResponse.json({ savedUrls });
}

export async function POST(request: Request) {
  let body: { url?: unknown; saved?: unknown; article?: Partial<FavoriteArticleInput> };
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid json");
  }

  const url = normalizeFavoriteUrl(body.url);
  if (!url) return badRequest("invalid url");
  if (typeof body.saved !== "boolean") return badRequest("saved must be boolean");

  const article = body.article ?? {};
  if (body.saved && typeof article.title !== "string") {
    return badRequest("article.title is required");
  }

  const result = await setSavedArticle(
    {
      url,
      title: typeof article.title === "string" ? article.title : url,
      sourceId: typeof article.sourceId === "string" ? article.sourceId : null,
      sourceName: typeof article.sourceName === "string" ? article.sourceName : null,
      category: article.category === "tech" || article.category === "finance" || article.category === "politics" ? article.category : null,
      excerpt: typeof article.excerpt === "string" ? article.excerpt : null,
      summary: typeof article.summary === "string" ? article.summary : null,
      meta: typeof article.meta === "string" ? article.meta : null,
      publishedAt: typeof article.publishedAt === "string" ? article.publishedAt : null,
      reportDate: typeof article.reportDate === "string" ? article.reportDate : null,
    },
    body.saved,
  );

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Implement favorites page**

Create `app/favorites/page.tsx`:

```tsx
import Link from "next/link";
import { listSavedArticles, type FavoriteSort } from "@/lib/db/favorite-repository";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export const dynamic = "force-dynamic";

function parseSort(value: string | string[] | undefined): FavoriteSort {
  if (value === "recommended") return "recommended";
  if (value === "latest") return "latest";
  return "saved";
}

function formatDate(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function sortLabel(sort: FavoriteSort): string {
  if (sort === "recommended") return "综合推荐";
  if (sort === "latest") return "最新发布";
  return "收藏时间";
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const [articles, reports] = await Promise.all([
    listSavedArticles(sort),
    listReadyReports(currentLocale()),
  ]);
  const [latest] = reports;

  return (
    <ReportShell title="我的收藏">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["saved", "recommended", "latest"] as FavoriteSort[]).map((item) => (
          <Link
            key={item}
            aria-current={item === sort ? "page" : undefined}
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition active:translate-y-px",
              item === sort
                ? "bg-neutral-950 text-white"
                : "bg-white/70 text-neutral-600 hover:bg-white hover:text-neutral-950",
            ].join(" ")}
            href={`/favorites?sort=${item}`}
          >
            {sortLabel(item)}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <section className="rounded-2xl bg-white/70 p-6 ring-1 ring-black/10">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">还没有收藏文章</h2>
          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            在每日简报里点击文章旁边的星星，值得回看的内容会出现在这里。
          </p>
          <Link
            className="mt-5 inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:translate-y-px"
            href={latest ? `/report/${latest.dateKey}` : "/report"}
          >
            回到简报
          </Link>
        </section>
      ) : (
        <div className="grid gap-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 transition hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    <a className="hover:underline" href={article.url} rel="noopener noreferrer" target="_blank">
                      {article.title}
                    </a>
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    {[article.sourceName, formatDate(article.publishedAt), article.lastReportDate ? `报告 ${article.lastReportDate}` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <form action="/api/favorites" method="post">
                  <button
                    aria-label="取消收藏"
                    className="grid size-10 place-items-center rounded-full bg-neutral-950 text-lg leading-none text-white transition hover:bg-neutral-800 active:scale-95"
                    type="submit"
                  >
                    ★
                  </button>
                </form>
              </div>
              {article.summary || article.excerpt ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-700">
                  {article.summary ?? article.excerpt}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <a className="text-neutral-950 hover:underline" href={article.url} rel="noopener noreferrer" target="_blank">
                  打开原文
                </a>
                {article.lastReportDate ? (
                  <Link className="text-neutral-600 hover:text-neutral-950 hover:underline" href={`/report/${article.lastReportDate}`}>
                    查看报告
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </ReportShell>
  );
}
```

- [ ] **Step 3: Add favorites nav item**

In `components/public/MainNavigation.tsx`, update `navItems`:

```ts
const navItems = [
  { href: "/report", label: "首页" },
  { href: "/archive", label: "历史归档" },
  { href: "/favorites", label: "我的收藏" },
  { href: "/admin", label: "管理后台" },
];
```

In `isActivePath`, add before `/admin`:

```ts
  if (href === "/favorites") {
    return pathname === "/favorites" || pathname.startsWith("/favorites/");
  }
```

- [ ] **Step 4: Add favorites to injected report nav**

In `lib/output/site-nav.ts`, add this link between archive and admin:

```html
      <a class="site-nav-link" href="/favorites">我的收藏</a>
```

- [ ] **Step 5: Run web smoke test**

Run:

```bash
npx tsx scripts/web-smoke-test.ts
```

Expected: `[web-smoke-test] ok` if schema and route assertions are satisfied.

- [ ] **Step 6: Commit page and API**

Run:

```bash
git add app/api/favorites/route.ts app/favorites/page.tsx components/public/MainNavigation.tsx lib/output/site-nav.ts scripts/web-smoke-test.ts
git commit -m "Add favorites page and API" -m "Saved articles need a quiet reading-list surface and a small API for report-page star state." -m "Constraint: This is a single-user local tool, so the API stores global favorites without account scoping." -m "Tested: npx tsx scripts/web-smoke-test.ts" -m "Not-tested: Star controls in self-contained report HTML are implemented in a later task."
```

---

## Task 5: Report Star Controls and Favorite Script

**Files:**
- Modify: `lib/output/render.ts`
- Modify: `scripts/render-smoke-test.ts`

- [ ] **Step 1: Add failing render smoke assertions**

In `scripts/render-smoke-test.ts`, after the article excerpt assertion, add:

```ts
assert.match(html, /class="favorite-star"/);
assert.match(html, /data-favorite-url="https:\/\/example\.com\/news"/);
assert.match(html, /aria-label="收藏文章"/);
assert.match(html, /\/api\/favorites/);
assert.match(html, /loadFavoriteStates/);
```

- [ ] **Step 2: Run render smoke test and verify red**

Run:

```bash
npx tsx scripts/render-smoke-test.ts
```

Expected: FAIL because report article HTML has no star controls.

- [ ] **Step 3: Add favorite data escaping helper**

In `lib/output/render.ts`, near `escapeHtml`, add:

```ts
function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
```

- [ ] **Step 4: Update article rendering**

In `renderArticleHtml`, add these constants after `const time = formatDate(a.publishedAt);`:

```ts
  const favoritePayload = escapeAttr(JSON.stringify({
    url: a.url,
    title: a.title,
    sourceId: a.sourceId,
    sourceName: a.source,
    category: a.category,
    excerpt: a.excerpt ?? "",
    summary: summaryText ?? "",
    meta: a.meta ?? "",
    publishedAt: a.publishedAt?.toISOString() ?? "",
  }));
```

Replace the current title block:

```html
    <h3 class="article-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
```

with:

```html
    <div class="article-title-row">
      <h3 class="article-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
      <button class="favorite-star" type="button" aria-label="收藏文章" data-favorite-url="${url}" data-favorite-article="${favoritePayload}">☆</button>
    </div>
```

- [ ] **Step 5: Add favorite CSS**

In the report stylesheet in `lib/output/render.ts`, after `.article-title a:hover`, add:

```css
  .article-title-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: start;
  }
  .favorite-star {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: color-mix(in srgb, var(--bg-elevated) 78%, transparent);
    color: var(--muted);
    cursor: pointer;
    font: inherit;
    font-size: 1.15rem;
    line-height: 1;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
  }
  .favorite-star:hover {
    background: var(--accent);
    color: var(--accent-fg);
    transform: translateY(-1px);
  }
  .favorite-star:active { transform: scale(0.96); }
  .favorite-star[data-saved="true"] {
    background: var(--accent);
    color: var(--accent-fg);
  }
```

- [ ] **Step 6: Add favorite client script**

Before `</script>` in the existing report script block, add:

```js
  function favoriteButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('.favorite-star'));
  }
  function setFavoriteButton(btn, saved) {
    btn.dataset.saved = saved ? 'true' : 'false';
    btn.textContent = saved ? '★' : '☆';
    btn.setAttribute('aria-label', saved ? '取消收藏' : '收藏文章');
  }
  function favoritePayload(btn) {
    try {
      var parsed = JSON.parse(btn.dataset.favoriteArticle || '{}');
      parsed.reportDate = '${escapeHtml(date)}';
      return parsed;
    } catch (error) {
      return { url: btn.dataset.favoriteUrl || '', title: '' };
    }
  }
  function loadFavoriteStates() {
    var buttons = favoriteButtons();
    var urls = buttons.map(function (btn) { return btn.dataset.favoriteUrl || ''; }).filter(Boolean);
    if (urls.length === 0) return;
    fetch('/api/favorites?urls=' + encodeURIComponent(urls.join('\n')))
      .then(function (response) { return response.ok ? response.json() : { savedUrls: [] }; })
      .then(function (data) {
        var saved = new Set(data.savedUrls || []);
        buttons.forEach(function (btn) { setFavoriteButton(btn, saved.has(btn.dataset.favoriteUrl || '')); });
      })
      .catch(function () {});
  }
  favoriteButtons().forEach(function (btn) {
    btn.addEventListener('click', function () {
      var nextSaved = btn.dataset.saved !== 'true';
      var previous = btn.dataset.saved === 'true';
      setFavoriteButton(btn, nextSaved);
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: btn.dataset.favoriteUrl || '',
          saved: nextSaved,
          article: favoritePayload(btn)
        })
      }).then(function (response) {
        if (!response.ok) throw new Error('favorite failed');
      }).catch(function () {
        setFavoriteButton(btn, previous);
        btn.title = '收藏失败，请稍后重试';
      });
    });
  });
  loadFavoriteStates();
```

- [ ] **Step 7: Run render smoke test**

Run:

```bash
npx tsx scripts/render-smoke-test.ts
```

Expected: `[render-smoke-test] ok`.

- [ ] **Step 8: Commit report star controls**

Run:

```bash
git add lib/output/render.ts scripts/render-smoke-test.ts
git commit -m "Render favorite stars in reports" -m "Self-contained report pages need dependency-free star controls so articles can be saved without turning the report into a React page." -m "Constraint: Stored HTML must keep working when served through /report/{date}." -m "Tested: npx tsx scripts/render-smoke-test.ts" -m "Not-tested: Browser click behavior is verified in the final runtime task."
```

---

## Task 6: Sort Report Groups by Recommendation Score

**Files:**
- Modify: `lib/output/render.ts`
- Modify: `scripts/render-smoke-test.ts`

- [ ] **Step 1: Add failing sorting fixture**

In `scripts/render-smoke-test.ts`, add a second article:

```ts
const lowerRankedArticle: ArticleInput = {
  sourceId: "qbitai",
  source: "量子位",
  title: "Lower recommendation article",
  url: "https://example.com/lower",
  excerpt: "This article should render after the higher recommendation item.",
  summary: "Lower ranked summary.",
  meta: "lower score",
  category: "tech",
  publishedAt: new Date("2026-06-03T09:00:00+08:00"),
  recommendationScore: 10,
};
```

Change:

```ts
const raw = groupRaw([sampleArticle], sources);
```

to:

```ts
const raw = groupRaw([{ ...sampleArticle, recommendationScore: 90 }, lowerRankedArticle], sources);
```

Add:

```ts
assert.ok(
  html.indexOf("A focused local news workflow") < html.indexOf("Lower recommendation article"),
  "higher recommendationScore should render first",
);
```

- [ ] **Step 2: Run render smoke test and verify red if current sort conflicts**

Run:

```bash
npx tsx scripts/render-smoke-test.ts
```

Expected: FAIL if current time sorting places the lower-scored newer article first.

- [ ] **Step 3: Add recommendation sort helper in renderer**

In `lib/output/render.ts`, near other sorting helpers, add:

```ts
function sortArticlesForReading(items: ArticleInput[]): ArticleInput[] {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  });
}
```

Replace date-desc article sorts in `groupRaw` with `sortArticlesForReading(...)` except for `PRESERVE_FETCH_ORDER_SOURCES`, which should continue preserving source order.

- [ ] **Step 4: Run render smoke test**

Run:

```bash
npx tsx scripts/render-smoke-test.ts
```

Expected: `[render-smoke-test] ok`.

- [ ] **Step 5: Commit report sorting**

Run:

```bash
git add lib/output/render.ts scripts/render-smoke-test.ts
git commit -m "Sort report articles by recommendation score" -m "DailyBrief should default to a useful reading order while preserving source order for sources whose fetchers already represent a ranked feed." -m "Constraint: Sources listed in PRESERVE_FETCH_ORDER_SOURCES keep their upstream order." -m "Tested: npx tsx scripts/render-smoke-test.ts" -m "Not-tested: Full daily generation with live sources is reserved for final verification."
```

---

## Task 7: Final Verification and Local Docker Runtime

**Files:**
- No source edits unless verification exposes a bug.

- [ ] **Step 1: Run full test suite**

Run:

```bash
npm test
```

Expected:

```text
[render-smoke-test] ok
[web-smoke-test] ok
[rss-excerpt-smoke-test] ok
[recommendation-smoke-test] ok
```

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build exits 0. Existing Turbopack NFT trace warning may appear and is not introduced by this feature.

- [ ] **Step 3: Apply migration to local Docker database**

Run:

```bash
docker compose up -d postgres
npm run db:deploy
```

Expected: Prisma reports the new migration applied or no pending migrations.

- [ ] **Step 4: Rebuild local Docker images**

Run:

```bash
docker compose build web worker
```

Expected: `dailybrief-web` and `dailybrief-worker` images built.

- [ ] **Step 5: Restart local Docker app**

Run:

```bash
docker compose up -d web worker
```

Expected: `dailybrief-web-1` and `dailybrief-worker-1` started.

- [ ] **Step 6: Probe runtime pages**

Run:

```bash
curl -s -i --max-time 10 http://127.0.0.1:3000/favorites
curl -s --max-time 10 http://127.0.0.1:3000/report/2026-06-03 | rg "favorite-star|/api/favorites|我的收藏"
curl -s -i --max-time 10 "http://127.0.0.1:3000/api/favorites?url=https%3A%2F%2Fexample.com%2Fnews"
```

Expected:

- `/favorites` returns 200.
- report HTML contains favorite star controls and `我的收藏`.
- API GET returns JSON with `savedUrls`.

- [ ] **Step 7: Probe favorite POST**

Run:

```bash
curl -s -i --max-time 10 \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com/manual-favorite","saved":true,"article":{"title":"Manual favorite","sourceName":"Smoke","category":"tech","reportDate":"2026-06-03"}}' \
  http://127.0.0.1:3000/api/favorites
curl -s --max-time 10 "http://127.0.0.1:3000/api/favorites?url=https%3A%2F%2Fexample.com%2Fmanual-favorite"
```

Expected:

- POST returns `{"saved":true}`.
- GET includes `https://example.com/manual-favorite`.

- [ ] **Step 8: Check git status**

Run:

```bash
git status --short --branch
```

Expected: clean working tree except intended local commits ahead of remote. Do not push to GitHub unless the user explicitly asks.

- [ ] **Step 9: Stop before pushing**

Do not run `git push`. If all checks above pass and the working tree is clean, report the local commit range and explicitly say that GitHub has not been updated because the user did not request a push.

---

## Self-Review Checklist

- Spec coverage:
  - Single-user favorites: Tasks 1, 3, 4.
  - `我的收藏` nav and page: Task 4.
  - Star icon per article: Task 5.
  - Sort modes on favorites page: Task 4.
  - Recommendation sorting: Tasks 2, 3, 6.
  - No fake views: Task 2 scoring helper.
  - Self-contained report HTML: Task 5.
  - Tests and Docker local verification: Task 7.
- Placeholder scan: no `TBD`, `TODO`, `implement later`, or undefined task references should remain in this plan.
- Type consistency:
  - `sourceRank`, `engagementScore`, `heatScore`, `recommendationScore`, and `recommendationReason` are added to `RawArticle`, `ReportArticle`, and persistence.
  - `SavedArticle` fields match `FavoriteArticleInput` and `/api/favorites` payload.
  - Favorite sort values are `saved`, `recommended`, and `latest`.
