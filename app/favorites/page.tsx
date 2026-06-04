import Link from "next/link";
import { FavoriteToggle } from "@/components/public/FavoriteToggle";
import { listSavedArticles, type FavoriteSort } from "@/lib/db/favorite-repository";
import { listReadyReports } from "@/lib/db/report-repository";
import { currentLocale } from "@/lib/web/report-persistence";
import { ReportShell } from "@/components/public/ReportShell";

export const dynamic = "force-dynamic";

function parseSort(value: string | string[] | undefined): FavoriteSort {
  if (value === "recommended") return "recommended";
  if (value === "latest") return "latest";
  return "saved";
}

function formatDate(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function sortLabel(sort: FavoriteSort): string {
  if (sort === "recommended") return "综合推荐";
  if (sort === "latest") return "最新发布";
  return "收藏时间";
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const [articles, reports] = await Promise.all([
    listSavedArticles(sort),
    listReadyReports(currentLocale()),
  ]);
  const [latest] = reports;

  return (
    <ReportShell title="我的收藏">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["saved", "recommended", "latest"] as FavoriteSort[]).map((item) => (
          <Link
            key={item}
            aria-current={item === sort ? "page" : undefined}
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition active:translate-y-px",
              item === sort
                ? "bg-neutral-950 text-white"
                : "bg-white/70 text-neutral-600 hover:bg-white hover:text-neutral-950",
            ].join(" ")}
            href={`/favorites?sort=${item}`}
          >
            {sortLabel(item)}
          </Link>
        ))}
      </div>

      {articles.length === 0 ? (
        <section className="rounded-2xl bg-white/70 p-6 ring-1 ring-black/10">
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">还没有收藏文章</h2>
          <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
            在每日简报里点击文章旁边的星星，值得回看的内容会出现在这里。
          </p>
          <Link
            className="mt-5 inline-flex rounded-full bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 active:translate-y-px"
            href={latest ? `/report/${latest.dateKey}` : "/report"}
          >
            回到简报
          </Link>
        </section>
      ) : (
        <div className="grid gap-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl bg-white/70 p-5 ring-1 ring-black/10 transition hover:bg-white"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-950">
                    <a className="hover:underline" href={article.url} rel="noopener noreferrer" target="_blank">
                      {article.title}
                    </a>
                  </h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    {[
                      article.sourceName,
                      formatDate(article.publishedAt),
                      article.lastReportDate ? `报告 ${article.lastReportDate}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <FavoriteToggle url={article.url} />
              </div>
              {article.summary || article.excerpt ? (
                <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-700">
                  {article.summary ?? article.excerpt}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <a className="text-neutral-950 hover:underline" href={article.url} rel="noopener noreferrer" target="_blank">
                  打开原文
                </a>
                {article.lastReportDate ? (
                  <Link className="text-neutral-600 hover:text-neutral-950 hover:underline" href={`/report/${article.lastReportDate}`}>
                    查看报告
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </ReportShell>
  );
}
