import { requireAdmin } from "@/lib/web/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <main className="mx-auto min-h-dvh w-[min(100%-2rem,1180px)] pb-8 md:pb-10">
      {children}
    </main>
  );
}
