import { NextResponse } from "next/server";
import {
  listSavedUrls,
  normalizeFavoriteUrl,
  setSavedArticle,
  type FavoriteArticleInput,
} from "@/lib/db/favorite-repository";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repeated = searchParams.getAll("url");
  const packed = searchParams.get("urls");
  const urls = repeated.length > 0 ? repeated : packed ? packed.split("\n") : [];
  const savedUrls = await listSavedUrls(urls);
  return NextResponse.json({ savedUrls });
}

export async function POST(request: Request) {
  let body: { url?: unknown; saved?: unknown; article?: Partial<FavoriteArticleInput> };
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid json");
  }

  const url = normalizeFavoriteUrl(body.url);
  if (!url) return badRequest("invalid url");
  if (typeof body.saved !== "boolean") return badRequest("saved must be boolean");

  const article = body.article ?? {};
  if (body.saved && typeof article.title !== "string") {
    return badRequest("article.title is required");
  }

  const result = await setSavedArticle(
    {
      url,
      title: typeof article.title === "string" ? article.title : url,
      sourceId: typeof article.sourceId === "string" ? article.sourceId : null,
      sourceName: typeof article.sourceName === "string" ? article.sourceName : null,
      category:
        article.category === "tech" || article.category === "finance" || article.category === "politics"
          ? article.category
          : null,
      excerpt: typeof article.excerpt === "string" ? article.excerpt : null,
      summary: typeof article.summary === "string" ? article.summary : null,
      meta: typeof article.meta === "string" ? article.meta : null,
      publishedAt: typeof article.publishedAt === "string" ? article.publishedAt : null,
      reportDate: typeof article.reportDate === "string" ? article.reportDate : null,
    },
    body.saved,
  );

  return NextResponse.json(result);
}
