"use client";

import { BrainCircuit, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";

export function Brand() {
  return <div className="flex items-center gap-3 px-2"><svg viewBox="0 0 64 64" className="size-8 flex-none" aria-hidden="true"><rect x="0.5" y="0.5" width="63" height="63" rx="14" fill="#0B1522" stroke="#67E8F9" strokeOpacity="0.25" /><circle cx="32" cy="32" r="17.5" fill="none" stroke="#67E8F9" strokeWidth="4" /><circle cx="32" cy="32" r="4.5" fill="#0891B2" /><circle cx="44.4" cy="19.6" r="5" fill="#67E8F9" /></svg><div className="min-w-0 group-data-[collapsible=icon]:hidden"><div className="text-[15px] font-semibold tracking-[-0.02em] text-white">OneLearn</div><div className="text-[11px] tracking-[0.16em] text-slate-500">MASTERY OS</div></div></div>;
}

export function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof BrainCircuit }) {
  return <article className="metric-card"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><span className="icon-well"><Icon className="size-4" /></span></div><div className="mt-5 text-[2rem] font-medium leading-none tracking-[-0.05em] text-white">{value}</div><p className="mt-2 text-xs text-slate-500">{detail}</p></article>;
}

export function PageHeading({ kicker, title, detail, children }: { kicker: string; title: string; detail: string; children: React.ReactNode }) {
  return <div className="page-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{detail}</p></div>{children}</div>;
}

export function LocaleSwitch({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  return <div className="locale-switch" role="group" aria-label={pick(locale, "界面语言", "Interface language")}><Languages aria-hidden="true" /><button type="button" aria-pressed={locale === "zh"} className={cn(locale === "zh" && "is-active")} onClick={() => onChange("zh")}>中</button><button type="button" aria-pressed={locale === "en"} className={cn(locale === "en" && "is-active")} onClick={() => onChange("en")}>EN</button></div>;
}
