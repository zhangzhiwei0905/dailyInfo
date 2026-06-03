import assert from "node:assert/strict";
import fs from "node:fs";

type SourceConfig = {
  id: string;
  name: string;
  category: "tech" | "finance" | "politics";
  subcategory?: string;
  enabled?: boolean;
  lang?: "zh" | "en";
  locales?: string[];
};

const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/archive/page.tsx",
  "app/report/route.ts",
  "app/reports/[date]/route.ts",
  "app/admin/(protected)/page.tsx",
  "app/admin/login/page.tsx",
  "app/admin/login/submit/route.ts",
  "app/admin/(protected)/sources/page.tsx",
  "app/admin/(protected)/sources/save/route.ts",
  "app/admin/(protected)/sources/test/route.ts",
  "app/admin/(protected)/sources/toggle/route.ts",
  "app/admin/(protected)/sources/delete/route.ts",
  "components/admin/SourceEnabledToggle.tsx",
  "app/admin/(protected)/runs/page.tsx",
  "app/admin/(protected)/runs/today/route.ts",
  "components/public/ReportShell.tsx",
  "next.config.mjs",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "prisma/schema.prisma",
  "lib/db/prisma.ts",
  "lib/db/source-repository.ts",
  "lib/db/report-repository.ts",
  "lib/web/auth.ts",
  "lib/web/generation-service.ts",
  "lib/web/report-persistence.ts",
  "lib/web/run-service.ts",
  "lib/web/source-validation.ts",
  "scripts/worker.ts",
  "Dockerfile",
  "docker-compose.yml",
  ".dockerignore",
];

for (const file of requiredFiles) {
  assert.equal(fs.existsSync(file), true, `${file} should exist`);
}

const loginPage = fs.readFileSync("app/admin/login/page.tsx", "utf8");
assert.match(loginPage, /action="\/admin\/login\/submit"/);
assert.match(loginPage, /headers/);
assert.match(loginPage, /hasAdminSession/);
assert.match(loginPage, /canonicalizeLocalhost/);
assert.equal(loginPage.includes("loginAction"), false);

const reportShell = fs.readFileSync("components/public/ReportShell.tsx", "utf8");
assert.match(reportShell, /href: "\/"/);
assert.match(reportShell, /href: "\/report"/);
assert.match(reportShell, /href: "\/archive"/);
assert.match(reportShell, /href: "\/admin"/);

const latestReportRoute = fs.readFileSync("app/report/route.ts", "utf8");
assert.match(latestReportRoute, /listReadyReports/);
assert.match(latestReportRoute, /\/reports\/\$\{latest\.dateKey\}/);

const sourcesPage = fs.readFileSync("app/admin/(protected)/sources/page.tsx", "utf8");
assert.equal(sourcesPage.includes('target="_blank"'), false);
assert.match(sourcesPage, /<details/);
assert.match(sourcesPage, /categoryFilter/);
assert.match(sourcesPage, /name="category"/);
assert.match(sourcesPage, /全部分类/);
assert.match(sourcesPage, /action="\/admin\/sources\/delete"/);
assert.match(sourcesPage, /删除源/);
assert.match(sourcesPage, /action="\/admin\/sources\/save"/);
assert.match(sourcesPage, /action="\/admin\/sources\/test"/);
assert.match(sourcesPage, /SourceEnabledToggle/);
assert.equal(sourcesPage.includes("saveSourceAction"), false);
assert.equal(sourcesPage.includes("testSourceAction"), false);

