import { prisma } from "@/lib/db/prisma";
import { hasAdminSession } from "@/lib/web/auth";

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
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return redirectTo(sourcesPath("source id is required"));
  }

  try {
    await prisma.source.delete({ where: { id } });
    return redirectTo("/admin/sources");
  } catch {
    return redirectTo(sourcesPath("source not found"));
  }
}
