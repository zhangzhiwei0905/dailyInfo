"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { sourceToDef } from "@/lib/db/source-repository";
import { fetchSource } from "@/lib/sources/dispatch";
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

export async function testSourceAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) {
    redirect(`/admin/sources?error=${encodeURIComponent("source not found")}`);
  }

  try {
    const items = await fetchSource(sourceToDef(source));
    const sample = items[0]?.title ? ` · ${items[0].title.slice(0, 60)}` : "";
    redirect(`/admin/sources?tested=${encodeURIComponent(`${source.name}: ${items.length} 条${sample}`)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(`/admin/sources?error=${encodeURIComponent(`${source.name}: ${message}`)}`);
  }
}
