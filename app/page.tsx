export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-[min(100%-2rem,1180px)] flex-col justify-center py-16">
      <p className="text-sm font-semibold text-briefMuted">DailyBrief Web</p>
      <h1 className="mt-3 text-5xl font-bold tracking-normal">今日简报</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700">
        Web shell is ready. Report and admin routes will be added in the next tasks.
      </p>
    </main>
  );
}
