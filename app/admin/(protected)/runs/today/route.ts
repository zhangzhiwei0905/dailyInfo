import { todayKey } from "@/lib/utils";
import { hasAdminSession } from "@/lib/web/auth";
import { currentLocale } from "@/lib/web/report-persistence";
import { startManualGeneration } from "@/lib/web/run-service";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

function runsPath(key: "error" | "ran", value: string) {
  return `/admin/runs?${new URLSearchParams({ [key]: value }).toString()}`;
}

function parseGenerationDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return todayKey();
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return date;
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return redirectTo("/admin/login");
  }

  const formData = await request.formData();
  const date = parseGenerationDate(formData.get("date"));
  if (!date) return redirectTo(runsPath("error", "日期格式不正确"));

  startManualGeneration({ date, locale: currentLocale() });
  return redirectTo(runsPath("ran", "1"));
}
