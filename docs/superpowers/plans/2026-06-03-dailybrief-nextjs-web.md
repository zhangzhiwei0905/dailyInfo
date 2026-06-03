# DailyBrief Next.js Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable Next.js + Tailwind + PostgreSQL web version of DailyBrief with public reports, history, password-protected admin, source management, scheduled daily generation, and Docker Compose deployment.

**Architecture:** Keep existing DailyBrief fetching, LLM, enrichment, and `renderHtml()` report output as the core engine. Add a Next.js App Router shell for public/admin pages, Prisma-backed Postgres storage, and a separate worker process for scheduled generation. Report detail pages return saved full HTML to preserve current report styling and browser behavior.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Prisma, PostgreSQL, Docker Compose, native Node crypto for admin session signing, existing TSX scripts for tests and migration utilities.

---

## File Structure

Create and modify these areas:

- `app/`: Next.js App Router pages and API routes.
- `app/admin/login/`: public admin login page.
- `app/admin/(protected)/`: password-protected admin UI route group.
- `app/reports/[date]/route.ts`: route handler returning full saved report HTML.
- `components/public/`: reusable public report shell components.
- `lib/db/`: Prisma client wrapper and database adapters.
- `lib/web/`: auth, source validation, generation service, scheduler helpers.
- `prisma/schema.prisma`: Postgres schema.
- `scripts/import-sources.ts`: imports `sources.config.json` into Postgres.
- `scripts/worker.ts`: scheduled generation loop.
- `scripts/web-smoke-test.ts`: route and data smoke checks that do not call the LLM.
- `docker-compose.yml`, `Dockerfile`, `.dockerignore`: deployment.
- `package.json`, `tsconfig.json`, `.env.example`: scripts, dependencies, and configuration.

Boundaries:

- Existing `lib/sources/*`, `lib/ai/*`, and `lib/output/render.ts` remain the core logic.
- `sources.config.json` becomes import/export compatibility data, not live runtime source of truth.
- The first version does not delete sources.

---

### Task 1: Add Next.js, Tailwind, Prisma, and Project Scripts

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `public/.gitkeep`

- [ ] **Step 1: Install web dependencies**

Run:

```bash
npm install next react react-dom @prisma/client
npm install -D prisma tailwindcss @tailwindcss/postcss autoprefixer
```

Expected: `package-lock.json` updates and install exits 0.

- [ ] **Step 2: Update `package.json` scripts**

Add these scripts while preserving existing scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "tsx scripts/render-smoke-test.ts && tsx scripts/web-smoke-test.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "sources:import": "tsx scripts/import-sources.ts",
    "worker": "tsx scripts/worker.ts"
  }
}
```

- [ ] **Step 3: Expand `tsconfig.json` includes and aliases**

Keep the existing `compilerOptions`, add `baseUrl` and `paths` inside it, and update `include`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "app/**/*.ts",
    "app/**/*.tsx",
    "components/**/*.ts",
    "components/**/*.tsx",
    "lib/**/*.ts",
    "scripts/**/*.ts",
    "scripts/**/*.mjs",
    "tailwind.config.ts"
  ]
}
```

- [ ] **Step 4: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        briefBg: "#f6f4ef",
        briefFg: "#111111",
        briefMuted: "#77746b",
      },
    },
  },
};

export default config;
```

- [ ] **Step 7: Create `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --bg: #f6f4ef;
  --fg: #111111;
  --muted: #77746b;
  --rule: rgba(20, 20, 18, 0.11);
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display",
    "SF Pro Text", "Segoe UI", "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", sans-serif;
}
```

- [ ] **Step 8: Create `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DailyBrief",
  description: "DailyBrief web reports and source management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create temporary `app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-[min(100%-2rem,1180px)] flex-col justify-center py-16">
      <p className="text-sm font-semibold text-briefMuted">DailyBrief Web</p>
      <h1 className="mt-3 text-5xl font-bold tracking-normal">今日简报</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700">
        Web shell is ready. Report and admin routes will be added in the next tasks.
      </p>
    </main>
  );
}
```

- [ ] **Step 10: Create public directory placeholder**

Run:

```bash
mkdir -p public
touch public/.gitkeep
```

- [ ] **Step 11: Verify build**

Run:

```bash
npm run build
```

Expected: Next.js production build succeeds.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts app public/.gitkeep
git commit -m "Add Next.js web shell"
```

---

### Task 2: Add Prisma Schema and Source Import

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/migrations/migration_lock.toml`
- Create: `prisma/migrations/202606030001_initial/migration.sql`
- Create: `lib/db/prisma.ts`
- Create: `lib/db/source-repository.ts`
- Create: `scripts/import-sources.ts`
- Create: `scripts/web-smoke-test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum SourceType {
  rss
  api
  scrape
}

enum Category {
  tech
  finance
  politics
}

enum Locale {
  zh
  en
}

enum ReportStatus {
  generating
  ready
  failed
}

enum RunTrigger {
  schedule
  manual
  startup
}

enum RunStatus {
  running
  success
  failed
}

