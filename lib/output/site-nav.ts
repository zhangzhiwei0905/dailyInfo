export function renderReportSiteNav(date: string): string {
  return `<nav class="site-nav" aria-label="站点导航">
    <a class="site-brand" href="/report">DailyBrief<span>每日简报</span></a>
    <div class="site-nav-links">
      <a class="site-nav-link active" href="/report" aria-current="page">首页</a>
      <a class="site-nav-link" href="/archive">历史归档</a>
      <a class="site-nav-link" href="/admin">管理后台</a>
    </div>
  </nav>`;
}

export function reportSiteNavStyles(): string {
  return `.site-nav {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: fixed;
    left: 50%;
    top: 1rem;
    z-index: 50;
    width: min(calc(100% - 2rem), 1180px);
    transform: translateX(-50%);
    margin: 0;
    padding: 0.5rem;
    border: 1px solid var(--rule);
    border-radius: 1.75rem;
    background: color-mix(in srgb, var(--bg-elevated) 86%, transparent);
    box-shadow: 0 14px 42px rgba(45, 42, 35, 0.08);
    backdrop-filter: blur(18px);
  }
  .main-nav-spacer { padding-top: 8.5rem; }
  .site-brand {
    display: inline-flex;
    min-height: 3rem;
    align-items: center;
    gap: 0.45rem;
    padding: 0 0.85rem;
    border-radius: 1.25rem;
    color: var(--fg);
    font-size: 1.05rem;
    font-weight: 760;
    letter-spacing: 0;
    text-decoration: none;
    transition: background 0.2s ease;
  }
  .site-brand span {
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 560;
  }
  .site-brand:hover { background: var(--card); }
  .site-nav-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.25rem;
    border-radius: 1.25rem;
    background: color-mix(in srgb, var(--card) 86%, transparent);
  }
  .site-nav-link {
    border-radius: 1rem;
    padding: 0.62rem 0.95rem;
    color: var(--muted);
    font-size: 0.9rem;
    font-weight: 680;
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
    box-shadow: 0 8px 22px rgba(45, 42, 35, 0.12);
  }
  @media (min-width: 720px) {
    .site-nav { top: 1.5rem; }
    .main-nav-spacer { padding-top: 6.75rem; }
    .site-nav {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
    .site-nav-links { flex-wrap: nowrap; }
  }`;
}

export function injectReportSiteNav(html: string, date: string): string {
  if (html.includes('class="site-nav"')) return html;
  const withStyles = html.replace("</style>", `${reportSiteNavStyles()}\n</style>`);
  return withStyles.replace("<main>", `<main class="main-nav-spacer">\n  ${renderReportSiteNav(date)}`);
}
