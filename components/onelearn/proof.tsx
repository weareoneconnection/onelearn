"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy, Link2, LoaderCircle, Orbit, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { track } from "@/lib/onelearn/analytics";
import { oneLearnFetch } from "./client";
import type { MasteryOverview } from "./types";
import { PageHeading } from "./ui";

/** Creates, copies, and revokes the public passport link (signed-in learners only). */
function ShareProof({ locale, signedIn }: { locale: Locale; signedIn: boolean }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [url, setUrl] = useState<string | null | undefined>(signedIn ? undefined : null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void oneLearnFetch(`/api/proof/share?locale=${locale}`).then(async (response) => {
      const payload = await response.json() as { url?: string | null };
      if (active) setUrl(response.ok ? payload.url ?? null : null);
    }).catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [signedIn, locale]);

  const change = async (method: "POST" | "DELETE") => {
    setBusy(true); setError(""); setCopied(false);
    try {
      const response = await oneLearnFetch(`/api/proof/share?locale=${locale}`, { method });
      const payload = await response.json() as { url?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error || l("操作失败，请重试", "Something went wrong. Please retry"));
      setUrl(payload.url ?? null);
      if (method === "POST") track("proof_shared");
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : String(changeError));
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => setError(l("无法自动复制，请手动选中链接", "Couldn't copy automatically — select the link manually")));
  };

  return <section className="surface-card p-5 sm:p-6">
    <div className="flex items-start gap-4"><span className="source-icon"><Link2 /></span><div className="min-w-0 flex-1">
      <h2 className="text-sm font-medium text-white">{l("公开分享掌握护照", "Share your passport publicly")}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{l("生成一个公开链接，可以放进简历或发给朋友。只显示你的名字和已通过验证的能力，不会显示邮箱；随时可以撤销。", "Get a public link for your résumé or friends. It shows only your name and verified capabilities — never your email — and you can revoke it anytime.")}</p>
      {!signedIn ? <p className="mt-3 text-xs text-amber-300">{l("登录后才能生成公开链接。", "Sign in to create a public link.")}</p>
        : url === undefined ? <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="size-3 animate-spin" />{l("读取中…", "Loading…")}</p>
        : url ? <div className="mt-3 flex flex-wrap items-center gap-2"><code className="min-w-0 max-w-full truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-cyan-200">{url}</code><Button onClick={() => void copy()} size="sm" variant="outline" className="secondary-pill">{copied ? <Check /> : <Copy />}{copied ? l("已复制", "Copied") : l("复制", "Copy")}</Button><Button onClick={() => void change("DELETE")} disabled={busy} size="sm" variant="ghost" className="text-rose-300 hover:text-rose-200">{l("撤销链接", "Revoke")}</Button></div>
        : <Button onClick={() => void change("POST")} disabled={busy} className="primary-pill mt-3">{busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}{l("生成公开链接", "Create public link")}</Button>}
      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div></div>
  </section>;
}

export function ProofView({ locale, mastery, signedIn }: { locale: Locale; mastery: MasteryOverview | null; signedIn: boolean }) {
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
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("掌握护照", "MASTERY PASSPORT")} title={l("以证据证明能力", "Capability, backed by evidence")} detail={l("只有同时具备应用证据、独立答对和隔天复测通过的节点，才会出现在这里。", "A node appears here only with application evidence, an unassisted pass, and a delayed review.")}><span className="time-chip">{l(`平均保持率 ${summary?.averageRetention ?? 0}%`, `Avg. retention ${summary?.averageRetention ?? 0}%`)}</span></PageHeading><article className="passport-card"><div className="passport-glow" /><div className="relative z-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="size-4" /> {mastered.length ? l("已验证能力", "VERIFIED CAPABILITY") : l("尚未验证", "NOT YET VERIFIED")}</div><h2 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white">{mastered[0]?.nodeTitle ?? l("你的第一项已验证能力", "Your first verified capability")}</h2><p className="mt-2 text-slate-400">{mastered.length ? l(`${mastered.length} 个节点通过掌握验证`, `${mastered.length} nodes passed mastery verification`) : l("完成练习，并在隔天复习中再次答对即可获得。", "Pass practice, then answer correctly again in a review the next day.")}</p></div><div className="passport-seal"><Orbit /></div></div><div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></article><ShareProof locale={locale} signedIn={signedIn} />{mastered.length ? <div className="grid gap-4 md:grid-cols-2">{mastered.map((record) => <article key={`${record.courseVersionId}:${record.nodeKey}`} className="surface-card flex items-center gap-4 p-5"><span className="source-icon"><Trophy /></span><div className="flex-1"><h2 className="text-sm font-medium text-white">{record.nodeTitle}</h2><p className="mt-1 text-xs text-slate-500">{l(`掌握度 ${record.score}% · 独立答对 ${record.unassistedPasses} 次 · 延迟复测 ${record.reviewPasses} 次`, `Mastery ${record.score}% · ${record.unassistedPasses} unassisted · ${record.reviewPasses} delayed reviews`)}</p></div><ChevronRight className="size-4 text-slate-600" /></article>)}</div> : <article className="ai-empty-state"><Trophy /><h2>{l("还没有已验证的能力", "No verified capabilities yet")}</h2><p>{l("一次答对不算掌握：需要独立完成练习，并在至少 20 小时后的复习中再次答对。", "One correct answer is not mastery: pass practice on your own, then again in a review at least 20 hours later.")}</p></article>}</div>;
}
