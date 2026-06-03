"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/report", label: "首页" },
  { href: "/archive", label: "历史归档" },
  { href: "/admin", label: "管理后台" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/report") {
    return pathname === "/" || pathname === "/report" || pathname.startsWith("/report/");
  }
  if (href === "/admin") {
    return pathname.startsWith("/admin");
  }
  if (href === "/archive") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      pathname.startsWith("/report/") ||
      pathname.startsWith("/reports/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNavigation({ actions }: Readonly<{ actions?: React.ReactNode }>) {
  const pathname = usePathname();
  const isProtectedAdminPath = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const resolvedActions =
    actions ??
    (isProtectedAdminPath ? (
      <form action="/admin/logout" method="post">
        <button
          className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-neutral-500 transition duration-200 hover:bg-neutral-100 hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 active:translate-y-px"
          type="submit"
        >
          退出
        </button>
      </form>
    ) : null);

  return (
    <header className="fixed left-1/2 top-4 z-50 w-[min(calc(100%-2rem),1180px)] -translate-x-1/2 md:top-6">
      <div className="flex flex-col gap-3 rounded-[1.75rem] bg-white/86 p-2 shadow-sm shadow-stone-900/5 ring-1 ring-black/10 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="group flex min-h-12 items-center rounded-[1.25rem] px-3.5 transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-950/15"
        >
          <span className="text-lg font-semibold tracking-tight text-neutral-950">DailyBrief</span>
          <span className="ml-2 text-sm font-medium text-neutral-500">每日简报</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex rounded-[1.25rem] bg-neutral-100 p-1 text-sm font-semibold text-neutral-500">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "rounded-2xl px-4 py-2.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-950/15 active:translate-y-px",
                    active
                      ? "bg-neutral-950 text-white shadow-sm shadow-stone-900/10"
                      : "hover:bg-white hover:text-neutral-950",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {resolvedActions ? <div className="flex items-center gap-2">{resolvedActions}</div> : null}
        </div>
      </div>
    </header>
  );
}
