import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

function redirectTo(path: string): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: path },
  });
}

export async function GET() {
  const [latest] = await listReadyReports(currentLocale());
  if (!latest) {
    return redirectTo("/");
  }
  return redirectTo(`/report/${latest.dateKey}`);
}
