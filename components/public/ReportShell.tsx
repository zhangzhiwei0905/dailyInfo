export function ReportShell({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] pb-8 md:pb-10">
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}
