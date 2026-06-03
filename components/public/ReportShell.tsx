import Link from "next/link";

export function ReportShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  const navItems = [
    { href: "/", label: "首页" },
    { href: "/report", label: "最新简报" },
    { href: "/archive", label: "历史归档" },
    { href: "/admin", label: "管理后台" },
  ];

  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-8 md:py-10">
      <header className="mb-8 rounded-3xl bg-white/70 px-4 py-3 shadow-sm shadow-stone-900/5 ring-1 ring-black/10 backdrop-blur md:flex md:items-center md:justify-between md:gap-4">
        <Link href="/" className="block text-lg font-semibold tracking-tight text-neutral-950">
          DailyBrief
          <span className="ml-2 text-sm font-medium text-neutral-500">每日简报</span>
        </Link>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-neutral-600 md:mt-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 transition hover:-translate-y-0.5 hover:bg-neutral-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-950/20 active:translate-y-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}
