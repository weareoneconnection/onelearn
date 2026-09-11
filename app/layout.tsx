import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://onelearn-mastery-os.king-ma-7068.chatgpt.site"),
  title: "OneLearn — Mastery OS",
  description: "覆盖 32 个学院与 1,000+ 学习路径，把任何可信知识转化为持久、可验证的能力。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    title: "OneLearn — Mastery OS",
    description: "覆盖 32 个学院与 1,000+ 学习路径，把任何可信知识转化为持久、可验证的能力。",
    siteName: "OneLearn",
  },
  twitter: {
    card: "summary",
    title: "OneLearn — Mastery OS",
    description: "覆盖 32 个学院与 1,000+ 学习路径，把任何可信知识转化为持久、可验证的能力。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
