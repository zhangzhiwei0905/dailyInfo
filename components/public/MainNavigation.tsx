"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicNavClasses, publicNavItems } from "@/lib/web/navigation";

function isActivePath(pathname: string, href: string) {
  if (href === "/report") {
    return pathname === "/" || pathname === "/report" || pathname.startsWith("/report/");
  }
  if (href === "/admin") {
    return pathname.startsWith("/admin");
  }
  if (href === "/favorites") {
    return pathname === "/favorites" || pathname.startsWith("/favorites/");
  }
  if (href === "/archive") {
    return pathname === href || pathname.startsWith(`${href}/`);
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
        <button className={publicNavClasses.action} type="submit">
          退出
        </button>
      </form>
    ) : null);

  return (
    <header className={publicNavClasses.shell}>
      <div className={publicNavClasses.frame}>
        <Link href="/" className={publicNavClasses.brand}>
          <span className={publicNavClasses.brandTitle}>DailyBrief</span>
          <span className={publicNavClasses.brandSubtitle}>每日简报</span>
        </Link>
        <div className={publicNavClasses.right}>
          <nav className={publicNavClasses.linkGroup}>
            {publicNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    publicNavClasses.link,
                    active ? publicNavClasses.linkActive : publicNavClasses.linkInactive,
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {resolvedActions ? <div className={publicNavClasses.actions}>{resolvedActions}</div> : null}
        </div>
      </div>
    </header>
  );
}
