import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE_NAME = "dailybrief_admin_v2";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) throw new Error("SESSION_SECRET must be at least 16 characters");
  return value;
}

function adminPassword(): string {
  const value = process.env.ADMIN_PASSWORD;
  if (!value) throw new Error("ADMIN_PASSWORD is required");
  return value;
}

function adminCookieSecure(): boolean {
  return process.env.ADMIN_COOKIE_SECURE === "true";
}

export function adminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: adminCookieSecure(),
    path: "/",
  };
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function verifyPassword(password: string): boolean {
  const expected = Buffer.from(adminPassword());
  const actual = Buffer.from(password);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function createSessionValue(): string {
  const payload = JSON.stringify({ role: "admin", iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  return sign(encoded) === signature;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, createSessionValue(), adminSessionCookieOptions());
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  if (!verifySessionValue(cookieStore.get(ADMIN_COOKIE_NAME)?.value)) {
    redirect("/admin/login");
  }
}

export async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionValue(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}
