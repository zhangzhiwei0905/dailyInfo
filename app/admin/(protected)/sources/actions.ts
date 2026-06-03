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
