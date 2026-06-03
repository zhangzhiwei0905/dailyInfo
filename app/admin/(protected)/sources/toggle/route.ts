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

function isAsyncRequest(request: Request) {
  return request.headers.get("x-dailybrief-async") === "1";
}

function asyncError(message: string, status: number) {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    if (isAsyncRequest(request)) {
      return asyncError("unauthorized", 401);
    }
    return redirectTo("/admin/login");
  }

  const asyncRequest = isAsyncRequest(request);
  const formData = await request.formData();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "on";
  if (!id) {
    if (asyncRequest) {
      return asyncError("source id is required", 400);
    }
    return redirectTo(sourcesPath("source id is required"));
  }

  try {
    await prisma.source.update({
      where: { id },
      data: { enabled },
    });
    if (asyncRequest) {
      return Response.json({ ok: true, enabled });
    }
    return redirectTo("/admin/sources");
  } catch {
    if (asyncRequest) {
      return asyncError("source not found", 404);
    }
    return redirectTo(sourcesPath("source not found"));
  }
}
