import type { Metadata, Viewport } from "next";
import "./globals.css";

// viewport-fit=cover lets the mobile tab bar sit above the iPhone home indicator via safe-area insets.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060b13",
};

export const metadata: Metadata = {
  appleWebApp: { capable: true, title: "OneLearn", statusBarStyle: "black-translucent" },
  metadataBase: new URL(process.env.ONELEARN_SITE_URL?.trim() || "https://www.onelearn.ltd"),
  title: "OneLearn — Mastery OS",
  description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    title: "OneLearn — Mastery OS",
    description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
    siteName: "OneLearn",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OneLearn — Mastery OS" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
    title: "OneLearn — Mastery OS",
    description: "OpenAI 驱动的中英文双语学习系统，为 32 个学院和 1,000+ 学习路径按需生成课程。",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" className="dark"><body>{children}</body></html>;
}