const sourceToggleComponent = fs.readFileSync("components/admin/SourceEnabledToggle.tsx", "utf8");
assert.match(sourceToggleComponent, /"use client"/);
assert.match(sourceToggleComponent, /action="\/admin\/sources\/toggle"/);
assert.match(sourceToggleComponent, /peer-checked/);
assert.match(sourceToggleComponent, /fetch\("\/admin\/sources\/toggle"/);
assert.match(sourceToggleComponent, /FormData/);
assert.match(sourceToggleComponent, /x-dailybrief-async/);
assert.equal(sourceToggleComponent.includes("requestSubmit"), false);

const sourceToggleRoute = fs.readFileSync("app/admin/(protected)/sources/toggle/route.ts", "utf8");
assert.match(sourceToggleRoute, /x-dailybrief-async/);
assert.match(sourceToggleRoute, /Response\.json/);
assert.match(sourceToggleRoute, /redirectTo\("\/admin\/sources"\)/);

const sourceDeleteRoute = fs.readFileSync("app/admin/(protected)/sources/delete/route.ts", "utf8");
assert.match(sourceDeleteRoute, /hasAdminSession/);
assert.match(sourceDeleteRoute, /prisma\.source\.delete/);
assert.match(sourceDeleteRoute, /source not found/);

const generationService = fs.readFileSync("lib/web/generation-service.ts", "utf8");
assert.match(generationService, /enrichMissingArticleSummaries/);
assert.match(generationService, /summaryBatchSize/);
assert.match(generationService, /articles\.filter\(\(article\) => !article\.summary/);
assert.match(generationService, /fallbackArticleSummary/);
assert.match(generationService, /retrying article summaries one by one/);

const enrichSource = fs.readFileSync("lib/ai/enrich.ts", "utf8");
assert.match(enrichSource, /enrichArticleSummaries/);
assert.match(enrichSource, /GENERAL_ARTICLE_SYSTEM_PROMPT_ZH/);
assert.match(enrichSource, /GENERAL_ARTICLE_SYSTEM_PROMPT_EN/);

const sourceConfig = JSON.parse(fs.readFileSync("sources.config.json", "utf8")) as SourceConfig[];
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
assert.equal(
  packageJson.scripts?.["db:seed"],
  "tsx scripts/import-sources.ts",
  "db:seed should initialize the 9 source registry from sources.config.json",
);
assert.equal(
  packageJson.scripts?.["sources:import"],
  packageJson.scripts?.["db:seed"],
  "sources:import and db:seed should share the same source initialization path",
);
assert.equal(sourceConfig.length, 9, "sources.config.json should only keep the 9 active sources");
assert.equal(
  sourceConfig.some((source) => source.id === "juejin"),
  false,
  "sources.config.json should not include the unstable juejin feed",
);
for (const stalePoliticsSource of ["peoples-daily", "people-world", "xinhua-politics"]) {
  assert.equal(
    sourceConfig.some((source) => source.id === stalePoliticsSource),
    false,
    `${stalePoliticsSource} should not remain because it returns stale or undated politics articles`,
  );
}
for (const staleFinanceSource of ["people-finance", "xinhua-finance", "wsj-markets"]) {
  assert.equal(
    sourceConfig.some((source) => source.id === staleFinanceSource),
    false,
    `${staleFinanceSource} should not remain because it returns stale or undated finance articles`,
  );
}
assert.equal(
  sourceConfig.filter((source) => source.enabled === false).length,
  0,
  "sources.config.json should not keep disabled sources",
);
for (const category of ["tech", "finance", "politics"] as const) {
  const enabled = sourceConfig.filter((source) => source.category === category && source.enabled !== false);
  const zhEnabled = enabled.filter((source) => source.lang === "zh" || source.locales?.includes("zh"));
  assert.equal(enabled.length, 3, `${category} should have exactly 3 enabled sources`);
  assert.ok(zhEnabled.length >= 2, `${category} should have at least 2 Chinese-capable enabled sources`);
  for (const source of enabled) {
    assert.ok(source.subcategory, `${source.id} should have a subcategory for rendering`);
  }
}

const runsPage = fs.readFileSync("app/admin/(protected)/runs/page.tsx", "utf8");
assert.match(runsPage, /action="\/admin\/runs\/today"/);
assert.match(runsPage, /name="date"/);
assert.match(runsPage, /type="date"/);
assert.match(runsPage, /生成指定日期简报/);
assert.equal(runsPage.includes("runTodayAction"), false);

const runTodayRoute = fs.readFileSync("app/admin/(protected)/runs/today/route.ts", "utf8");
assert.match(runTodayRoute, /startManualGeneration/);
assert.match(runTodayRoute, /formData/);
assert.match(runTodayRoute, /parseGenerationDate/);
assert.equal(runTodayRoute.includes("await runGeneration"), false);

const pipelineSource = fs.readFileSync("lib/ai/pipeline.ts", "utf8");
assert.match(pipelineSource, /ensureTopicOverviews/);
assert.match(pipelineSource, /fallbackTopicSummary/);

const adminLayout = fs.readFileSync("app/admin/(protected)/layout.tsx", "utf8");
assert.equal(adminLayout.includes('href="/admin/logout"'), false);
assert.match(adminLayout, /href: "\/"/);
assert.match(adminLayout, /href: "\/report"/);
assert.match(adminLayout, /href: "\/admin\/sources"/);
assert.match(adminLayout, /href: "\/admin\/runs"/);
assert.match(adminLayout, /action="\/admin\/logout"/);
assert.match(adminLayout, /method="post"/);

const adminHome = fs.readFileSync("app/admin/(protected)/page.tsx", "utf8");
assert.match(adminHome, /href="\/admin\/sources"/);
assert.match(adminHome, /href="\/admin\/runs"/);
assert.match(adminHome, /源管理/);
assert.match(adminHome, /生成记录/);

const logoutRoute = fs.readFileSync("app/admin/logout/route.ts", "utf8");
assert.equal(logoutRoute.includes("export async function GET"), false);
assert.match(logoutRoute, /export async function POST/);

const sourceTestRoute = fs.readFileSync("app/api/admin/sources/[id]/test/route.ts", "utf8");
assert.equal(sourceTestRoute.includes("requireAdmin"), false);
assert.match(sourceTestRoute, /status: 401/);

for (const routeFile of [
  "app/admin/login/submit/route.ts",
  "app/admin/(protected)/sources/save/route.ts",
  "app/admin/(protected)/sources/test/route.ts",
  "app/admin/(protected)/sources/toggle/route.ts",
  "app/admin/(protected)/sources/delete/route.ts",
  "app/admin/(protected)/runs/today/route.ts",
]) {
  const routeSource = fs.readFileSync(routeFile, "utf8");
  assert.match(routeSource, /Location: path/);
  assert.equal(routeSource.includes("new URL(path, request.url)"), false);
}

const authSource = fs.readFileSync("lib/web/auth.ts", "utf8");
assert.match(authSource, /ADMIN_COOKIE_SECURE/);
assert.match(authSource, /dailybrief_admin_v2/);
assert.equal(authSource.includes('secure: process.env.NODE_ENV === "production"'), false);

const loginSubmitRoute = fs.readFileSync("app/admin/login/submit/route.ts", "utf8");
assert.match(loginSubmitRoute, /canonicalizeLocalhost/);

const authHostSource = fs.readFileSync("lib/web/admin-host.ts", "utf8");
assert.match(authHostSource, /localhost/);
assert.match(authHostSource, /127\.0\.0\.1/);
assert.match(authHostSource, /0\.0\.0\.0/);
assert.match(authHostSource, /\[::1\]/);

console.log("[web-smoke-test] ok");
