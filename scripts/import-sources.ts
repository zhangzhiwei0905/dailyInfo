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
