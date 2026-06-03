import { redirect } from "next/navigation";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [latest] = await listReadyReports(currentLocale());
  if (!latest) {
    redirect("/admin");
  }
  redirect(`/report/${latest.dateKey}`);
}
