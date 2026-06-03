import Link from "next/link";

export function ReportShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] py-10">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-black/10 pb-5">
        <Link href="/" className="text-lg font-bold">
          DailyBrief
        </Link>
        <nav className="flex gap-4 text-sm text-neutral-600">
          <Link href="/archive">历史归档</Link>
          <Link href="/admin">管理</Link>
        </nav>
      </header>
      <h1 className="text-4xl font-bold tracking-normal">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}
