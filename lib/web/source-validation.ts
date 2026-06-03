import type { Category, SourceDef, SourceType } from "../sources/types";

const validTypes = new Set<SourceType>(["rss", "api", "scrape"]);
const validCategories = new Set<Category>(["tech", "finance", "politics"]);

export function normalizeList(value: unknown): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sourceFromFormData(formData: FormData): SourceDef {
  const type = String(formData.get("type")) as SourceType;
  const category = String(formData.get("category")) as Category;
  const locales = normalizeList(formData.get("locales")) as ("zh" | "en")[];
  const enabled = formData.get("enabled") === "on";
  const useCurl = formData.get("useCurl") === "on";
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    type,
    url: String(formData.get("url") ?? "").trim(),
    category,
    subcategory: String(formData.get("subcategory") ?? "").trim() || undefined,
    enabled,
    useCurl,
    lang: (String(formData.get("lang") ?? "").trim() || undefined) as "zh" | "en" | undefined,
    locales: locales.length > 0 ? locales : ["zh", "en"],
    keywords: normalizeList(formData.get("keywords")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  };
}

export function validateSource(source: SourceDef, mode: "create" | "update"): string[] {
  const errors: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(source.id)) {
    errors.push("id must use lowercase letters, numbers, and hyphens");
  }
  if (!source.name) errors.push("name is required");
  if (!source.url) errors.push("url is required");
  if (!validTypes.has(source.type)) errors.push("type must be rss, api, or scrape");
  if (!validCategories.has(source.category)) errors.push("category must be tech, finance, or politics");
  if (source.locales?.some((locale) => locale !== "zh" && locale !== "en")) {
    errors.push("locales must be zh,en, or both");
  }
  if (mode === "create" && source.type !== "rss") {
    errors.push("first version only supports creating RSS sources");
  }
  return errors;
}
