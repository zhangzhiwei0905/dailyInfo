import { clearAdminSession } from "@/lib/web/auth";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

export async function POST() {
  await clearAdminSession();
  return redirectTo("/admin/login");
}
