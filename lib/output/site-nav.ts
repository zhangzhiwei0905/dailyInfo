import { publicNavItems, publicNavMetrics } from "../web/navigation";

const REPORT_SITE_NAV_STYLES_START = "/* dailybrief-report-site-nav:start */";
const REPORT_SITE_NAV_STYLES_END = "/* dailybrief-report-site-nav:end */";

export function renderReportSiteNav(date: string): string {
  return `<nav class="site-nav" aria-label="站点导航">
    <a class="site-brand" href="/report">DailyBrief<span>每日简报</span></a>
    <div class="site-nav-links">
      ${publicNavItems
        .map((item) => {
          const activeClass = item.href === "/report" ? " active" : "";
          const activeAttr = item.href === "/report" ? ' aria-current="page"' : "";
          return `<a class="site-nav-link${activeClass}" href="${item.href}"${activeAttr}>${item.label}</a>`;
        })
        .join("\n      ")}
    </div>
  </nav>`;
}

export function reportSiteNavStyles(): string {
  return `${REPORT_SITE_NAV_STYLES_START}
  .site-nav {
    display: flex;
    flex-direction: column;
    gap: ${publicNavMetrics.shellGap};
    position: fixed;
    left: 50%;
    top: ${publicNavMetrics.shellTop};
    z-index: 50;
    width: ${publicNavMetrics.shellWidth};
    transform: translateX(-50%);
    margin: 0;
    padding: ${publicNavMetrics.shellPadding};
    border: 1px solid var(--rule);
    border-radius: ${publicNavMetrics.shellRadius};
    background: color-mix(in srgb, var(--bg-elevated) 86%, transparent);
    box-shadow: 0 1px 2px rgba(45, 42, 35, 0.05);
    backdrop-filter: blur(18px);
  }
  .main-nav-spacer { padding-top: ${publicNavMetrics.mobileSpacer}; }
  .site-brand {
    display: inline-flex;
    min-height: ${publicNavMetrics.brandMinHeight};
    align-items: center;
    gap: ${publicNavMetrics.brandGap};
    padding: ${publicNavMetrics.brandPadding};
    border-radius: ${publicNavMetrics.brandRadius};
    color: var(--fg);
    font-size: ${publicNavMetrics.brandFontSize};
    font-weight: ${publicNavMetrics.brandFontWeight};
    letter-spacing: 0;
    text-decoration: none;
    transition: background 0.2s ease;
  }
  .site-brand span {
    color: var(--muted);
    font-size: ${publicNavMetrics.brandSubtitleFontSize};
    font-weight: ${publicNavMetrics.brandSubtitleFontWeight};
  }
  .site-brand:hover { background: var(--card); }
  .site-nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: ${publicNavMetrics.linkGroupGap};
    padding: ${publicNavMetrics.linkGroupPadding};
    border-radius: ${publicNavMetrics.linkGroupRadius};
    background: color-mix(in srgb, var(--card) 86%, transparent);
  }
  .site-nav-link {
    border-radius: ${publicNavMetrics.linkRadius};
    padding: ${publicNavMetrics.linkPadding};
    color: var(--muted);
    font-size: ${publicNavMetrics.linkFontSize};
    font-weight: ${publicNavMetrics.linkFontWeight};
    text-decoration: none;
    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }
  .site-nav-link:hover {
    background: var(--bg-elevated);
    color: var(--fg);
    transform: translateY(-1px);
  }
  .site-nav-link.active {
    background: var(--accent);
    color: var(--accent-fg);
    box-shadow: 0 1px 2px rgba(45, 42, 35, 0.1);
  }
  @media (min-width: ${publicNavMetrics.desktopBreakpoint}) {
    .site-nav { top: ${publicNavMetrics.shellDesktopTop}; }
    .main-nav-spacer { padding-top: ${publicNavMetrics.desktopSpacer}; }
    .site-nav {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .site-nav-links { flex-wrap: nowrap; }
  }
  ${REPORT_SITE_NAV_STYLES_END}`;
}

