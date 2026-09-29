import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amadeus v1.3 · 世界线记忆终端",
  description: "具有世界线记忆分支、实时天气时间工具、Phone Trigger 与交互式虚拟人物的 Amadeus 智能助手。",
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
