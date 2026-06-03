"use server";

import { redirect } from "next/navigation";
import { setAdminSession, verifyPassword } from "@/lib/web/auth";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin");
}
