import Link from "next/link";
import { requireAdmin } from "@/lib/web/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const navItems = [
    { href: "/", label: "首页" },
    { href: "/report", label: "最新简报" },
    { href: "/admin/sources", label: "源管理" },
    { href: "/admin/runs", label: "生成记录" },
  ];

  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-8">
      <header className="mb-8 rounded-3xl bg-neutral-950 px-4 py-3 text-white shadow-lg shadow-stone-900/10 md:flex md:items-center md:justify-between md:gap-4">
        <Link href="/admin" className="block text-xl font-semibold tracking-tight">
          DailyBrief
          <span className="ml-2 text-sm font-medium text-neutral-400">控制台</span>
        </Link>
        <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-300 md:mt-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 transition hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950 focus:outline-none focus:ring-2 focus:ring-white/30 active:translate-y-0"
            >
              {item.label}
            </Link>
          ))}
          <form action="/admin/logout" method="post">
            <button
              className="rounded-full px-3.5 py-2 text-neutral-300 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30 active:translate-y-0"
              type="submit"
            >
              退出
            </button>
          </form>
        </nav>
      </header>
      {children}
    </main>
  );
}
