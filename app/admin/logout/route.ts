import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/web/auth";

export async function GET() {
  await clearAdminSession();
  redirect("/admin/login");
}
