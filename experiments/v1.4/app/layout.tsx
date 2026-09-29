import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://amadeus-kurisu-assistant.amber-camel-9796.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Amadeus v1.4 · 世界线观测终端",
  description: "以独立世界线会话、实时信息、Phone Trigger 与交互式人物为核心的 Amadeus 观测终端。",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Amadeus v1.4 · 世界线观测终端",
    description: "切换世界线即开启新对话的 Amadeus 世界线观测终端。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "AMADEUS v1.4 · WORLD LINE OBSERVATION CLIENT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amadeus v1.4 · 世界线观测终端",
    description: "切换世界线即开启新对话的 Amadeus 世界线观测终端。",
    images: ["/og.png"],
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
