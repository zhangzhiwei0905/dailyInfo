import { notFound } from "next/navigation";
import { ReportFrame } from "@/components/public/ReportFrame";
import { findReportHtml } from "@/lib/db/report-repository";
import { prepareReportFrameHtml } from "@/lib/output/site-nav";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

export default async function DatedReportPage({
  params,
}: Readonly<{ params: Promise<{ date: string }> }>) {
  const { date } = await params;
  const html = await findReportHtml(date, currentLocale());
  if (!html) notFound();

  return (
    <main className="mx-auto w-full">
      <ReportFrame html={prepareReportFrameHtml(html, date)} title={`DailyBrief ${date}`} />
    </main>
  );
}
