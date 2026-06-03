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
