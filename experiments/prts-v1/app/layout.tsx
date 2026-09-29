import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRTS · Amadeus Archive",
  description: "PRTS 是仅供本地预览的 Amadeus 档案终端变体。",
  robots: { index: false, follow: false },
  icons: {
    icon: "/rhodes-island-user-supplied.png",
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
