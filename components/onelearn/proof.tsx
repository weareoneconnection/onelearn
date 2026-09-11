"use client";

import { ChevronRight, Orbit, ShieldCheck, Trophy } from "lucide-react";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import type { MasteryOverview } from "./types";
import { PageHeading } from "./ui";

export function ProofView({ locale, mastery }: { locale: Locale; mastery: MasteryOverview | null }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const mastered = (mastery?.records ?? []).filter((record) => record.mastered).sort((a, b) => (b.lastEvidenceAt ?? 0) - (a.lastEvidenceAt ?? 0));
  const summary = mastery?.summary;
  const lastVerified = mastered[0]?.lastEvidenceAt;
  const stats: Array<[string, string]> = [
    [l("已掌握节点", "Mastered nodes"), `${mastered.length} / ${summary?.tracked ?? 0}`],
    [l("独立答对", "Unassisted passes"), String(summary?.unassistedPasses ?? 0)],
    [l("延迟复测通过", "Delayed reviews passed"), String(summary?.delayedReviews ?? 0)],
    [l("最近验证", "Last verified"), lastVerified ? new Date(lastVerified * 1000).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US") : "—"],
  ];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("掌握护照", "MASTERY PASSPORT")} title={l("以证据证明能力", "Capability, backed by evidence")} detail={l("只有同时具备应用证据、独立答对和隔天复测通过的节点，才会出现在这里。", "A node appears here only with application evidence, an unassisted pass, and a delayed review.")}><span className="time-chip">{l(`平均保持率 ${summary?.averageRetention ?? 0}%`, `Avg. retention ${summary?.averageRetention ?? 0}%`)}</span></PageHeading><article className="passport-card"><div className="passport-glow" /><div className="relative z-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="size-4" /> {mastered.length ? l("已验证能力", "VERIFIED CAPABILITY") : l("尚未验证", "NOT YET VERIFIED")}</div><h2 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white">{mastered[0]?.nodeTitle ?? l("你的第一项已验证能力", "Your first verified capability")}</h2><p className="mt-2 text-slate-400">{mastered.length ? l(`${mastered.length} 个节点通过掌握验证`, `${mastered.length} nodes passed mastery verification`) : l("完成练习，并在隔天复习中再次答对即可获得。", "Pass practice, then answer correctly again in a review the next day.")}</p></div><div className="passport-seal"><Orbit /></div></div><div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></article>{mastered.length ? <div className="grid gap-4 md:grid-cols-2">{mastered.map((record) => <article key={`${record.courseVersionId}:${record.nodeKey}`} className="surface-card flex items-center gap-4 p-5"><span className="source-icon"><Trophy /></span><div className="flex-1"><h2 className="text-sm font-medium text-white">{record.nodeTitle}</h2><p className="mt-1 text-xs text-slate-500">{l(`掌握度 ${record.score}% · 独立答对 ${record.unassistedPasses} 次 · 延迟复测 ${record.reviewPasses} 次`, `Mastery ${record.score}% · ${record.unassistedPasses} unassisted · ${record.reviewPasses} delayed reviews`)}</p></div><ChevronRight className="size-4 text-slate-600" /></article>)}</div> : <article className="ai-empty-state"><Trophy /><h2>{l("还没有已验证的能力", "No verified capabilities yet")}</h2><p>{l("一次答对不算掌握：需要独立完成练习，并在至少 20 小时后的复习中再次答对。", "One correct answer is not mastery: pass practice on your own, then again in a review at least 20 hours later.")}</p></article>}</div>;
}
