import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { todayKey } from "@/lib/utils";
import { currentLocale } from "@/lib/web/report-persistence";

export const dynamic = "force-dynamic";

function statusLabel(status: string): string {
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  return "运行中";
}

export default async function AdminHomePage() {
  const locale = currentLocale();
  const [sourceCount, enabledSourceCount, latestReport, recentRuns] = await Promise.all([
    prisma.source.count(),
    prisma.source.count({ where: { enabled: true } }),
    prisma.report.findFirst({
      where: { locale, status: "ready" },
      orderBy: { dateKey: "desc" },
      select: { dateKey: true, generatedAt: true, summary: true },
    }),
    prisma.generationRun.findMany({
      orderBy: { startedAt: "desc" },
      select: { id: true, dateKey: true, status: true, articlesCount: true, startedAt: true },
      take: 3,
    }),
  ]);

  const actions = [
    {
      href: "/admin/sources",
      label: "源管理",
      title: "维护 9 个默认源",
      description: "修改、测试、删除订阅源，控制每日简报的数据入口。",
      meta: `${enabledSourceCount}/${sourceCount} 已启用`,
    },
    {
      href: "/admin/runs",
      label: "生成记录",
      title: "生成今日或历史简报",
      description: "按日期触发生成，查看每次抓取、摘要和报告输出日志。",
      meta: latestReport ? `最新 ${latestReport.dateKey}` : "尚未生成",
    },
  ];

  return (
    <section className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-[2rem] bg-white/75 p-7 shadow-sm shadow-stone-900/5 ring-1 ring-black/10">
          <p className="text-sm font-semibold text-neutral-500">控制台</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
            管理源、生成简报、查看发布状态。
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
            这里是每日简报的操作入口。源管理负责输入质量，生成记录负责手动补跑和排查，最新简报会直接同步到公共页面。
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950/20 active:translate-y-0"
              href="/admin/runs"
            >
              生成记录
            </Link>
            <Link
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-950 shadow-sm ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950/20 active:translate-y-0"
              href="/admin/sources"
            >
              源管理
            </Link>
            <Link
              className="rounded-full px-5 py-3 text-sm font-semibold text-neutral-600 transition hover:-translate-y-0.5 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/20 active:translate-y-0"
              href="/"
            >
              回到首页
            </Link>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-neutral-950 p-6 text-white shadow-lg shadow-stone-900/10">
          <p className="text-sm font-semibold text-neutral-400">快速生成</p>
          <form action="/admin/runs/today" method="post" className="mt-5 grid gap-3">
            <input
              className="h-11 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white outline-none transition focus:border-white/40"
              defaultValue={todayKey()}
              name="date"
              type="date"
            />
            <button
              className="h-11 rounded-2xl bg-white px-4 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-200 active:translate-y-0"
              type="submit"
            >
              生成指定日期简报
            </button>
          </form>
          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs font-semibold text-neutral-400">最新报告</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {latestReport?.dateKey ?? "暂无"}
            </p>
            {latestReport?.summary ? (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-300">{latestReport.summary}</p>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            className="group rounded-[1.5rem] bg-white/70 p-6 shadow-sm shadow-stone-900/5 ring-1 ring-black/10 transition hover:-translate-y-1 hover:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-950/20 active:translate-y-0"
            href={action.href}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-neutral-500">{action.label}</span>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 transition group-hover:bg-neutral-950 group-hover:text-white">
                {action.meta}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-950">{action.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">{action.description}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-[1.5rem] bg-white/70 p-6 shadow-sm shadow-stone-900/5 ring-1 ring-black/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-neutral-500">最近生成</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">运行状态</h2>
          </div>
          <Link className="text-sm font-semibold text-neutral-600 hover:text-neutral-950" href="/admin/runs">
            查看全部
          </Link>
        </div>
        <div className="mt-5 divide-y divide-black/10">
          {recentRuns.map((run) => (
            <div key={run.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <p className="font-semibold tabular-nums">{run.dateKey}</p>
              <p className="text-sm text-neutral-500">{run.articlesCount ?? 0} 篇文章</p>
              <p className="text-sm font-semibold text-neutral-700">{statusLabel(run.status)}</p>
            </div>
          ))}
          {recentRuns.length === 0 ? <p className="py-4 text-sm text-neutral-500">暂无生成记录。</p> : null}
        </div>
      </section>
    </section>
  );
}
