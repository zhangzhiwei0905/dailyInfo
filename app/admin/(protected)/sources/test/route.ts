import { prisma } from "@/lib/db/prisma";
import { sourceToDef } from "@/lib/db/source-repository";
import { fetchSource } from "@/lib/sources/dispatch";
import { hasAdminSession } from "@/lib/web/auth";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

function sourcesPath(key: "error" | "tested", value: string) {
  return `/admin/sources?${new URLSearchParams({ [key]: value }).toString()}`;
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return redirectTo("/admin/login");
  }

  const formData = await request.formData();
  const id = String(formData.get("id") ?? "");
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) {
    return redirectTo(sourcesPath("error", "source not found"));
  }

  try {
    const items = await fetchSource(sourceToDef(source));
    const sample = items[0]?.title ? ` · ${items[0].title.slice(0, 60)}` : "";
    return redirectTo(sourcesPath("tested", `${source.name}: ${items.length} 条${sample}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return redirectTo(sourcesPath("error", `${source.name}: ${message}`));
  }
}
