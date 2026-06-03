import { NextResponse } from "next/server";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const [latest] = await listReadyReports(currentLocale());
  if (!latest) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL(`/reports/${latest.dateKey}`, request.url));
}
