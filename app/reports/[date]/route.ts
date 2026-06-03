import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  return NextResponse.redirect(new URL(`/report/${date}`, request.url));
}
