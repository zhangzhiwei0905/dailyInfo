import { prisma } from "@/lib/db/prisma";
import { saveSourceAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, sources] = await Promise.all([
    searchParams,
    prisma.source.findMany({ orderBy: [{ category: "asc" }, { id: "asc" }] }),
  ]);
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">源管理</h1>
          <p className="mt-2 text-neutral-700">新增 RSS 源，编辑已有源，启停并测试抓取结果。</p>
        </div>
      </div>
      {params.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {sources.map((source) => (
            <form key={source.id} action={saveSourceAction} className="grid gap-3 rounded-2xl border border-black/10 bg-white/70 p-4">
              <input type="hidden" name="mode" value="update" />
              <input type="hidden" name="id" value={source.id} />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{source.name}</p>
                  <p className="truncate text-xs text-neutral-500">{source.id} · {source.type} · {source.category}</p>
                </div>
                <a className="shrink-0 text-sm font-semibold underline" href={`/api/admin/sources/${source.id}/test`} target="_blank">
                  测试
                </a>
              </div>
              <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-lg border px-3 py-2" defaultValue={source.name} required /></label>
              <input type="hidden" name="type" value={source.type} />
              <label className="grid gap-1 text-sm font-semibold">URL<input name="url" className="rounded-lg border px-3 py-2" defaultValue={source.url} required /></label>
              <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-lg border px-3 py-2" defaultValue={source.category}><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
              <label className="grid gap-1 text-sm font-semibold">子分类<input name="subcategory" className="rounded-lg border px-3 py-2" defaultValue={source.subcategory ?? ""} /></label>
              <label className="grid gap-1 text-sm font-semibold">Locales<input name="locales" className="rounded-lg border px-3 py-2" defaultValue={source.locales.join(",")} /></label>
              <label className="grid gap-1 text-sm font-semibold">关键词<input name="keywords" className="rounded-lg border px-3 py-2" defaultValue={source.keywords.join(",")} /></label>
              <label className="grid gap-1 text-sm font-semibold">语言<select name="lang" className="rounded-lg border px-3 py-2" defaultValue={source.lang ?? ""}><option value="">默认英文</option><option value="zh">中文</option><option value="en">英文</option></select></label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked={source.enabled} /> 启用</label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input name="useCurl" type="checkbox" defaultChecked={source.useCurl} /> 使用 curl</label>
              <label className="grid gap-1 text-sm font-semibold">备注<textarea name="notes" className="rounded-lg border px-3 py-2" defaultValue={source.notes ?? ""} /></label>
              <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">保存修改</button>
            </form>
          ))}
        </div>

        <form action={saveSourceAction} className="grid gap-3 rounded-2xl border border-black/10 bg-white/70 p-5">
          <input type="hidden" name="mode" value="create" />
          <h2 className="text-xl font-semibold">新增 RSS 源</h2>
          <label className="grid gap-1 text-sm font-semibold">ID<input name="id" className="rounded-lg border px-3 py-2" required /></label>
          <label className="grid gap-1 text-sm font-semibold">名称<input name="name" className="rounded-lg border px-3 py-2" required /></label>
          <input type="hidden" name="type" value="rss" />
          <label className="grid gap-1 text-sm font-semibold">URL<input name="url" type="url" className="rounded-lg border px-3 py-2" required /></label>
          <label className="grid gap-1 text-sm font-semibold">分类<select name="category" className="rounded-lg border px-3 py-2" defaultValue="tech"><option value="tech">技术</option><option value="finance">财经</option><option value="politics">时政</option></select></label>
          <label className="grid gap-1 text-sm font-semibold">子分类<input name="subcategory" className="rounded-lg border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm font-semibold">Locales<input name="locales" className="rounded-lg border px-3 py-2" defaultValue="zh,en" /></label>
          <label className="grid gap-1 text-sm font-semibold">关键词<input name="keywords" className="rounded-lg border px-3 py-2" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="enabled" type="checkbox" defaultChecked /> 启用</label>
          <label className="flex items-center gap-2 text-sm font-semibold"><input name="useCurl" type="checkbox" /> 使用 curl</label>
          <label className="grid gap-1 text-sm font-semibold">备注<textarea name="notes" className="rounded-lg border px-3 py-2" /></label>
          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">保存</button>
        </form>
      </div>
    </section>
  );
}
