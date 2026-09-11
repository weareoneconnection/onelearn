"use client";

import { GraduationCap, LayoutDashboard, LibraryBig, Menu, TimerReset } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import type { View } from "./types";

const tabs: Array<{ id: View; zh: string; en: string; icon: typeof LayoutDashboard; related?: View[] }> = [
  { id: "dashboard", zh: "今日", en: "Today", icon: LayoutDashboard },
  { id: "catalog", zh: "课程", en: "Courses", icon: LibraryBig, related: ["path"] },
  { id: "learn", zh: "学习", en: "Learn", icon: GraduationCap, related: ["practice"] },
  { id: "review", zh: "复习", en: "Review", icon: TimerReset, related: ["proof"] },
];

/** Bottom tab bar for phones; the full navigation stays in the sidebar sheet behind "More". */
export function MobileTabBar({ view, locale, dueReviews, onNavigate }: { view: View; locale: Locale; dueReviews: number; onNavigate: (view: View) => void }) {
  const { setOpenMobile } = useSidebar();
  const moreActive = !tabs.some((tab) => tab.id === view || tab.related?.includes(view));
  const itemClass = "relative flex h-16 flex-col items-center justify-center gap-1 text-[12px] text-slate-500 transition-colors active:bg-white/5";
  return <nav aria-label={pick(locale, "主要导航", "Main navigation")} className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#08101c]/95 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
    <div className="grid grid-cols-5">
      {tabs.map((tab) => {
        const active = view === tab.id || Boolean(tab.related?.includes(view));
        return <button key={tab.id} type="button" onClick={() => onNavigate(tab.id)} aria-current={active ? "page" : undefined} className={cn(itemClass, active && "text-cyan-200")}>
          <tab.icon className="size-5" />
          <span>{pick(locale, tab.zh, tab.en)}</span>
          {tab.id === "review" && dueReviews > 0 && <i className="absolute left-1/2 top-2 ml-1.5 min-w-[1.1rem] rounded-full bg-amber-400 px-1 text-center text-[11px] font-semibold not-italic leading-[1.1rem] text-slate-950">{dueReviews > 9 ? "9+" : dueReviews}</i>}
        </button>;
      })}
      <button type="button" onClick={() => setOpenMobile(true)} className={cn(itemClass, moreActive && "text-cyan-200")}>
        <Menu className="size-5" />
        <span>{pick(locale, "更多", "More")}</span>
      </button>
    </div>
  </nav>;
}
