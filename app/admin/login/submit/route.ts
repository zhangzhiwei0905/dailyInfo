import {
  ADMIN_COOKIE_NAME,
  adminSessionCookieOptions,
  createSessionValue,
  verifyPassword,
} from "@/lib/web/auth";
import { canonicalizeLocalhost } from "@/lib/web/admin-host";

export const dynamic = "force-dynamic";

function redirectTo(path: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: path },
  });
}

export function GET() {
  return redirectTo("/admin/login");
}

export async function POST(request: Request) {
  const canonicalUrl = canonicalizeLocalhost(request.headers.get("host"), "/admin/login");
  if (canonicalUrl) {
    return redirectTo(canonicalUrl);
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    return redirectTo("/admin/login?error=1");
  }

  const response = redirectTo("/admin");
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${createSessionValue()}; Path=${adminSessionCookieOptions().path}; HttpOnly; SameSite=Lax${
      adminSessionCookieOptions().secure ? "; Secure" : ""
    }`,
  );
  return response;
}
