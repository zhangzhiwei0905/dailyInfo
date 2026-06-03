import type { Metadata } from "next";
import { MainNavigation } from "@/components/public/MainNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "DailyBrief",
  description: "DailyBrief web reports and source management",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh">
        <MainNavigation />
        <div className="main-nav-spacer">{children}</div>
      </body>
    </html>
  );
}