function upsertReportSiteNavStyles(html: string): string {
  const styles = reportSiteNavStyles();
  const markedStyles = new RegExp(
    `${escapeRegExp(REPORT_SITE_NAV_STYLES_START)}[\\s\\S]*?${escapeRegExp(REPORT_SITE_NAV_STYLES_END)}`,
  );
  if (markedStyles.test(html)) {
    return html.replace(markedStyles, styles);
  }
  return html.replace("</style>", `${styles}\n</style>`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function injectReportSiteNav(html: string, date: string): string {
  if (html.includes('class="site-nav"')) {
    const withNav = html.replace(
      /<nav class="site-nav" aria-label="站点导航">[\s\S]*?<\/nav>/,
      renderReportSiteNav(date),
    );
    return upsertReportSiteNavStyles(withNav);
  }
  const withStyles = upsertReportSiteNavStyles(html);
  return withStyles.replace("<main>", `<main class="main-nav-spacer">\n  ${renderReportSiteNav(date)}`);
}

function reportFavoriteFallbackStyles(): string {
  return `.article-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2.25rem;
    align-items: start;
    gap: 0.65rem;
  }
  .favorite-star {
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--bg-elevated);
    color: var(--muted);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }
  .favorite-star.saved { color: var(--accent); }`;
}

function reportFavoriteFallbackScript(date: string): string {
  return `<script>
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.favorite-star'));
    if (buttons.length === 0 || !window.fetch) return;
    var urls = buttons.map(function (btn) { return btn.dataset.favoriteUrl; }).filter(Boolean);
    function setState(btn, saved) {
      btn.classList.toggle('saved', saved);
      btn.textContent = saved ? '★' : '☆';
      btn.setAttribute('aria-label', saved ? '取消收藏文章' : '收藏文章');
    }
    fetch('/api/favorites?urls=' + encodeURIComponent(urls.join('\\n')))
      .then(function (res) { return res.ok ? res.json() : { savedUrls: [] }; })
      .then(function (data) {
        var saved = new Set(data.savedUrls || []);
        buttons.forEach(function (btn) { setState(btn, saved.has(btn.dataset.favoriteUrl)); });
      })
      .catch(function () {});
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var nextSaved = !btn.classList.contains('saved');
        var article = {};
        try { article = JSON.parse(btn.dataset.favoriteArticle || '{}'); } catch (error) {}
        article.reportDate = ${JSON.stringify(date).replace(/</g, "\\u003c")};
        setState(btn, nextSaved);
        fetch('/api/favorites', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: btn.dataset.favoriteUrl, saved: nextSaved, article: article })
        })
          .then(function (res) { if (!res.ok) throw new Error('favorite failed'); return res.json(); })
          .then(function (data) { setState(btn, Boolean(data.saved)); })
          .catch(function () { setState(btn, !nextSaved); });
      });
    });
  })();
</script>`;
}

function injectFavoriteButtons(html: string): string {
  if (html.includes('class="favorite-star"')) return html;
  return html.replace(/<h3 class="article-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/g, (_match, url, title) => {
    const textTitle = String(title).replace(/<[^>]+>/g, "");
    const articleJson = JSON.stringify({ url, title: textTitle });
    const safeJson = articleJson
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<div class="article-heading"><h3 class="article-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3><button class="favorite-star" type="button" aria-label="收藏文章" title="收藏文章" data-favorite-url="${url}" data-favorite-article="${safeJson}">☆</button></div>`;
  });
}

export function injectReportFavorites(html: string, date: string): string {
  const withButtons = injectFavoriteButtons(html);
  const withStyles = withButtons.includes(".favorite-star")
    ? withButtons
    : withButtons.replace("</style>", `${reportFavoriteFallbackStyles()}\n</style>`);
  if (withStyles.includes("/api/favorites?urls=")) return withStyles;
  return withStyles.replace("</body>", `${reportFavoriteFallbackScript(date)}\n</body>`);
}

export function prepareReportFrameHtml(html: string, date: string): string {
  const withoutEmbeddedNav = removeEmbeddedReportSiteNav(html);
  const withMainSpacingRemoved = withoutEmbeddedNav
    .replace(/<main class="main-nav-spacer">/, "<main>")
    .replace(/<main class="[^"]*\bmain-nav-spacer\b[^"]*">/, "<main>");
  return injectReportFavorites(withMainSpacingRemoved, date);
}

function removeEmbeddedReportSiteNav(html: string): string {
  return html
    .replace(
      new RegExp(
        `${escapeRegExp(REPORT_SITE_NAV_STYLES_START)}[\\s\\S]*?${escapeRegExp(REPORT_SITE_NAV_STYLES_END)}\\s*`,
      ),
      "",
    )
    .replace(/\s*<nav class="site-nav" aria-label="站点导航">[\s\S]*?<\/nav>\s*/, "\n");
}
