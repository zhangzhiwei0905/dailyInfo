import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
