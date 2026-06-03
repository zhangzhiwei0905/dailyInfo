import { prisma } from "@/lib/db/prisma";
import { SourceEnabledToggle } from "@/components/admin/SourceEnabledToggle";

export const dynamic = "force-dynamic";

function categoryLabel(category: string): string {
  if (category === "tech") return "技术";
  if (category === "finance") return "财经";
  return "时政";
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string; tested?: string }>;
}) {
  const [params, sources] = await Promise.all([
    searchParams,
    prisma.source.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] }),
  ]);
  const categoryFilter =
    params.category === "tech" || params.category === "finance" || params.category === "politics"
      ? params.category
      : "all";
  const visibleSources =
    categoryFilter === "all" ? sources : sources.filter((source) => source.category === categoryFilter);
  const enabledCount = sources.filter((source) => source.enabled).length;
  const counts = {
    tech: sources.filter((source) => source.category === "tech").length,
    finance: sources.filter((source) => source.category === "finance").length,
    politics: sources.filter((source) => source.category === "politics").length,
  };

  return (
    <section className="pb-12">
      <div className="grid gap-5 border-b border-black/10 pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-neutral-500">DailyBrief Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-neutral-950">源管理</h1>
          <p className="mt-3 text-base leading-7 text-neutral-700">
            管理抓取入口、启停来源并测试连通性。默认只展示关键信息，展开后再编辑细节。
          </p>
        </div>
        <div className="grid grid-cols-4 overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-sm shadow-neutral-900/10">
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-400">总数</p>
            <p className="mt-1 font-mono text-xl font-semibold">{sources.length}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-400">启用</p>
            <p className="mt-1 font-mono text-xl font-semibold">{enabledCount}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-400">技术</p>
            <p className="mt-1 font-mono text-xl font-semibold">{counts.tech}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-400">财经/时政</p>
            <p className="mt-1 font-mono text-xl font-semibold">{counts.finance + counts.politics}</p>
          </div>
        </div>
      </div>

      {params.error ? (
        <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{params.error}</p>
      ) : null}
      {params.tested ? (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          测试成功：{params.tested}
        </p>
      ) : null}

      <form className="mt-6 flex flex-wrap items-center gap-2" method="get">
        <span className="mr-1 text-sm font-semibold text-neutral-500">分类筛选</span>
        {[
          ["all", "全部分类"],
          ["tech", "技术"],
          ["finance", "财经"],
          ["politics", "时政"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              categoryFilter === value
                ? "bg-neutral-950 text-white shadow-sm shadow-neutral-900/15"
                : "border border-black/10 bg-white/80 text-neutral-700 hover:-translate-y-0.5 hover:bg-neutral-100"
            }`}
            name="category"
            type="submit"
            value={value}
          >
            {label}
          </button>
        ))}
      </form>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/10">
          <div className="grid grid-cols-[1.4fr_.65fr_.75fr_.6fr_auto] gap-3 border-b border-black/10 bg-neutral-100/80 px-4 py-3 text-xs font-semibold text-neutral-500">
            <span>来源</span>
            <span>分类</span>
            <span>语言</span>
            <span>状态</span>
            <span className="text-right">操作</span>
          </div>
          {visibleSources.map((source) => (
            <details key={source.id} className="group border-b border-black/10 last:border-b-0">
              <summary className="grid cursor-pointer list-none grid-cols-[1.4fr_.65fr_.75fr_.6fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-neutral-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">{source.name}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">{source.id}</p>
                </div>
                <span className="text-sm text-neutral-700">{categoryLabel(source.category)}</span>
                <span className="font-mono text-xs text-neutral-500">{source.locales.join(", ")}</span>
                <SourceEnabledToggle id={source.id} name={source.name} enabled={source.enabled} />
                <span className="text-right text-sm font-semibold text-neutral-950 group-open:hidden">编辑</span>
                <span className="hidden text-right text-sm font-semibold text-neutral-500 group-open:block">收起</span>
              </summary>

              <div className="border-t border-black/5 bg-neutral-50/70 px-4 py-4">
                <form action="/admin/sources/test" method="post" className="mb-4 flex justify-end">
                  <input type="hidden" name="id" value={source.id} />
                  <button className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white active:translate-y-0" type="submit">
                    测试抓取
                  </button>
                </form>
                <form action="/admin/sources/save" method="post" className="grid gap-4">
                  <input type="hidden" name="mode" value="update" />
                  <input type="hidden" name="id" value={source.id} />
                  <input type="hidden" name="type" value={source.type} />
                  <input type="hidden" name="enabled" value={source.enabled ? "on" : "off"} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.name} required /></label>
                    <label className="grid gap-1 text-sm font-semibold">URL<input name="url" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.url} required /></label>
                    <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.category}><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
                    <label className="grid gap-1 text-sm font-semibold">子分类<input name="subcategory" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.subcategory ?? ""} /></label>
                    <label className="grid gap-1 text-sm font-semibold">Locales<input name="locales" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.locales.join(",")} /></label>
                    <label className="grid gap-1 text-sm font-semibold">关键词<input name="keywords" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.keywords.join(",")} /></label>
                    <label className="grid gap-1 text-sm font-semibold">语言<select name="lang" className="rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.lang ?? ""}><option value="">默认英文</option><option value="zh">中文</option><option value="en">英文</option></select></label>
                  </div>
                  <label className="grid gap-1 text-sm font-semibold">备注<textarea name="notes" className="min-h-20 rounded-xl border border-black/10 bg-white px-3 py-2" defaultValue={source.notes ?? ""} /></label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold"><input name="useCurl" type="checkbox" defaultChecked={source.useCurl} /> 使用 curl</label>
                    <button className="rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-neutral-800 active:translate-y-0" type="submit">保存修改</button>
                  </div>
                </form>
                <form action="/admin/sources/delete" method="post" className="mt-4 border-t border-black/10 pt-4">
                  <input type="hidden" name="id" value={source.id} />
                  <button
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100 active:translate-y-0"
                    type="submit"
                  >
                    删除源
                  </button>
                </form>
              </div>
            </details>
          ))}
          {visibleSources.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm font-medium text-neutral-500">当前分类暂无源。</div>
          ) : null}
        </div>

        <aside className="self-start rounded-2xl bg-neutral-950 p-5 text-white shadow-sm shadow-neutral-900/20 xl:sticky xl:top-6">
          <h2 className="text-xl font-semibold">新增 RSS 源</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-400">先补最少字段，保存后可在列表里继续完善关键词和备注。</p>
          <form action="/admin/sources/save" method="post" className="mt-5 grid gap-3">
            <input type="hidden" name="mode" value="create" />
            <input type="hidden" name="type" value="rss" />
            <label className="grid gap-1 text-sm font-semibold">ID<input name="id" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white" required /></label>
            <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white" required /></label>
            <label className="grid gap-1 text-sm font-semibold">URL<input name="url" type="url" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white" required /></label>
            <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white" defaultValue="tech"><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
            <input type="hidden" name="locales" value="zh,en" />
            <label className="flex items-center gap-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked /> 启用</label>
            <button className="mt-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-950 transition hover:-translate-y-0.5 hover:bg-neutral-200 active:translate-y-0" type="submit">保存新源</button>
          </form>
        </aside>
      </div>
    </section>
  );
}
