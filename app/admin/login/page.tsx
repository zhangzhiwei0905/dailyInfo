import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canonicalizeLocalhost } from "@/lib/web/admin-host";
import { hasAdminSession } from "@/lib/web/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, headerStore, loggedIn] = await Promise.all([searchParams, headers(), hasAdminSession()]);
  const canonicalUrl = canonicalizeLocalhost(headerStore.get("host"), "/admin/login");
  if (canonicalUrl) {
    redirect(canonicalUrl);
  }
  if (loggedIn) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-[min(100%-2rem,440px)] flex-col justify-center">
      <h1 className="text-4xl font-bold">后台登录</h1>
      <form
        action="/admin/login/submit"
        method="post"
        className="mt-8 grid gap-4 rounded-2xl border border-black/10 bg-white/70 p-6"
      >
        <label className="grid gap-2 text-sm font-semibold">
          管理密码
          <input
            name="password"
            type="password"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-base"
            required
          />
        </label>
        {params.error ? <p className="text-sm text-red-700">密码不正确。</p> : null}
        <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white" type="submit">
          登录
        </button>
      </form>
    </main>
  );
}
