"use server";

import { redirect } from "next/navigation";
import { todayKey } from "@/lib/utils";
import { requireAdmin } from "@/lib/web/auth";
import { currentLocale } from "@/lib/web/report-persistence";
import { runGeneration } from "@/lib/web/run-service";

export async function runTodayAction() {
  await requireAdmin();
  await runGeneration({ date: todayKey(), locale: currentLocale(), trigger: "manual" });
  redirect("/admin/runs");
}
