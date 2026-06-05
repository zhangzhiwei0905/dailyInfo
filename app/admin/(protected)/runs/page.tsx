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

      <div className="mt-8 overflow-hidden rounded-2xl border border-black/10 bg-white/70">
        {runs.map((run) => (
          <div key={run.id} className="grid gap-1 border-b border-black/10 p-4 last:border-b-0">
            <div className="flex justify-between gap-4">
              <p className="font-semibold">
                {run.dateKey} · {run.trigger}
              </p>
              <p className="text-sm" data-status-badge={run.id}>{run.status}</p>
            </div>
            {run.articlesCount !== null ? (
              <p className="text-sm text-neutral-600">{run.articlesCount} 篇文章</p>
            ) : null}
            {run.status === "failed" && run.errorMessage ? (
              <p className="text-sm text-red-700">{run.errorMessage}</p>
            ) : null}
            {run.status === "running" ? (
              <LiveLog runId={run.id} />
            ) : run.logExcerpt ? (
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

function LiveLog({ runId }: { runId: string }) {
  return (
    <div data-live-log={runId}>
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-medium text-emerald-700">正在生成…</span>
      </div>
      <pre
        data-log-output={runId}
        className="max-h-64 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100 font-mono whitespace-pre-wrap scroll-smooth"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var runId = ${JSON.stringify(runId)};
            var output = document.querySelector('[data-log-output="' + runId + '"]');
            var badge = document.querySelector('[data-status-badge="' + runId + '"]');
            if (!output) return;
            var es = new EventSource('/api/admin/runs/' + runId + '/events');
            var autoScroll = true;
            output.addEventListener('scroll', function() {
              autoScroll = output.scrollTop + output.clientHeight >= output.scrollHeight - 20;
            });
            es.addEventListener('log', function(e) {
              output.appendChild(document.createTextNode(e.data + '\\n'));
              if (autoScroll) output.scrollTop = output.scrollHeight;
            });
            es.addEventListener('done', function(e) {
              es.close();
              var status = e.data;
              if (badge) badge.textContent = status;
              var parent = output.parentElement;
              if (parent) {
                var indicator = parent.querySelector('[class*="animate-ping"]');
                if (indicator) {
                  var dot = indicator.closest('span.relative');
                  if (dot) {
                    var label = dot.nextElementSibling;
                    if (label) {
                      label.textContent = status === 'success' ? '生成完成' : '生成失败';
                      label.className = status === 'success'
                        ? 'text-xs font-medium text-emerald-700'
                        : 'text-xs font-medium text-red-700';
                    }
                    dot.remove();
                  }
                }
              }
            });
            es.onerror = function() { es.close(); };
          })();`,
        }}
      />
    </div>
  );
}
