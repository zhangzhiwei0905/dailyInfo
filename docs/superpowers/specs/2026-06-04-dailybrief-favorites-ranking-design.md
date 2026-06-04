# DailyBrief Favorites and Recommendation Sorting Design

## Design Read

DailyBrief is a personal daily reading tool. This feature should feel like a quiet extension of the reading workflow, not a dashboard or a social ranking system. The user is the only intended user, so the design avoids account-level complexity and keeps the interface focused on saving articles worth returning to.

## Goals

- Add a single-user, global article collection.
- Add a `我的收藏` navigation item.
- Add a small star icon to every report article for saving or unsaving.
- Add a `我的收藏` page that lists saved articles across report dates.
- Support sorting saved articles by saved time, recommendation score, and published time.
- Introduce a stable, explainable `综合推荐` sort for report articles.
- Normalize source-specific popularity signals without inventing fake page views.

## Non-Goals

- No multi-user account model.
- No tags, folders, or annotation system.
- No real page-view tracking.
- No LLM-based article reranking.
- No social or public leaderboard semantics.
- No conversion of the report page into a dense table UI.

## Product Behavior

### Navigation

The public navigation gains a `我的收藏` item:

- `首页`
- `历史归档`
- `我的收藏`
- `管理后台`

The nav must remain one line on desktop. The added item should use the existing `MainNavigation` and injected report navigation patterns so React pages and self-contained report HTML stay visually aligned.

### Article Star

Each rendered report article gets a star button near the title area:

- Empty star means not saved.
- Filled star means saved.
- Clicking toggles the saved state in place.
- The button must have an accessible label such as `收藏文章` or `取消收藏`.
- The button must not navigate away from the report page.
- If the toggle request fails, the visual state should revert and expose a short inline or title-level failure state.

The star should be visually quiet. It is an article action, not a primary CTA.

### Favorites Page

`/favorites` shows saved articles across all reports.

Default sort:

- `收藏时间` descending.

Available sort modes:

- `收藏时间`
- `综合推荐`
- `最新发布`

Each saved item should show:

- title
- source
- category
- saved time
- original published time when available
- report date where it was first saved or last seen
- summary when available
- excerpt when summary is missing
- links to the original article and the report date
- a filled star to unsave

Empty state:

- A calm message that no articles have been saved yet.
- A link back to the latest report.

## Data Model

### SavedArticle

Add a new model for the single-user collection:

```prisma
model SavedArticle {
  id              String   @id @default(cuid())
  url             String   @unique
  title           String
  sourceId        String?
  sourceName      String?
  category        Category?
  excerpt         String?
  summary         String?
  meta            String?
  publishedAt     DateTime?
  firstReportDate String?
  lastReportDate  String?
  savedAt         DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Rationale:

- URL is the stable dedupe key.
- Report articles are snapshots and may be deleted/recreated when a date is regenerated.
- Saved articles should survive report regeneration.
- Keeping the core article fields on `SavedArticle` makes `/favorites` robust even if a report snapshot changes later.

### ReportArticle Sorting Fields

Enhance `ReportArticle` with stable sort metadata:

```prisma
sourceRank           Int?
engagementScore      Float?
heatScore            Float?
recommendationScore  Float?
recommendationReason String?
```

Rationale:

- The report renderer can sort without reparsing source-specific metadata strings.
- The favorites page can reuse the same recommendation score.
- Recommendation reasons make the sorting explainable without showing fake precision.

## Recommendation Sorting

Default report ordering should become `综合推荐`, implemented as rules plus editorial weighting.

### Source Signals

Use real signals when a source provides them:

- GitHub Trending: stars today, total stars, source order.
- Hacker News: points, comments.
- V2EX: replies.
- Hugging Face Papers: upvotes.
- AttentionVC leaderboard: rank or score from the upstream leaderboard.
- RSS-only news sources: no fake heat signal; use published time and source ordering.

### Normalized Fields

Each fetched article should receive source-agnostic ranking metadata before persistence:

- `sourceRank`: order within the source feed when meaningful.
- `engagementScore`: raw comparable source-local engagement value when available.
- `heatScore`: normalized 0-100 source-local heat score.
- `recommendationScore`: final cross-source score used for sorting.
- `recommendationReason`: short human-readable explanation such as `GitHub 今日星标增长靠前` or `发布时间较新`.

### Score Shape

Use a weighted rule, tuned for reading quality rather than leaderboard accuracy:

- source heat signal: 45%
- recency: 25%
- source rank: 20%
- diversity correction: 10%

Sources without real heat use only recency and source rank. They should not display fake heat numbers.

### Diversity Correction

Avoid long runs from the same source by applying a small penalty when neighboring items in a merged list come from the same source. This should be gentle. It should not hide legitimately important clusters.

## API Design

### GET `/api/favorites`

Purpose:

- Batch-read saved state for report-page stars.

Input:

- Query parameter containing encoded URLs, or repeated `url` params.

Output:

```json
{
  "savedUrls": ["https://example.com/article"]
}
```

### POST `/api/favorites`

Purpose:

- Toggle or set saved state for one article.

Input:

```json
{
  "url": "https://example.com/article",
  "saved": true,
  "article": {
    "title": "...",
    "sourceId": "...",
    "sourceName": "...",
    "category": "tech",
    "excerpt": "...",
    "summary": "...",
    "meta": "...",
    "publishedAt": "...",
    "reportDate": "2026-06-04"
  }
}
```

Output:

```json
{
  "saved": true
}
```

Behavior:

- `saved: true` upserts by URL.
- `saved: false` deletes by URL.
- Invalid or missing URL returns 400.

## Rendering Strategy

### React Pages

- `MainNavigation` adds `我的收藏`.
- New `/favorites` page renders from `SavedArticle`.
- The favorites page uses the same quiet visual language as archive and admin pages, but should feel like a reading list rather than an admin table.

### Self-Contained Report HTML

Report HTML needs star controls because dated reports are served from stored HTML.

Implementation direction:

- Extend report article rendering with a star button and article metadata in `data-*` attributes or a compact JSON script block.
- Inject a small script that:
  - batches article URLs to read saved state
  - updates star states after load
  - posts toggle requests on click
  - handles failure by reverting state
- Keep the script small and dependency-free.

## Error Handling

- If favorite state loading fails, stars render in the unsaved state and remain clickable.
- If saving fails, revert the visual state and expose a short title on the button.
- If the favorites page has no data, show the empty state.
- If a saved article no longer exists in any report, keep it in favorites because `SavedArticle` stores its own snapshot.

## Testing Plan

Add or update smoke tests for:

- `schema.prisma` includes `SavedArticle`.
- `MainNavigation` includes `/favorites`.
- report HTML includes star buttons and favorite API references.
- `/favorites` page file exists and reads saved articles.
- favorite API route files exist and validate URLs.
- ranking metadata fields exist on `ReportArticle`.
- recommendation score helper handles:
  - sources with engagement signals
  - sources without engagement signals
  - missing published dates
  - source-rank preservation

Run:

- `npm test`
- `npm run build`

If Docker runtime is changed or Prisma migrations are added, also run:

- `npm exec prisma generate`
- `npm run db:deploy` against the local Docker database
- `docker compose build web worker`
- `docker compose up -d web worker`
- HTTP probes for `/report/{date}`, `/favorites`, and favorite API routes

## Rollout Notes

- This change requires a Prisma migration.
- Existing reports will not have ranking metadata until regenerated, unless a backfill is added.
- The favorite star can still work on old reports if the injected HTML path is used at response time. Newly generated reports should include stars natively.
- Do not push to GitHub unless the user explicitly asks.
