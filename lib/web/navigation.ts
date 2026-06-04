export type PublicNavItem = {
  href: string;
  label: string;
};

export const publicNavItems: PublicNavItem[] = [
  { href: "/report", label: "首页" },
  { href: "/archive", label: "历史归档" },
  { href: "/favorites", label: "我的收藏" },
  { href: "/admin", label: "管理后台" },
];

export const publicNavMetrics = {
  shellWidth: "min(calc(100% - 2rem), 1180px)",
  shellTop: "1rem",
  shellDesktopTop: "1.5rem",
  shellPadding: "0.5rem",
  shellRadius: "1.75rem",
  shellGap: "0.75rem",
  brandMinHeight: "3rem",
  brandPadding: "0 0.875rem",
  brandRadius: "1.25rem",
  brandGap: "0.5rem",
  brandFontSize: "1.125rem",
  brandFontWeight: "600",
  brandSubtitleFontSize: "0.875rem",
  brandSubtitleFontWeight: "500",
  linkGroupPadding: "0.25rem",
  linkGroupGap: "0.5rem",
  linkGroupRadius: "1.25rem",
  linkPadding: "0.625rem 1rem",
  linkRadius: "1rem",
  linkFontSize: "0.875rem",
  linkFontWeight: "600",
  mobileSpacer: "8.5rem",
  desktopSpacer: "6.75rem",
  desktopBreakpoint: "768px",
};

export const publicNavClasses = {
  shell:
    "fixed left-1/2 top-4 z-50 w-[min(calc(100%-2rem),1180px)] -translate-x-1/2 md:top-6",
  frame:
    "flex flex-col gap-3 rounded-[1.75rem] bg-white/86 p-2 shadow-sm shadow-stone-900/5 ring-1 ring-black/10 backdrop-blur-xl md:flex-row md:items-center md:justify-between",
  brand:
    "group flex min-h-12 items-center rounded-[1.25rem] px-3.5 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950/15",
  brandTitle: "text-lg font-semibold text-neutral-950",
  brandSubtitle: "ml-2 text-sm font-medium text-neutral-500",
  right: "flex flex-wrap items-center gap-2",
  linkGroup: "flex rounded-[1.25rem] bg-neutral-100 p-1 text-sm font-semibold text-neutral-500",
  link:
    "rounded-2xl px-4 py-2.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 active:translate-y-px",
  linkActive: "bg-neutral-950 text-white shadow-sm shadow-stone-900/10",
  linkInactive: "hover:bg-white hover:text-neutral-950",
  action:
    "rounded-2xl px-4 py-2.5 text-sm font-semibold text-neutral-500 transition duration-200 hover:bg-neutral-100 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 active:translate-y-px",
  actions: "flex items-center gap-2",
};
