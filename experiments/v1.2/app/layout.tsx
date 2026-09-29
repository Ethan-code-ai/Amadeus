import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amadeus v1.2 · 世界线重构终端",
  description: "具有 Phone Trigger、世界线仪表、重构噪声与交互式虚拟人物的 Amadeus 智能助手。",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
