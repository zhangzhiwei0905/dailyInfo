import { prisma } from "@/lib/db/prisma";
import { hasAdminSession } from "@/lib/web/auth";
import { sourceFromFormData, validateSource } from "@/lib/web/source-validation";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

function sourcesPath(message: string) {
  return `/admin/sources?${new URLSearchParams({ error: message }).toString()}`;
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return redirectTo("/admin/login");
  }

  const formData = await request.formData();
  const mode = formData.get("mode") === "create" ? "create" : "update";
  const source = sourceFromFormData(formData);
  const errors = validateSource(source, mode);
  if (errors.length > 0) {
    return redirectTo(sourcesPath(errors.join("; ")));
  }

  if (mode === "create") {
    const existing = await prisma.source.findUnique({
      where: { id: source.id },
      select: { id: true },
    });
    if (existing) {
      return redirectTo(sourcesPath("id already exists"));
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

  return redirectTo("/admin/sources");
}