model Source {
  id          String     @id
  name        String
  type        SourceType
  url         String
  category    Category
  subcategory String?
  enabled     Boolean    @default(true)
  useCurl     Boolean    @default(false)
  lang        Locale?
  locales     String[]   @default(["zh", "en"])
  keywords    String[]   @default([])
  notes       String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Report {
  id          String          @id @default(cuid())
  dateKey     String
  locale      Locale
  status      ReportStatus    @default(generating)
  reportJson  Json?
  html        String?
  summary     String?
  generatedAt DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  articles    ReportArticle[]
  runs        GenerationRun[]

  @@unique([dateKey, locale])
}

model ReportArticle {
  id          String   @id @default(cuid())
  reportId    String
  report      Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  sourceId    String
  sourceName  String
  category    Category
  title       String
  url         String
  excerpt     String?
  summary     String?
  meta        String?
  publishedAt DateTime?
  rawJson     Json?
}

model GenerationRun {
  id            String     @id @default(cuid())
  reportId      String?
  report        Report?    @relation(fields: [reportId], references: [id], onDelete: SetNull)
  dateKey       String
  locale        Locale
  trigger       RunTrigger
  status        RunStatus   @default(running)
  startedAt     DateTime    @default(now())
  finishedAt    DateTime?
  articlesCount Int?
  llmBackend    String?
  errorMessage  String?
  logExcerpt    String?
}
```

- [ ] **Step 2: Create Prisma migration lock**

`prisma/migrations/migration_lock.toml`:

```toml
provider = "postgresql"
```

- [ ] **Step 3: Create initial migration SQL**

`prisma/migrations/202606030001_initial/migration.sql`:

```sql
CREATE TYPE "SourceType" AS ENUM ('rss', 'api', 'scrape');
CREATE TYPE "Category" AS ENUM ('tech', 'finance', 'politics');
CREATE TYPE "Locale" AS ENUM ('zh', 'en');
CREATE TYPE "ReportStatus" AS ENUM ('generating', 'ready', 'failed');
CREATE TYPE "RunTrigger" AS ENUM ('schedule', 'manual', 'startup');
CREATE TYPE "RunStatus" AS ENUM ('running', 'success', 'failed');

CREATE TABLE "Source" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "SourceType" NOT NULL,
  "url" TEXT NOT NULL,
  "category" "Category" NOT NULL,
  "subcategory" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "useCurl" BOOLEAN NOT NULL DEFAULT false,
  "lang" "Locale",
  "locales" TEXT[] NOT NULL DEFAULT ARRAY['zh', 'en']::TEXT[],
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'generating',
  "reportJson" JSONB,
  "html" TEXT,
  "summary" TEXT,
  "generatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportArticle" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "category" "Category" NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "excerpt" TEXT,
  "summary" TEXT,
  "meta" TEXT,
  "publishedAt" TIMESTAMP(3),
  "rawJson" JSONB,
  CONSTRAINT "ReportArticle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationRun" (
  "id" TEXT NOT NULL,
  "reportId" TEXT,
  "dateKey" TEXT NOT NULL,
  "locale" "Locale" NOT NULL,
  "trigger" "RunTrigger" NOT NULL,
  "status" "RunStatus" NOT NULL DEFAULT 'running',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "articlesCount" INTEGER,
  "llmBackend" TEXT,
  "errorMessage" TEXT,
  "logExcerpt" TEXT,
  CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Report_dateKey_locale_key" ON "Report"("dateKey", "locale");

ALTER TABLE "ReportArticle"
  ADD CONSTRAINT "ReportArticle_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GenerationRun"
  ADD CONSTRAINT "GenerationRun_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "Report"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: Create Prisma client wrapper**

`lib/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Create source repository mapper**

`lib/db/source-repository.ts`:

```ts
import type { Source } from "@prisma/client";
import { prisma } from "./prisma";
import type { SourceDef } from "../sources/types";

export function sourceToDef(source: Source): SourceDef {
  return {
    id: source.id,
    name: source.name,
    type: source.type,
    url: source.url,
    category: source.category,
    subcategory: source.subcategory ?? undefined,
    enabled: source.enabled,
    useCurl: source.useCurl,
    lang: source.lang ?? undefined,
    locales: source.locales as ("zh" | "en")[],
    keywords: source.keywords,
    notes: source.notes ?? undefined,
  };
}

export async function listSourceDefs(): Promise<SourceDef[]> {
  const rows = await prisma.source.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] });
  return rows.map(sourceToDef);
}

export async function listEnabledSourceDefs(locale: "zh" | "en"): Promise<SourceDef[]> {
  const rows = await prisma.source.findMany({
    where: { enabled: true, locales: { has: locale } },
    orderBy: [{ category: "asc" }, { id: "asc" }],
  });
  return rows.map(sourceToDef);
}
```

- [ ] **Step 6: Create import script**

`scripts/import-sources.ts`:

```ts
import "./_env";

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db/prisma";
import type { SourceDef } from "../lib/sources/types";

