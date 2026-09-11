import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.ONELEARN_SITE_URL?.trim() || "https://www.onelearn.ltd"),
  title: "OneLearn — Mastery OS",
  description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    type: "website",
    title: "OneLearn — Mastery OS",
    description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
    siteName: "OneLearn",
  },
  twitter: {
    card: "summary",
    title: "OneLearn — Mastery OS",
    description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
