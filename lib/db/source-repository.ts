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
  const rows = await prisma.source.findMany({
    orderBy: [{ category: "asc" }, { id: "asc" }],
  });
  return rows.map(sourceToDef);
}

export async function listEnabledSourceDefs(locale: "zh" | "en"): Promise<SourceDef[]> {
  const rows = await prisma.source.findMany({
    where: { enabled: true, locales: { has: locale } },
    orderBy: [{ category: "asc" }, { id: "asc" }],
  });
  return rows.map(sourceToDef);
}
