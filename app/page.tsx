import Link from "next/link";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reports = await listReadyReports(currentLocale());
  const latest = reports[0];
  return (
    <ReportShell title="今日简报">
      {latest ? (
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6">
          <p className="text-sm text-neutral-500">最新可用报告</p>
          <h2 className="mt-2 text-2xl font-semibold">{latest.dateKey}</h2>
          {latest.summary ? (
            <p className="mt-3 max-w-3xl leading-7 text-neutral-700">{latest.summary}</p>
          ) : null}
          <Link
            className="mt-5 inline-flex rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
            href={`/reports/${latest.dateKey}`}
          >
            打开简报
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-black/10 bg-white/60 p-6">
          <h2 className="text-2xl font-semibold">还没有生成简报</h2>
          <p className="mt-3 text-neutral-700">登录后台后可以手动生成第一份简报。</p>
          <Link
            className="mt-5 inline-flex rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
            href="/admin"
          >
            进入后台
          </Link>
        </section>
      )}
    </ReportShell>
  );
}
