"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { oneLearnFetch } from "./client";

type Category = "bug" | "billing" | "content" | "suggestion" | "other";

export function FeedbackDialog({ locale, open, onOpenChange, page }: { locale: Locale; open: boolean; onOpenChange: (open: boolean) => void; page: string }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const categories: Array<[Category, string]> = [
    ["bug", l("功能故障", "Something broke")],
    ["billing", l("付款与账单", "Billing")],
    ["content", l("课程内容有误", "Content issue")],
    ["suggestion", l("功能建议", "Suggestion")],
    ["other", l("其他", "Other")],
  ];
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const close = (next: boolean) => {
    if (busy) return;
    onOpenChange(next);
    if (!next) { setSent(false); setError(""); }
  };
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const response = await oneLearnFetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, category, message, page }),
      });
      const payload = await response.json() as { received?: boolean; error?: string };
      if (!response.ok || !payload.received) throw new Error(payload.error || l("提交失败，请稍后再试", "Could not send. Please try again."));
      setSent(true);
      setMessage("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : l("提交失败，请稍后再试", "Could not send. Please try again."));
    } finally { setBusy(false); }
  };

  return <Dialog open={open} onOpenChange={close}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-lg">
    <DialogHeader><DialogTitle>{l("帮助与反馈", "Help & feedback")}</DialogTitle><DialogDescription className="text-slate-400">{l("遇到问题或有建议？告诉我们，运营团队会在后台逐条处理。", "Hit a problem or have an idea? Tell us — every message is triaged by the team.")}</DialogDescription></DialogHeader>
    {sent ? <div className="feedback-box"><Check /><div><strong>{l("已收到，谢谢你", "Received — thank you")}</strong><p>{l("我们会尽快处理。涉及付款的问题，请同时保留账单编号。", "We'll look into it soon. For billing issues, keep your invoice number handy.")}</p></div></div> : <>
      <div className="group-tabs" role="radiogroup" aria-label={l("反馈类型", "Feedback type")}>{categories.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={category === id} className={cn(category === id && "is-active")} onClick={() => setCategory(id)}>{label}</button>)}</div>
      <Textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} maxLength={4000} placeholder={l("请描述发生了什么、你期望的结果，以及出现问题的页面…", "Describe what happened, what you expected, and where…")} className="border-white/10 bg-white/5 text-white placeholder:text-slate-600" />
      {error && <p className="source-error"><TriangleAlert />{error}</p>}
    </>}
    <DialogFooter className="items-center sm:justify-between"><p className="text-xs text-slate-500"><Link href="/terms" target="_blank" className="underline">{l("用户协议", "Terms")}</Link> · <Link href="/privacy" target="_blank" className="underline">{l("隐私政策", "Privacy")}</Link> · <Link href="/refund" target="_blank" className="underline">{l("退款规则", "Refunds")}</Link></p>{sent ? <Button onClick={() => close(false)} className="primary-pill">{l("完成", "Done")}</Button> : <Button disabled={busy || message.trim().length < 5} onClick={() => void submit()} className="primary-pill">{busy && <LoaderCircle className="animate-spin" />}{l("发送反馈", "Send feedback")}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}
