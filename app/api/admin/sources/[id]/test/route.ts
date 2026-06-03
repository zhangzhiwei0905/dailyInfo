import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sourceToDef } from "@/lib/db/source-repository";
import { fetchSource } from "@/lib/sources/dispatch";
import { requireAdmin } from "@/lib/web/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await context.params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "source not found" }, { status: 404 });
  try {
    const items = await fetchSource(sourceToDef(source));
    return NextResponse.json({
      ok: true,
      count: items.length,
      samples: items.slice(0, 5).map((item) => ({ title: item.title, url: item.url })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
