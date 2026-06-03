import Link from "next/link";
import { requireAdmin } from "@/lib/web/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-8">
      <header className="mb-8 flex items-center justify-between border-b border-black/10 pb-5">
        <Link href="/admin" className="text-xl font-bold">
          DailyBrief Admin
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href="/admin/sources">源管理</Link>
          <Link href="/admin/runs">生成记录</Link>
          <Link href="/admin/logout">退出</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
