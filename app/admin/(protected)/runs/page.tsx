import { prisma } from "@/lib/db/prisma";
import { runTodayAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await prisma.generationRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 30,
  });

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">生成记录</h1>
          <p className="mt-2 text-neutral-700">查看计划任务和手动生成结果。</p>
        </div>
        <form action={runTodayAction}>
          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">
            生成今日简报
          </button>
        </form>
      </div>

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