function loadConfig(): SourceDef[] {
  const file = path.resolve("sources.config.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as SourceDef[];
  if (!Array.isArray(parsed)) throw new Error("sources.config.json must be an array");
  return parsed;
}

async function main() {
  const sources = loadConfig();
  for (const source of sources) {
    await prisma.source.upsert({
      where: { id: source.id },
      update: {
        name: source.name,
        type: source.type,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory ?? null,
        enabled: source.enabled ?? true,
        useCurl: source.useCurl ?? false,
        lang: source.lang ?? null,
        locales: source.locales ?? ["zh", "en"],
        keywords: source.keywords ?? [],
        notes: source.notes ?? null,
      },
      create: {
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        category: source.category,
        subcategory: source.subcategory ?? null,
        enabled: source.enabled ?? true,
        useCurl: source.useCurl ?? false,
        lang: source.lang ?? null,
        locales: source.locales ?? ["zh", "en"],
        keywords: source.keywords ?? [],
        notes: source.notes ?? null,
      },
    });
  }
  console.log(`[sources:import] imported ${sources.length} sources`);
}

main()
  .catch((error) => {
    console.error("[sources:import] FAILED", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 7: Create initial smoke test**

`scripts/web-smoke-test.ts`:

```ts
import assert from "node:assert/strict";
import fs from "node:fs";

assert.equal(fs.existsSync("prisma/schema.prisma"), true);
assert.equal(fs.existsSync("lib/db/prisma.ts"), true);
assert.equal(fs.existsSync("lib/db/source-repository.ts"), true);

console.log("[web-smoke-test] ok");
```

- [ ] **Step 8: Update `.env.example`**

Add:

```dotenv
DATABASE_URL="postgresql://dailybrief:dailybrief@localhost:5432/dailybrief?schema=public"
ADMIN_PASSWORD="change-me"
SESSION_SECRET="replace-with-a-long-random-string"
DAILY_RUN_TIME="07:30"
PRISMA_LOG="false"
```

- [ ] **Step 9: Generate Prisma client**

Run:

```bash
npm run db:generate
npm test
```

Expected: Prisma client generation succeeds and tests print `[render-smoke-test] ok` plus `[web-smoke-test] ok`.

- [ ] **Step 10: Commit**

```bash
git add prisma lib/db scripts/import-sources.ts scripts/web-smoke-test.ts package.json package-lock.json .env.example
git commit -m "Add PostgreSQL data model and source import"
```

---

### Task 3: Extract Reusable Generation Service

**Files:**
- Create: `lib/web/generation-service.ts`
- Modify: `scripts/daily.ts`
- Test: `scripts/web-smoke-test.ts`

- [ ] **Step 1: Create generation service**

`lib/web/generation-service.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import type { SourceDef } from "../sources/types";
import { fetchSource } from "../sources/dispatch";
import {
  generateDailyReport,
  type ArticleInput,
  type DailyReport,
  type TradingSection,
} from "../ai/pipeline";
import { getModelTag, validateBackendCredentials } from "../ai/llm";
import {
  enrichFinanceNewsSummaries,
  enrichGithubTrendingSummaries,
  enrichTrendingPapersSummaries,
  enrichXViralSummaries,
} from "../ai/enrich";
import {
  groupRaw,
  isSportsArticle,
  MERGED_SUBGROUP_LIMITS,
  renderHtml,
  renderMarkdown,
} from "../output/render";
import { analyzeWatchlist } from "../trading/runner";
import { fetchCryptoFearGreed } from "../trading/fear-greed";
import { fetchCryptoGlobal } from "../trading/coingecko";
import { generateTradingCommentary } from "../ai/trading-commentary";

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

async function fetchAll(sourceDefs: SourceDef[], log: (line: string) => void): Promise<ArticleInput[]> {
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
  return articles;
}

async function enrichGithub(articles: ArticleInput[], log: (line: string) => void): Promise<void> {
  const gh = articles.filter((a) => a.sourceId === "github-trending");
  if (gh.length === 0) return;
  log(`[daily] enriching ${gh.length} GitHub Trending repos with ${reportLocale()} summaries`);
  const summaries = await enrichGithubTrendingSummaries(gh);
  for (const article of gh) {
    const summary = summaries.get(article.url);
    if (summary) article.summary = summary;
  }
}

async function enrichTrendingPapers(articles: ArticleInput[], log: (line: string) => void): Promise<void> {
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

async function enrichXViral(articles: ArticleInput[], log: (line: string) => void): Promise<void> {
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

function writeCompatibilityFiles(result: GenerateDailyResult, outputDir: string, outputMarkdown: boolean): void {
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
  if (outputMarkdown && result.markdown) fs.writeFileSync(`${base}.md`, result.markdown, "utf8");
}

export async function generateDailyBrief(options: GenerateDailyOptions): Promise<GenerateDailyResult> {
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
```

- [ ] **Step 2: Replace `scripts/daily.ts` with wrapper**

```ts
import "./_env";

import { sources } from "../lib/sources/registry";
import { todayKey } from "../lib/utils";
import { generateDailyBrief } from "../lib/web/generation-service";

async function main() {
  const date = todayKey();
  const result = await generateDailyBrief({
    date,
    sources,
    outputDir: "daily_reports",
    writeFiles: true,
    outputMarkdown: process.env.OUTPUT_MARKDOWN === "true",
    includeTrading: true,
    log: console.log,
  });
  console.log(
    `[daily] wrote daily_reports/${date}/${date}.{json,html,articles.json}` +
      (result.markdown ? ", md" : ""),
  );
  console.log("[daily] done.");
}

main().catch((error) => {
  console.error("[daily] FAILED:", error);
  process.exit(1);
});
```

- [ ] **Step 3: Extend smoke test for service file**

Add to `scripts/web-smoke-test.ts`:

```ts
assert.equal(fs.existsSync("lib/web/generation-service.ts"), true);
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npx tsc --noEmit
```

Expected: both commands pass. Do not run `npm run daily` in this task because it calls external sources and LLM.

- [ ] **Step 5: Commit**

```bash
git add lib/web/generation-service.ts scripts/daily.ts scripts/web-smoke-test.ts
git commit -m "Extract reusable daily generation service"
```

---

### Task 4: Persist Generated Reports to Postgres

**Files:**
- Create: `lib/db/report-repository.ts`
- Create: `lib/web/report-persistence.ts`
- Modify: `scripts/web-smoke-test.ts`

- [ ] **Step 1: Create report repository**

`lib/db/report-repository.ts`:

```ts
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
        rawJson: {
          sourceId: article.sourceId,
          title: article.title,
          url: article.url,
          excerpt: article.excerpt ?? null,
          meta: article.meta ?? null,
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
```

- [ ] **Step 2: Create report persistence helper**

`lib/web/report-persistence.ts`:

```ts
import type { Locale } from "@prisma/client";
import type { GenerateDailyResult } from "./generation-service";
import { upsertReadyReport } from "../db/report-repository";

export function currentLocale(): Locale {
  return process.env.REPORT_LOCALE === "en" ? "en" : "zh";
}

export function reportSummary(result: GenerateDailyResult): string {
  const overview = result.report.daily_overview?.trim();
  if (overview) return overview.slice(0, 240);
  return result.report.tech_briefs[0]?.summary ?? result.report.editor_note ?? "";
}

export async function persistGenerationResult(result: GenerateDailyResult) {
  return upsertReadyReport({
    date: result.date,
    locale: currentLocale(),
    report: result.report,
    html: result.html,
    summary: reportSummary(result),
    articles: result.articles,
  });
}
```

- [ ] **Step 3: Extend smoke test**

Add:

```ts
assert.equal(fs.existsSync("lib/db/report-repository.ts"), true);
assert.equal(fs.existsSync("lib/web/report-persistence.ts"), true);
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add lib/db/report-repository.ts lib/web/report-persistence.ts scripts/web-smoke-test.ts
git commit -m "Add report persistence repository"
```

---

### Task 5: Add Public Report and Archive Routes

**Files:**
- Modify: `app/page.tsx`
- Create: `app/archive/page.tsx`
- Create: `app/reports/[date]/route.ts`
- Create: `components/public/ReportShell.tsx`

- [ ] **Step 1: Create public shell component**

`components/public/ReportShell.tsx`:

```tsx
import Link from "next/link";

export function ReportShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-10">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-black/10 pb-5">
        <Link href="/" className="text-lg font-bold">
          DailyBrief
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href="/archive">历史归档</Link>
          <Link href="/admin">管理</Link>
        </nav>
      </header>
      <h1 className="text-4xl font-bold tracking-normal">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Update home page**

`app/page.tsx`:

```tsx
import Link from "next/link";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export default async function HomePage() {
  const reports = await listReadyReports(currentLocale());
  const latest = reports[0];
  return (
    <ReportShell title="今日简报">
      {latest ? (
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6">
          <p className="text-sm text-neutral-500">最新可用报告</p>
          <h2 className="mt-2 text-2xl font-semibold">{latest.dateKey}</h2>
          {latest.summary ? <p className="mt-3 max-w-3xl leading-7 text-neutral-700">{latest.summary}</p> : null}
          <Link
            className="mt-5 inline-flex rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
            href={`/reports/${latest.dateKey}`}
          >
            打开简报
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6">
          <h2 className="text-2xl font-semibold">还没有生成简报</h2>
          <p className="mt-3 text-neutral-700">登录后台后可以手动生成第一份简报。</p>
          <Link className="mt-5 inline-flex rounded-full bg-black px-5 py-2 text-sm font-semibold text-white" href="/admin">
            进入后台
          </Link>
        </section>
      )}
    </ReportShell>
  );
}
```

- [ ] **Step 3: Create archive page**

`app/archive/page.tsx`:

```tsx
import Link from "next/link";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export default async function ArchivePage() {
  const reports = await listReadyReports(currentLocale());
  return (
    <ReportShell title="历史归档">
      <div className="grid gap-3">
        {reports.map((report) => (
          <Link
            key={report.dateKey}
            href={`/reports/${report.dateKey}`}
            className="rounded-xl border border-black/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="font-semibold">{report.dateKey}</div>
            {report.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{report.summary}</p> : null}
          </Link>
        ))}
        {reports.length === 0 ? <p className="text-neutral-600">暂无历史简报。</p> : null}
      </div>
    </ReportShell>
  );
}
```

- [ ] **Step 4: Create full HTML report route**

`app/reports/[date]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { findReportHtml } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  const html = await findReportHtml(date, currentLocale());
  if (!html) {
    return new NextResponse("Report not found", { status: 404 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
```

- [ ] **Step 5: Verify build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app components/public
git commit -m "Add public report routes"
```

---

### Task 6: Add Password Authentication

**Files:**
- Create: `lib/web/auth.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/actions.ts`
- Create: `app/admin/logout/route.ts`
- Create: `app/admin/(protected)/layout.tsx`
- Create: `app/admin/(protected)/page.tsx`
- Modify: `scripts/web-smoke-test.ts`

- [ ] **Step 1: Create auth helpers**

`lib/web/auth.ts`:

```ts
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "dailybrief_admin";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) throw new Error("SESSION_SECRET must be at least 16 characters");
  return value;
}

function adminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is required");
  return value;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const expected = Buffer.from(adminPassword());
  const actual = Buffer.from(password);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function createSessionValue(): string {
  const payload = JSON.stringify({ role: "admin", iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  return sign(encoded) === signature;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  if (!verifySessionValue(cookieStore.get(COOKIE_NAME)?.value)) {
    redirect("/admin/login");
  }
}
```

- [ ] **Step 2: Create login action**

`app/admin/login/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { setAdminSession, verifyPassword } from "@/lib/web/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin");
}
```

- [ ] **Step 3: Create login page**

`app/admin/login/page.tsx`:

```tsx
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-[min(100%-2rem,440px)] flex-col justify-center">
      <h1 className="text-4xl font-bold">后台登录</h1>
      <form action={loginAction} className="mt-8 grid gap-4 rounded-2xl border border-black/10 bg-white/70 p-6">
        <label className="grid gap-2 text-sm font-semibold">
          管理密码
          <input
            name="password"
            type="password"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-base"
            required
          />
        </label>
        {params.error ? <p className="text-sm text-red-700">密码不正确。</p> : null}
        <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">
          登录
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Create admin layout and home**

`app/admin/(protected)/layout.tsx`:

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/web/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-8">
      <header className="mb-8 flex items-center justify-between border-b border-black/10 pb-5">
        <Link href="/admin" className="text-xl font-bold">DailyBrief Admin</Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href="/admin/sources">源管理</Link>
          <Link href="/admin/runs">生成记录</Link>
          <Link href="/admin/logout">退出</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
```

`app/admin/(protected)/page.tsx`:

```tsx
export default function AdminHomePage() {
  return (
    <section>
      <h1 className="text-4xl font-bold">管理后台</h1>
      <p className="mt-4 text-neutral-700">查看源配置、生成记录，并手动触发简报生成。</p>
    </section>
  );
}
```

- [ ] **Step 5: Create logout route**

`app/admin/logout/route.ts`:

```ts
import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/web/auth";

export async function GET() {
  await clearAdminSession();
  redirect("/admin/login");
}
```

- [ ] **Step 6: Extend smoke test**

Add:

```ts
assert.equal(fs.existsSync("lib/web/auth.ts"), true);
assert.equal(fs.existsSync("app/admin/login/page.tsx"), true);
```

- [ ] **Step 7: Verify**

Run:

```bash
SESSION_SECRET=1234567890123456 ADMIN_PASSWORD=secret npm run build
npm test
```

Expected: build and tests pass.

- [ ] **Step 8: Commit**

```bash
git add lib/web/auth.ts app/admin scripts/web-smoke-test.ts
git commit -m "Add password protected admin shell"
```

---

### Task 7: Add Source Validation, Admin Source UI, and Test API

**Files:**
- Create: `lib/web/source-validation.ts`
- Create: `app/admin/(protected)/sources/actions.ts`
- Create: `app/admin/(protected)/sources/page.tsx`
- Create: `app/api/admin/sources/[id]/test/route.ts`
- Modify: `scripts/web-smoke-test.ts`

- [ ] **Step 1: Create source validation**

`lib/web/source-validation.ts`:

```ts
import type { Category, SourceDef, SourceType } from "../sources/types";

const validTypes = new Set<SourceType>(["rss", "api", "scrape"]);
const validCategories = new Set<Category>(["tech", "finance", "politics"]);

export function normalizeList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sourceFromFormData(formData: FormData): SourceDef {
  const type = String(formData.get("type")) as SourceType;
  const category = String(formData.get("category")) as Category;
  const locales = normalizeList(formData.get("locales")) as ("zh" | "en")[];
  const enabled = formData.get("enabled") === "on";
  const useCurl = formData.get("useCurl") === "on";
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    type,
    url: String(formData.get("url") ?? "").trim(),
    category,
    subcategory: String(formData.get("subcategory") ?? "").trim() || undefined,
    enabled,
    useCurl,
    lang: (String(formData.get("lang") ?? "").trim() || undefined) as "zh" | "en" | undefined,
    locales: locales.length > 0 ? locales : ["zh", "en"],
    keywords: normalizeList(formData.get("keywords")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

export function validateSource(source: SourceDef, mode: "create" | "update"): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source.id)) errors.push("id must use lowercase letters, numbers, and hyphens");
  if (!source.name) errors.push("name is required");
  if (!source.url) errors.push("url is required");
  if (!validTypes.has(source.type)) errors.push("type must be rss, api, or scrape");
  if (!validCategories.has(source.category)) errors.push("category must be tech, finance, or politics");
  if (source.locales?.some((locale) => locale !== "zh" && locale !== "en")) errors.push("locales must be zh,en, or both");
  if (mode === "create" && source.type !== "rss") errors.push("first version only supports creating RSS sources");
  return errors;
}
```

- [ ] **Step 2: Create source actions**

`app/admin/(protected)/sources/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/web/auth";
import { sourceFromFormData, validateSource } from "@/lib/web/source-validation";

export async function saveSourceAction(formData: FormData) {
  await requireAdmin();
  const mode = formData.get("mode") === "create" ? "create" : "update";
  const source = sourceFromFormData(formData);
  const errors = validateSource(source, mode);
  if (errors.length > 0) {
    redirect(`/admin/sources?error=${encodeURIComponent(errors.join("; "))}`);
  }
  if (mode === "create") {
    const existing = await prisma.source.findUnique({
      where: { id: source.id },
      select: { id: true },
    });
    if (existing) {
      redirect(`/admin/sources?error=${encodeURIComponent("id already exists")}`);
    }
  }
  await prisma.source.upsert({
    where: { id: source.id },
    update: {
      name: source.name,
      type: source.type,
      url: source.url,
      category: source.category,
      subcategory: source.subcategory ?? null,
      enabled: source.enabled ?? true,
      useCurl: source.useCurl ?? false,
      lang: source.lang ?? null,
      locales: source.locales ?? ["zh", "en"],
      keywords: source.keywords ?? [],
      notes: source.notes ?? null,
    },
    create: {
      id: source.id,
      name: source.name,
      type: source.type,
      url: source.url,
      category: source.category,
      subcategory: source.subcategory ?? null,
      enabled: source.enabled ?? true,
      useCurl: source.useCurl ?? false,
      lang: source.lang ?? null,
      locales: source.locales ?? ["zh", "en"],
      keywords: source.keywords ?? [],
      notes: source.notes ?? null,
    },
  });
  redirect("/admin/sources");
}
```

- [ ] **Step 3: Create source management page**

`app/admin/(protected)/sources/page.tsx`:

```tsx
import { prisma } from "@/lib/db/prisma";
import { saveSourceAction } from "./actions";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, sources] = await Promise.all([
    searchParams,
    prisma.source.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] }),
  ]);
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">源管理</h1>
          <p className="mt-2 text-neutral-700">新增 RSS 源，编辑已有源，启停并测试抓取结果。</p>
        </div>
      </div>
      {params.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {sources.map((source) => (
            <form key={source.id} action={saveSourceAction} className="grid gap-3 rounded-2xl border border-black/10 bg-white/70 p-4">
              <input type="hidden" name="mode" value="update" />
              <input type="hidden" name="id" value={source.id} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{source.name}</p>
                  <p className="truncate text-xs text-neutral-500">{source.id} · {source.type} · {source.category}</p>
                </div>
                <a className="shrink-0 text-sm font-semibold underline" href={`/api/admin/sources/${source.id}/test`} target="_blank">
                  测试
                </a>
              </div>
              <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-lg border px-3 py-2" defaultValue={source.name} required /></label>
              <input type="hidden" name="type" value={source.type} />
              <label className="grid gap-1 text-sm font-semibold">URL<input name="url" className="rounded-lg border px-3 py-2" defaultValue={source.url} required /></label>
              <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-lg border px-3 py-2" defaultValue={source.category}><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
              <label className="grid gap-1 text-sm font-semibold">子分类<input name="subcategory" className="rounded-lg border px-3 py-2" defaultValue={source.subcategory ?? ""} /></label>
              <label className="grid gap-1 text-sm font-semibold">Locales<input name="locales" className="rounded-lg border px-3 py-2" defaultValue={source.locales.join(",")} /></label>
              <label className="grid gap-1 text-sm font-semibold">关键词<input name="keywords" className="rounded-lg border px-3 py-2" defaultValue={source.keywords.join(",")} /></label>
              <label className="grid gap-1 text-sm font-semibold">语言<select name="lang" className="rounded-lg border px-3 py-2" defaultValue={source.lang ?? ""}><option value="">默认英文</option><option value="zh">中文</option><option value="en">英文</option></select></label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked={source.enabled} /> 启用</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input name="useCurl" type="checkbox" defaultChecked={source.useCurl} /> 使用 curl</label>
              <label className="grid gap-1 text-sm font-semibold">备注<textarea name="notes" className="rounded-lg border px-3 py-2" defaultValue={source.notes ?? ""} /></label>
              <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">保存修改</button>
            </form>
          ))}
        </div>

        <form action={saveSourceAction} className="grid gap-3 rounded-2xl border border-black/10 bg-white/70 p-5">
          <input type="hidden" name="mode" value="create" />
          <h2 className="text-xl font-semibold">新增 RSS 源</h2>
          <label className="grid gap-1 text-sm font-semibold">ID<input name="id" className="rounded-lg border px-3 py-2" required /></label>
          <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-lg border px-3 py-2" required /></label>
          <input type="hidden" name="type" value="rss" />
          <label className="grid gap-1 text-sm font-semibold">URL<input name="url" type="url" className="rounded-lg border px-3 py-2" required /></label>
          <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-lg border px-3 py-2" defaultValue="tech"><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
          <label className="grid gap-1 text-sm font-semibold">子分类<input name="subcategory" className="rounded-lg border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm font-semibold">Locales<input name="locales" className="rounded-lg border px-3 py-2" defaultValue="zh,en" /></label>
          <label className="grid gap-1 text-sm font-semibold">关键词<input name="keywords" className="rounded-lg border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked /> 启用</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="useCurl" type="checkbox" /> 使用 curl</label>
          <label className="grid gap-1 text-sm font-semibold">备注<textarea name="notes" className="rounded-lg border px-3 py-2" /></label>
          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">保存</button>
        </form>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create source test route**

`app/api/admin/sources/[id]/test/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sourceToDef } from "@/lib/db/source-repository";
import { fetchSource } from "@/lib/sources/dispatch";
import { requireAdmin } from "@/lib/web/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await context.params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 });
  try {
    const items = await fetchSource(sourceToDef(source));
    return NextResponse.json({
      ok: true,
      count: items.length,
      samples: items.slice(0, 5).map((item) => ({ title: item.title, url: item.url })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: Extend smoke test**

Add:

```ts
assert.equal(fs.existsSync("lib/web/source-validation.ts"), true);
assert.equal(fs.existsSync("app/admin/(protected)/sources/page.tsx"), true);
```

- [ ] **Step 6: Verify**

Run:

```bash
SESSION_SECRET=1234567890123456 ADMIN_PASSWORD=secret npm run build
npm test
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add lib/web/source-validation.ts app/admin app/api/admin/sources scripts/web-smoke-test.ts
git commit -m "Add source management admin UI"
```

---

### Task 8: Add Generation Runs, Manual Trigger, and Worker Scheduler

**Files:**
- Create: `lib/web/run-service.ts`
- Create: `app/admin/(protected)/runs/actions.ts`
- Create: `app/admin/(protected)/runs/page.tsx`
- Create: `scripts/worker.ts`
- Modify: `scripts/web-smoke-test.ts`

- [ ] **Step 1: Create run service**

`lib/web/run-service.ts`:

```ts
import type { Locale, RunTrigger } from "@prisma/client";
import { prisma } from "../db/prisma";
import { listEnabledSourceDefs } from "../db/source-repository";
import { generateDailyBrief } from "./generation-service";
import { persistGenerationResult } from "./report-persistence";

let inProcess = false;

export async function runGeneration(input: {
  date: string;
  locale: Locale;
  trigger: RunTrigger;
}): Promise<void> {
  if (inProcess) throw new Error("generation already running in this process");
  inProcess = true;
  const run = await prisma.generationRun.create({
    data: { dateKey: input.date, locale: input.locale, trigger: input.trigger, status: "running" },
  });
  const logLines: string[] = [];
  try {
    const sources = await listEnabledSourceDefs(input.locale);
    const result = await generateDailyBrief({
      date: input.date,
      sources,
      writeFiles: true,
      outputMarkdown: process.env.OUTPUT_MARKDOWN === "true",
      includeTrading: true,
      log: (line) => logLines.push(line),
    });
    const report = await persistGenerationResult(result);
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        reportId: report.id,
        status: "success",
        finishedAt: new Date(),
        articlesCount: result.articles.length,
        llmBackend: process.env.LLM_BACKEND ?? "claude-cli",
        logExcerpt: logLines.slice(-40).join("\n"),
      },
    });
  } catch (error) {
    await prisma.generationRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
        logExcerpt: logLines.slice(-40).join("\n"),
      },
    });
    throw error;
  } finally {
    inProcess = false;
  }
}
```

- [ ] **Step 2: Create run action**

`app/admin/(protected)/runs/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { todayKey } from "@/lib/utils";
import { requireAdmin } from "@/lib/web/auth";
import { currentLocale } from "@/lib/web/report-persistence";
import { runGeneration } from "@/lib/web/run-service";

export async function runTodayAction() {
  await requireAdmin();
  await runGeneration({ date: todayKey(), locale: currentLocale(), trigger: "manual" });
  redirect("/admin/runs");
}
```

- [ ] **Step 3: Create runs page**

`app/admin/(protected)/runs/page.tsx`:

```tsx
import { prisma } from "@/lib/db/prisma";
import { runTodayAction } from "./actions";

export default async function RunsPage() {
  const runs = await prisma.generationRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 });
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">生成记录</h1>
          <p className="mt-2 text-neutral-700">查看计划任务和手动生成结果。</p>
        </div>
        <form action={runTodayAction}>
          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">
            生成今日简报
          </button>
        </form>
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
        {runs.map((run) => (
          <div key={run.id} className="grid gap-1 border-b border-black/10 p-4 last:border-b-0">
            <div className="flex justify-between gap-4">
              <p className="font-semibold">{run.dateKey} · {run.trigger}</p>
              <p className="text-sm">{run.status}</p>
            </div>
            {run.errorMessage ? <p className="text-sm text-red-700">{run.errorMessage}</p> : null}
            {run.logExcerpt ? <pre className="max-h-40 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">{run.logExcerpt}</pre> : null}
          </div>
        ))}
        {runs.length === 0 ? <p className="p-4 text-neutral-600">暂无生成记录。</p> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create worker loop**

`scripts/worker.ts`:

```ts
import "./_env";

import { todayKey } from "../lib/utils";
import { currentLocale } from "../lib/web/report-persistence";
import { runGeneration } from "../lib/web/run-service";

function parseRunTime(): { hour: number; minute: number } {
  const [hourText, minuteText] = (process.env.DAILY_RUN_TIME ?? "07:30").split(":");
  return { hour: Number(hourText), minute: Number(minuteText) };
}

function msUntilNextRun(): number {
  const now = new Date();
  const { hour, minute } = parseRunTime();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function runOnce() {
  const date = todayKey();
  console.log(`[worker] generating ${date}`);
  await runGeneration({ date, locale: currentLocale(), trigger: "schedule" });
  console.log(`[worker] generated ${date}`);
}

function scheduleNext() {
  const delay = msUntilNextRun();
  console.log(`[worker] next run in ${(delay / 1000 / 60).toFixed(1)} minutes`);
  setTimeout(async () => {
    try {
      await runOnce();
    } catch (error) {
      console.error("[worker] generation failed", error);
    } finally {
      scheduleNext();
    }
  }, delay);
}

scheduleNext();
```

- [ ] **Step 5: Extend smoke test**

Add:

```ts
assert.equal(fs.existsSync("lib/web/run-service.ts"), true);
assert.equal(fs.existsSync("scripts/worker.ts"), true);
assert.equal(fs.existsSync("app/admin/(protected)/runs/page.tsx"), true);
```

- [ ] **Step 6: Verify**

Run:

```bash
SESSION_SECRET=1234567890123456 ADMIN_PASSWORD=secret npm run build
npm test
```

Expected: pass. Do not click manual generation unless DeepSeek usage is intended.

- [ ] **Step 7: Commit**

```bash
git add lib/web/run-service.ts app/admin scripts/worker.ts scripts/web-smoke-test.ts
git commit -m "Add generation run management and worker"
```

---

### Task 9: Add Docker Compose Deployment

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Modify: `README.md`

- [ ] **Step 1: Create `.dockerignore`**

```dockerignore
node_modules
.next
.git
daily_reports
logs
.env
.env.local
.superpowers
.omx
```

- [ ] **Step 2: Create `Dockerfile`**

```Dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/sources.config.json ./sources.config.json
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dailybrief
      POSTGRES_PASSWORD: dailybrief
      POSTGRES_DB: dailybrief
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  web:
    build: .
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://dailybrief:dailybrief@postgres:5432/dailybrief?schema=public
      LLM_BACKEND: deepseek
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      REPORT_LOCALE: ${REPORT_LOCALE:-zh}
      REPORT_TZ: ${REPORT_TZ:-Asia/Shanghai}
      TZ: ${REPORT_TZ:-Asia/Shanghai}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      DAILY_RUN_TIME: ${DAILY_RUN_TIME:-07:30}
    volumes:
      - ./daily_reports:/app/daily_reports
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    command: sh -c "npm run db:deploy && npm run sources:import && npm run start"

  worker:
    build: .
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://dailybrief:dailybrief@postgres:5432/dailybrief?schema=public
      LLM_BACKEND: deepseek
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      REPORT_LOCALE: ${REPORT_LOCALE:-zh}
      REPORT_TZ: ${REPORT_TZ:-Asia/Shanghai}
      TZ: ${REPORT_TZ:-Asia/Shanghai}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      DAILY_RUN_TIME: ${DAILY_RUN_TIME:-07:30}
    volumes:
      - ./daily_reports:/app/daily_reports
      - ./logs:/app/logs
    command: sh -c "npm run db:deploy && npm run sources:import && npm run worker"

volumes:
  pg_data:
```

- [ ] **Step 4: Add README deployment section**

Append:

```md
## Web Deployment

DailyBrief can run as a Docker Compose web service.

Required environment:

- `DEEPSEEK_API_KEY`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `REPORT_LOCALE`
- `REPORT_TZ`
- `DAILY_RUN_TIME`

Start locally:

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

The web service imports `sources.config.json` into PostgreSQL on startup. Public reports are available without login. Admin pages under `/admin` require `ADMIN_PASSWORD`.
```

- [ ] **Step 5: Verify build artifacts**

Run:

```bash
npm run build
docker compose config
```

Expected: Next build succeeds and Compose config validates.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml README.md
git commit -m "Add Docker Compose deployment"
```

---

### Task 10: Final Verification and Deployment Readiness

**Files:**
- Modify: `scripts/web-smoke-test.ts`
- Modify: `README.md`

- [ ] **Step 1: Expand `scripts/web-smoke-test.ts` final checks**

Ensure it contains:

```ts
import assert from "node:assert/strict";
import fs from "node:fs";

const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/archive/page.tsx",
  "app/reports/[date]/route.ts",
  "app/admin/(protected)/page.tsx",
  "app/admin/login/page.tsx",
  "app/admin/(protected)/sources/page.tsx",
  "app/admin/(protected)/runs/page.tsx",
  "lib/db/prisma.ts",
  "lib/db/source-repository.ts",
  "lib/db/report-repository.ts",
  "lib/web/auth.ts",
  "lib/web/generation-service.ts",
  "lib/web/report-persistence.ts",
  "lib/web/run-service.ts",
  "lib/web/source-validation.ts",
  "prisma/schema.prisma",
  "Dockerfile",
  "docker-compose.yml",
];

for (const file of requiredFiles) {
  assert.equal(fs.existsSync(file), true, `${file} should exist`);
}

console.log("[web-smoke-test] ok");
```

- [ ] **Step 2: Run local checks**

Run:

```bash
npm test
npx tsc --noEmit
SESSION_SECRET=1234567890123456 ADMIN_PASSWORD=secret npm run build
```

Expected: all pass.

- [ ] **Step 3: Run database check with Docker**

Run:

```bash
docker compose up -d postgres
DATABASE_URL="postgresql://dailybrief:dailybrief@localhost:5432/dailybrief?schema=public" npm run db:deploy
DATABASE_URL="postgresql://dailybrief:dailybrief@localhost:5432/dailybrief?schema=public" npm run sources:import
```

Expected: migrations deploy and sources import succeeds.

- [ ] **Step 4: Run web locally**

Run:

```bash
DATABASE_URL="postgresql://dailybrief:dailybrief@localhost:5432/dailybrief?schema=public" \
SESSION_SECRET=1234567890123456 \
ADMIN_PASSWORD=secret \
LLM_BACKEND=deepseek \
DEEPSEEK_API_KEY=dummy \
npm run dev
```

Expected: `http://localhost:3000`, `/archive`, `/admin/login`, and `/admin/sources` load. Do not trigger generation with dummy key.

- [ ] **Step 5: Commit final verification docs**

```bash
git add scripts/web-smoke-test.ts README.md
git commit -m "Document web verification workflow"
```

---

## Execution Notes

- Do not run LLM-backed generation unless the user explicitly approves consuming DeepSeek quota.
- Keep report detail rendering as full HTML response in version one.
- Keep source deletion out of scope.
- Keep existing CLI scripts usable.
- Commit after every task so broad migration remains reviewable and rollback-friendly.

## Self-Review

- Spec coverage: covered public `/`, `/archive`, `/reports/[date]`, password admin, source management, source testing, generation runs, worker scheduling, Postgres persistence, Docker Compose deployment, and `daily_reports/` compatibility.
- Non-goals preserved: no generated report redesign, no source deletion, no multi-user roles, no LLM backend replacement, and no shelling out from Next.js pages.
- Placeholder scan: checked for planning placeholder phrases, vague validation/error wording, old admin paths, and stale Docker standalone config; no matches remain.
- Type/path consistency: Prisma enum values match existing source categories and locales; admin protected routes consistently live under `app/admin/(protected)`; report lookup uses Prisma's `dateKey_locale` unique key; Docker uses `next start` with a non-standalone Next config.
