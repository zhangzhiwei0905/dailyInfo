import { prisma } from "@/lib/db/prisma";
import { todayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ran?: string }>;
}) {
  const [params, runs] = await Promise.all([
    searchParams,
    prisma.generationRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">生成记录</h1>
          <p className="mt-2 text-neutral-700">查看计划任务和手动生成结果。</p>
        </div>
        <form action="/admin/runs/today" method="post" className="flex items-center gap-3">
          <input
            className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-800"
            defaultValue={todayKey()}
            name="date"
            type="date"
          />
          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">
            生成指定日期简报
          </button>
        </form>
      </div>

      {params.error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{params.error}</p>
      ) : null}
      {params.ran ? (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          已开始生成简报。
        </p>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
        {runs.map((run) => (
          <div key={run.id} className="grid gap-1 border-b border-black/10 p-4 last:border-b-0">
            <div className="flex justify-between gap-4">
              <p className="font-semibold">
                {run.dateKey} · {run.trigger}
              </p>
              <p className="text-sm">{run.status}</p>
            </div>
            {run.articlesCount !== null ? (
              <p className="text-sm text-neutral-600">{run.articlesCount} 篇文章</p>
            ) : null}
            {run.errorMessage ? <p className="text-sm text-red-700">{run.errorMessage}</p> : null}
            {run.logExcerpt ? (
              <pre className="max-h-40 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
                {run.logExcerpt}
              </pre>
            ) : null}
          </div>
        ))}
        {runs.length === 0 ? <p className="p-4 text-neutral-600">暂无生成记录。</p> : null}
      </div>
    </section>
  );
}
