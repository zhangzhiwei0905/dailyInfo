import assert from "node:assert/strict";
import fs from "node:fs";

assert.equal(fs.existsSync("app/layout.tsx"), true);
assert.equal(fs.existsSync("app/page.tsx"), true);
assert.equal(fs.existsSync("app/globals.css"), true);
assert.equal(fs.existsSync("app/archive/page.tsx"), true);
assert.equal(fs.existsSync("app/reports/[date]/route.ts"), true);
assert.equal(fs.existsSync("components/public/ReportShell.tsx"), true);
assert.equal(fs.existsSync("next.config.mjs"), true);
assert.equal(fs.existsSync("postcss.config.mjs"), true);
assert.equal(fs.existsSync("tailwind.config.ts"), true);
assert.equal(fs.existsSync("prisma/schema.prisma"), true);
assert.equal(fs.existsSync("lib/db/prisma.ts"), true);
assert.equal(fs.existsSync("lib/db/source-repository.ts"), true);
assert.equal(fs.existsSync("lib/web/generation-service.ts"), true);
assert.equal(fs.existsSync("lib/db/report-repository.ts"), true);
assert.equal(fs.existsSync("lib/web/report-persistence.ts"), true);
assert.equal(fs.existsSync("lib/web/auth.ts"), true);
assert.equal(fs.existsSync("app/admin/login/page.tsx"), true);
assert.equal(fs.existsSync("lib/web/source-validation.ts"), true);
assert.equal(fs.existsSync("app/admin/(protected)/sources/page.tsx"), true);

console.log("[web-smoke-test] ok");
