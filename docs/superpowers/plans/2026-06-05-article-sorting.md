# Article Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-dimension article sorting (Recommended / Time / Source) to each subcategory tab, powered by LLM importance scoring.

**Architecture:** LLM importance scoring is added as a new enrichment step in the pipeline (alongside existing summary enrichment). Scores are folded into the recommendation formula. The HTML renderer adds data attributes to each article element and a sort-switcher UI per subcategory. Pure frontend JS reorders article DOM nodes on sort change.

**Tech Stack:** TypeScript, Prisma (schema migration), LLM via `runLlm()`, vanilla JS for frontend sorting.

---

### Task 1: Add `importanceScore` field to types and DB schema

**Files:**
- Modify: `lib/sources/types.ts` — add `importanceScore` to `RawArticle`
- Modify: `prisma/schema.prisma` — add `importanceScore` column to `ReportArticle`
- Modify: `lib/db/report-repository.ts` — write `importanceScore` in `upsertReadyReport`

- [ ] **Step 1: Add `importanceScore` to `RawArticle` in `lib/sources/types.ts`**

After the `recommendationReason` field, add:

```ts
  importanceScore?: number;
```

- [ ] **Step 2: Add `importanceScore` column to `ReportArticle` in `prisma/schema.prisma`**

After the `recommendationReason` line, add:

```prisma
  importanceScore         Float?
```

- [ ] **Step 3: Update `upsertReadyReport` in `lib/db/report-repository.ts`**

In the `prisma.reportArticle.createMany` data mapping, after the `recommendationReason` line, add:

```ts
        importanceScore: article.importanceScore ?? null,
```

- [ ] **Step 4: Run Prisma migration**

Run: `npx prisma migrate dev --name add-importance-score`
Expected: Migration created and applied successfully.

- [ ] **Step 5: Run `db:generate`**

Run: `npx prisma generate`
Expected: Prisma Client regenerated.

- [ ] **Step 6: Commit**

```bash
git add lib/sources/types.ts prisma/schema.prisma prisma/migrations/ lib/db/report-repository.ts
git commit -m "feat: add importanceScore field to RawArticle and DB schema"
```

---

### Task 2: Add LLM importance scoring enrichment

**Files:**
- Modify: `lib/ai/enrich.ts` — add prompts + `enrichImportanceScores()` function

- [ ] **Step 1: Add importance scoring prompts to `lib/ai/enrich.ts`**

Add the two locale prompts after the existing prompt constants (before `const PROMPTS =`), and add an `importance` key to both PROMPTS objects:

```ts
const IMPORTANCE_SYSTEM_PROMPT_ZH = `你是一名新闻价值评估专家，为每日简报中的文章打新闻重要性分数。

输入：每条文章有 url、title、excerpt。

评分锚点（严格参照）：
  9-10分：突发重大事件 / 行业里程碑 — 如新框架发布、重大政策落地、突破性科研成果
  7-8分：有实质影响的行业动态 — 如大厂产品更新、重要数据分析、重大融资/并购
  5-6分：常规资讯，有参考价值 — 如版本更新、常规市场报告、行业统计
  3-4分：偏科普 / 回顾性内容 — 如技术教程、行业观点、经验分享
  1-2分：软文 / 推广 / 低信息密度 — 如营销内容、转载旧闻、广告

注意：
  - 打分要有区分度，不要全部打 5-7，每个档次都应有文章
  - 基于客观新闻价值打分，不考虑个人偏好
  - 信息不足时默认打 5 分

输出严格 JSON 对象，不要 markdown：
{
  "scores": [
    { "url": "<原 url，从输入中精确复制>", "importance": <1-10 的整数> },
    ...
  ]
}`;

const IMPORTANCE_SYSTEM_PROMPT_EN = `You are a news-value assessor scoring articles for a daily brief.

Input: each article has url, title, excerpt.

Scoring anchors (follow strictly):
  9-10: Breaking major event / industry milestone — e.g. new framework launch, major policy, breakthrough research
  7-8: Substantive industry development — e.g. big-tech product update, important data analysis, major funding/M&A
  5-6: Routine info with reference value — e.g. version updates, routine market reports, industry stats
  3-4: Educational / retrospective content — e.g. tutorials, opinion pieces, experience sharing
  1-2: Sponsored / promotional / low-density — e.g. marketing content, recycled news, ads

