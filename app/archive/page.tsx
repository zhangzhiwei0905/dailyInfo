import Link from "next/link";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const reports = await listReadyReports(currentLocale());
  return (
    <ReportShell title="历史归档">
      <div className="grid gap-3">
        {reports.map((report) => (
          <Link
            key={report.dateKey}
            href={`/report/${report.dateKey}`}
            className="rounded-xl border border-black/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:bg-white"
          >
            <div className="font-semibold">{report.dateKey}</div>
            {report.summary ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                {report.summary}
              </p>
            ) : null}
          </Link>
        ))}
        {reports.length === 0 ? <p className="text-neutral-600">暂无历史简报。</p> : null}
      </div>
    </ReportShell>
  );
}
