import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amadeus · 智能助手终端",
  description: "由 DeepSeek 驱动的本地智能助手交互终端。",
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
