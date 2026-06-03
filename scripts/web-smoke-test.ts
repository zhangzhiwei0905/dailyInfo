import assert from "node:assert/strict";
import fs from "node:fs";

const requiredFiles = [
  "app/layout.tsx",
  "app/page.tsx",
  "app/globals.css",
  "app/archive/page.tsx",
  "app/reports/[date]/route.ts",
  "app/admin/(protected)/page.tsx",
  "app/admin/login/page.tsx",
  "app/admin/(protected)/sources/page.tsx",
  "app/admin/(protected)/runs/page.tsx",
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

const sourceActions = fs.readFileSync("app/admin/(protected)/sources/actions.ts", "utf8");
assert.match(sourceActions, /export async function testSourceAction/);

const sourcesPage = fs.readFileSync("app/admin/(protected)/sources/page.tsx", "utf8");
assert.equal(sourcesPage.includes('target="_blank"'), false);
assert.match(sourcesPage, /<details/);

const sourceTestRoute = fs.readFileSync("app/api/admin/sources/[id]/test/route.ts", "utf8");
assert.equal(sourceTestRoute.includes("requireAdmin"), false);
assert.match(sourceTestRoute, /status: 401/);

console.log("[web-smoke-test] ok");