Notes:
  - Scores must have spread — do not cluster everything at 5-7; each tier should have entries
  - Score based on objective news value, not personal preference
  - When information is insufficient, default to 5

Output STRICTLY a JSON object, no markdown:
{
  "scores": [
    { "url": "<exact url from input>", "importance": <integer 1-10> },
    ...
  ]
}`;
```

Then add `importance` key to both PROMPTS objects:

```ts
// In the zh PROMPTS object:
importance: IMPORTANCE_SYSTEM_PROMPT_ZH,
// In the en PROMPTS object:
importance: IMPORTANCE_SYSTEM_PROMPT_EN,
```

- [ ] **Step 2: Add `enrichImportanceScores()` function to `lib/ai/enrich.ts`**

After the `enrichArticleSummaries` function, add:

```ts
export async function enrichImportanceScores(
  items: EnrichInput[],
): Promise<Map<string, number>> {
  if (items.length === 0) return new Map();
  const payload = items.map((it) => ({
    url: it.url,
    title: it.title,
    excerpt: (it.excerpt ?? "").slice(0, 280),
  }));
  const result = new Map<string, number>();
  try {
    const { text } = await runLlm({
      systemPrompt: PROMPTS.importance,
      userPrompt: [
        REPORT_LOCALE === "en"
          ? "**Output language: ENGLISH ONLY.**"
          : "**输出语言：仅中文。**",
        "",
        REPORT_LOCALE === "en"
          ? `Candidate items (${payload.length} entries, JSON array):`
          : `候选条目（共 ${payload.length} 条，JSON 数组）：`,
        JSON.stringify(payload),
        "",
        REPORT_LOCALE === "en"
          ? 'Output `{"scores": [{"url": ..., "importance": ...}, ...]}` — url must be copied exactly from input.'
          : '请输出 {"scores": [{"url": ..., "importance": ...}, ...]}，url 必须精确回填输入值。',
      ].join("\n"),
      timeoutMs: 180_000,
    });
    const cleaned = extractJson(text);
    let parsed: { scores?: Array<{ url?: string; importance?: number }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = JSON.parse(jsonrepair(cleaned));
    }
    for (const s of parsed.scores ?? []) {
      if (s.url && typeof s.importance === "number") {
        result.set(s.url, Math.max(1, Math.min(10, Math.round(s.importance))));
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[enrich] importance scoring failed: ${msg}`);
  }
  return result;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai/enrich.ts
