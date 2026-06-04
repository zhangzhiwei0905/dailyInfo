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
