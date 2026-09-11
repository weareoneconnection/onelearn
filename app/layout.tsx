import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://onelearn-mastery-os.king-ma-7068.chatgpt.site"),
  title: "OneLearn — Mastery OS",
  description: "中英文双语学习系统，覆盖 32 个学院与 1,000+ 学习路径。A bilingual mastery system for durable, verifiable skills.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    title: "OneLearn — Mastery OS",
    description: "中英文双语学习系统，覆盖 32 个学院与 1,000+ 学习路径。A bilingual mastery system for durable, verifiable skills.",
    siteName: "OneLearn",
  },
  twitter: {
    card: "summary",
    title: "OneLearn — Mastery OS",
    description: "中英文双语学习系统，覆盖 32 个学院与 1,000+ 学习路径。A bilingual mastery system for durable, verifiable skills.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