git commit -m "feat: add LLM importance scoring enrichment"
```

---

### Task 3: Integrate importance scoring into the generation pipeline

**Files:**
- Modify: `lib/web/generation-service.ts` — add importance scoring step

- [ ] **Step 1: Import `enrichImportanceScores` in `lib/web/generation-service.ts`**

Add to the existing import from `"../ai/enrich"`:

```ts
import {
  enrichArticleSummaries,
  enrichFinanceNewsSummaries,
  enrichGithubTrendingSummaries,
  enrichTrendingPapersSummaries,
  enrichXViralSummaries,
  enrichImportanceScores,
} from "../ai/enrich";
```

- [ ] **Step 2: Add importance scoring step after all other enrichment**

In `generateDailyBrief()`, after the `enrichMissingArticleSummaries` call and before the trading section, add:

```ts
  // Importance scoring — batch all articles in groups of 15
  const importanceBatchSize = 15;
  log(`[daily] scoring importance for ${articles.length} articles`);
  for (let i = 0; i < articles.length; i += importanceBatchSize) {
    const batch = articles.slice(i, i + importanceBatchSize);
    const scores = await enrichImportanceScores(batch);
    for (const article of batch) {
      const score = scores.get(article.url);
      if (score !== undefined) article.importanceScore = score;
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add lib/web/generation-service.ts
git commit -m "feat: integrate importance scoring into generation pipeline"
```

---

### Task 4: Adjust recommendation formula to include importance score

**Files:**
- Modify: `lib/articles/recommendation.ts` — adjust `scoreArticle()` formula

- [ ] **Step 1: Update `scoreArticle()` in `lib/articles/recommendation.ts`**

Replace the existing `scoreArticle` function with:

```ts
function scoreArticle(article: RawArticle, now: Date): RawArticle {
  const heatScore = normalizeEngagement(article.engagementScore);
  const recency = recencyScore(article.publishedAt, now);
  const rank = rankScore(article.sourceRank);
  const importance = article.importanceScore;
  let score: number;

  if (importance !== undefined && importance > 0) {
    // Normalize 1-10 importance to 0-100 scale
    const importanceNorm = importance * 10;
    score = importanceNorm * 0.50 + recency * 0.28 + rank * 0.22;
  } else if (heatScore === undefined) {
    score = recency * 0.58 + rank * 0.42;
  } else {
    score = heatScore * 0.45 + recency * 0.25 + rank * 0.2 + 10;
  }

  return {
    ...article,
    heatScore,
    recommendationScore: Math.round(score * 100) / 100,
    recommendationReason: recommendationReason(article),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/articles/recommendation.ts
git commit -m "feat: adjust recommendation formula to include importance score"
```

---

### Task 5: Add data attributes to article HTML elements

**Files:**
- Modify: `lib/output/render.ts` — add `data-sort-*` attributes to article elements

- [ ] **Step 1: Update `renderArticleHtml()` to include sort data attributes**

In the `renderArticleHtml` function, replace the `<article class="article">` line with:

```ts
  return `<article class="article" data-sort-score="${a.recommendationScore ?? 0}" data-sort-time="${a.publishedAt?.getTime() ?? 0}" data-sort-source="${escapeHtml(a.sourceId)}">
```

- [ ] **Step 2: Commit**

```bash
git add lib/output/render.ts
git commit -m "feat: add data-sort attributes to article elements"
```

---

### Task 6: Add sort switcher UI and frontend sorting JS

**Files:**
- Modify: `lib/output/render.ts` — sort switcher buttons, CSS, and JS

- [ ] **Step 1: Add STR labels for sort buttons**

In the `STR` object (zh section), after `nextSolarTermLabel`:

```ts
  sortRecommended: "推荐",
  sortTime: "时间",
  sortSource: "来源",
```

In the `STR_EN` object, after `nextSolarTermLabel`:

```ts
  sortRecommended: "Recommended",
  sortTime: "Time",
  sortSource: "Source",
```

- [ ] **Step 2: Add CSS for sort switcher**

After the `.source-tabs` CSS block (after the closing `}`), add:

```css
  .sort-bar {
    display: flex;
    gap: 0.25rem;
    justify-content: flex-end;
    padding: 0.5rem 0 0.3rem;
  }
  .sort-btn {
    background: transparent;
    border: 1px solid transparent;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: color 0.18s ease, background 0.18s ease;
  }
  .sort-btn:hover { color: var(--fg); background: var(--card); }
  .sort-btn.active {
    color: var(--fg);
    background: var(--card);
    border-color: var(--rule);
  }
```

Add responsive rule inside the existing `@media (max-width: 640px)` block:

```css
    .sort-bar { justify-content: flex-start; }
```

- [ ] **Step 3: Add sort switcher HTML to `renderSubContent()`**

In the `renderSubContent` function, insert the sort bar right after the `<div class="source-contents">` opening tag and before the source contents:

Change:
```ts
  return `<div class="sub-content${isActive ? " active" : ""}" data-sub-content="${escapeHtml(sub.id)}" data-cat="${category}">
    ${renderSourceTabs(category, sub.id, sub.sources)}
    <div class="source-contents">
      ${sub.sources.map((s, i) => renderSourceContent(category, sub.id, s, i === 0)).join("\n")}
    </div>
  </div>`;
```

To:
```ts
  return `<div class="sub-content${isActive ? " active" : ""}" data-sub-content="${escapeHtml(sub.id)}" data-cat="${category}">
    ${renderSourceTabs(category, sub.id, sub.sources)}
    <div class="sort-bar" data-sort-bar="${escapeHtml(sub.id)}">
      <button class="sort-btn active" data-sort-mode="recommended">${STR.sortRecommended}</button>
      <button class="sort-btn" data-sort-mode="time">${STR.sortTime}</button>
      <button class="sort-btn" data-sort-mode="source">${STR.sortSource}</button>
    </div>
    <div class="source-contents">
      ${sub.sources.map((s, i) => renderSourceContent(category, sub.id, s, i === 0)).join("\n")}
    </div>
  </div>`;
```

- [ ] **Step 4: Add frontend sorting JS**

Before the closing `</script>` tag (right before the favorites IIFE), add:

```js
  // Sort switcher — reorders article elements within each sub-content
  document.querySelectorAll('.sort-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var bar = btn.closest('.sort-bar');
      if (!bar) return;
      var subContent = bar.closest('.sub-content');
      if (!subContent) return;
      var mode = btn.dataset.sortMode;
      bar.querySelectorAll('.sort-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      subContent.querySelectorAll('.source-content').forEach(function (container) {
        var articles = Array.prototype.slice.call(container.querySelectorAll('article.article'));
        if (articles.length < 2) return;
        articles.sort(function (a, b) {
          if (mode === 'time') {
            return parseFloat(b.dataset.sortTime) - parseFloat(a.dataset.sortTime);
          }
          if (mode === 'source') {
            var srcDiff = a.dataset.sortSource < b.dataset.sortSource ? -1 :
                          a.dataset.sortSource > b.dataset.sortSource ? 1 : 0;
            if (srcDiff !== 0) return srcDiff;
            return parseFloat(b.dataset.sortScore) - parseFloat(a.dataset.sortScore);
          }
          // recommended (default)
          return parseFloat(b.dataset.sortScore) - parseFloat(a.dataset.sortScore);
        });
        articles.forEach(function (el) { container.appendChild(el); });
      });
      // Persist sort choice in URL query param
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('sort', mode);
        history.replaceState(null, '', url.toString());
      } catch (e) {}
    });
  });
  // Restore sort from URL query param on load
  (function () {
    try {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get('sort');
      if (!mode || mode === 'recommended') return;
      document.querySelectorAll('.sort-btn[data-sort-mode="' + mode + '"]').forEach(function (btn) {
        btn.click();
      });
    } catch (e) {}
  })();
```

- [ ] **Step 5: Run smoke test**

Run: `npx tsx scripts/render-smoke-test.ts`
Expected: PASS (the test doesn't assert on sort-bar yet, so it should still pass)

- [ ] **Step 6: Commit**

```bash
git add lib/output/render.ts
git commit -m "feat: add sort switcher UI and frontend sorting JS"
```

---

### Task 7: Update smoke tests for sort switcher

**Files:**
- Modify: `scripts/render-smoke-test.ts` — add assertions for sort UI

- [ ] **Step 1: Add sort-bar assertions to the smoke test**

After the existing tab assertions, add:

```ts
assert.match(html, /class="sort-bar"/);
assert.match(html, /class="sort-btn active" data-sort-mode="recommended"/);
assert.match(html, /data-sort-mode="time"/);
assert.match(html, /data-sort-mode="source"/);
assert.match(html, /data-sort-score="86.3"/);
```

- [ ] **Step 2: Run smoke test**

Run: `npx tsx scripts/render-smoke-test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add scripts/render-smoke-test.ts
git commit -m "test: add sort switcher smoke test assertions"
```

---

### Task 8: Re-render, rebuild Docker, update DB

- [ ] **Step 1: Re-render all existing reports**

```bash
for d in 2026-06-02 2026-06-03 2026-06-04 2026-06-05; do
  npx tsx scripts/render.ts "$d"
done
```

- [ ] **Step 2: Update DB with new HTML**

Create temporary script and run:
```bash
npx tsx scripts/_update-html.ts 2026-06-02 2026-06-03 2026-06-04 2026-06-05
```

- [ ] **Step 3: Rebuild Docker images**

```bash
docker compose build --no-cache web worker
```

- [ ] **Step 4: Deploy**

```bash
docker compose up -d web worker
```

- [ ] **Step 5: Verify**

Open `http://localhost:3000` and check:
1. Sort buttons appear in each subcategory tab
2. Clicking "时间" reorders articles by publish time
3. Clicking "来源" groups articles by source
4. Refreshing with `?sort=time` in URL restores the sort state
5. Clean up temp script: `rm scripts/_update-html.ts`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: re-render reports and deploy with sort feature"
```
