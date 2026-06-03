import { NextResponse } from "next/server";
import { findReportHtml } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  const html = await findReportHtml(date, currentLocale());
  if (!html) {
    return new NextResponse("Report not found", { status: 404 });
  }
  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
