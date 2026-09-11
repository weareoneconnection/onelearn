"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { oneLearnFetch } from "./client";

type Invite = { link: string; reward: number; invited: number; creditsEarned: number };

export function InviteDialog({ locale, open, onOpenChange }: { locale: Locale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void oneLearnFetch(`/api/referral?locale=${locale}`).then(async (response) => {
      const payload = await response.json() as Invite & { error?: string };
      if (!active) return;
      if (!response.ok) setError(payload.error || (locale === "zh" ? "暂时无法获取邀请链接" : "The invite link is unavailable"));
      else setInvite(payload);
    }).catch(() => { if (active) setError(locale === "zh" ? "暂时无法获取邀请链接" : "The invite link is unavailable"); });
    return () => { active = false; };
  }, [open, locale]);

  const copy = async () => {
    if (!invite) return;
    await navigator.clipboard.writeText(invite.link).then(() => setCopied(true)).catch(() => setError(l("无法自动复制，请手动选中链接", "Couldn't copy automatically — select the link manually")));
  };

  return <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setCopied(false); }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-lg">
    <DialogHeader><DialogTitle className="flex items-center gap-2"><Gift className="size-5 text-cyan-300" />{l("邀请好友一起学", "Invite friends")}</DialogTitle><DialogDescription className="text-slate-400">{l(`好友通过你的链接注册并登录后，你们各得 ${invite?.reward ?? 50} 个 AI 点数（当月有效，每月最多奖励 10 次）。`, `When a friend signs up through your link, you each get ${invite?.reward ?? 50} AI credits this month (up to 10 rewards a month).`)}</DialogDescription></DialogHeader>
    {error ? <p className="source-error"><TriangleAlert />{error}</p> : !invite ? <p className="flex items-center gap-2 py-4 text-sm text-slate-400"><LoaderCircle className="size-4 animate-spin" />{l("正在生成你的邀请链接…", "Creating your invite link…")}</p> : <>
      <div className="flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-white/5 px-3 py-2.5 text-sm text-cyan-200">{invite.link}</code><Button onClick={() => void copy()} className="primary-pill">{copied ? <Check /> : <Copy />}{copied ? l("已复制", "Copied") : l("复制链接", "Copy link")}</Button></div>
      <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-white/[0.03] p-3"><strong className="block text-2xl text-white">{invite.invited}</strong><span className="text-xs text-slate-500">{l("已邀请", "Invited")}</span></div><div className="rounded-xl bg-white/[0.03] p-3"><strong className="block text-2xl text-emerald-300">+{invite.creditsEarned}</strong><span className="text-xs text-slate-500">{l("累计获得点数", "Credits earned")}</span></div></div>
    </>}
  </DialogContent></Dialog>;
}
