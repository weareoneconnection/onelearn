"use client";

import { useEffect, useState } from "react";
import { Check, Cloud, CreditCard, Crown, FileText, Gauge, LoaderCircle, Receipt, Settings, Sparkles, TriangleAlert, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { clerkSignOut } from "@/lib/onelearn/clerk-browser";
import { track } from "@/lib/onelearn/analytics";
import { oneLearnFetch, signIn } from "./client";
import type { BillingPayload, BillingPlan } from "./types";

export function BillingView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [data, setData] = useState<BillingPayload | null>(null);
  const [interval, setInterval] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    const loadBilling = async () => {
      const response = await oneLearnFetch(`/api/billing?locale=${locale}`);
      const payload = await response.json() as BillingPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || (locale === "zh" ? "账单信息暂时不可用" : "Billing is temporarily unavailable"));
      if (active) setData(payload);
    };
    void Promise.resolve().then(() => {
      if (!active) return;
      if (checkout === "success") setNotice(locale === "zh" ? "支付已完成，会员状态将在几秒内同步。" : "Payment completed. Your membership will sync in a few seconds.");
      if (checkout === "cancelled") setNotice(locale === "zh" ? "已取消支付，没有产生扣款。" : "Checkout was cancelled. You were not charged.");
      return loadBilling();
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : (locale === "zh" ? "账单信息暂时不可用" : "Billing is temporarily unavailable")); });
    const refresh = checkout === "success" ? window.setTimeout(() => { if (active) void loadBilling().catch(() => undefined); }, 2_000) : undefined;
    return () => { active = false; if (refresh) window.clearTimeout(refresh); };
  }, [locale]);

  const checkout = async (planId: "personal" | "pro") => {
    setBusy(planId); setError(""); setNotice("");
    track("checkout_started", { planId, interval, trial: (data?.billing.trialDays ?? 0) > 0 });
    try {
      const response = await oneLearnFetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval, locale }),
      });
      const payload = await response.json() as { url?: string; signInUrl?: string; error?: string };
      if (response.status === 401 && payload.signInUrl) { setBusy(""); signIn("/?view=billing"); return; }
      if (!response.ok || !payload.url) throw new Error(payload.error || l("暂时无法打开安全收银台", "The secure checkout is temporarily unavailable"));
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : l("暂时无法打开安全收银台", "The secure checkout is temporarily unavailable"));
      setBusy("");
    }
  };

  const manage = async () => {
    setBusy("manage"); setError("");
    try {
      const response = await oneLearnFetch("/api/billing/portal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }),
      });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || l("暂时无法打开订阅管理", "Subscription management is temporarily unavailable"));
      window.location.assign(payload.url);
    } catch (manageError) {
      setError(manageError instanceof Error ? manageError.message : l("暂时无法打开订阅管理", "Subscription management is temporarily unavailable"));
      setBusy("");
    }
  };

  if (!data && !error) return <article className="ai-empty-state"><LoaderCircle className="animate-spin" /><h2>{l("正在读取套餐与用量", "Loading plans and usage")}</h2></article>;
  const currentPlan = data?.billing.plan;
  const bonusCredits = data?.billing.usage.bonusCredits ?? 0;
  const totalCredits = (currentPlan?.aiCredits ?? 0) + bonusCredits;
  const creditsPercent = totalCredits ? Math.min(100, Math.round((data!.billing.usage.aiCreditsUsed / totalCredits) * 100)) : 0;
  const trialDays = data?.billing.trialDays ?? 0;
  const planFeatures = (plan: BillingPlan) => [
    l(`每月 ${plan.aiCredits.toLocaleString()} AI 点数`, `${plan.aiCredits.toLocaleString()} AI credits / month`),
    l(`约 ${plan.courseEquivalent} 门新课程`, `About ${plan.courseEquivalent} new courses`),
    l(`约 ${plan.tutorEquivalent.toLocaleString()} 次导师问答`, `About ${plan.tutorEquivalent.toLocaleString()} tutor turns`),
    l(`${plan.sourceCount} 份可信资料`, `${plan.sourceCount} trusted sources`),
    ...(plan.voiceMinutes ? [l(`每月 ${plan.voiceMinutes} 分钟语音导师`, `${plan.voiceMinutes} voice tutor minutes / month`)] : []),
  ];
  return <div className="billing-page animate-in fade-in duration-500">
    <section className="billing-hero">
      <div><div className="eyebrow"><Crown className="size-3.5" /> ONELEARN MEMBERSHIP</div><h1>{l("选择与你目标匹配的学习算力。", "Choose the learning power that fits your goal.")}</h1><p>{l("按月获得 AI 点数，用于课程生成、课节扩展、导师问答和资料索引；不会按 Token 给你出账。", "Receive monthly AI credits for course generation, lesson expansion, tutoring, and source indexing—never a surprise token bill.")}</p></div>
      {data && <article className="billing-usage-card"><div className="flex items-center justify-between"><span>{l("当前套餐", "CURRENT PLAN")}</span><strong>{locale === "zh" ? data.billing.plan.nameZh : data.billing.plan.nameEn}</strong></div><div className="billing-credit-number"><b>{data.billing.usage.aiCreditsRemaining.toLocaleString()}</b><span>/ {totalCredits.toLocaleString()} {l("点剩余", "left")}</span></div>{bonusCredits > 0 && <p className="text-xs text-emerald-300">{l(`含本月邀请奖励 +${bonusCredits}`, `Includes +${bonusCredits} invite bonus this month`)}</p>}<Progress value={creditsPercent} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><div className="billing-usage-meta"><span><Gauge />{l(`本月已用 ${data.billing.usage.aiCreditsUsed}`, `${data.billing.usage.aiCreditsUsed} used this month`)}</span><span><FileText />{l(`${data.billing.usage.sources}/${data.billing.plan.sourceCount} 份资料`, `${data.billing.usage.sources}/${data.billing.plan.sourceCount} sources`)}</span></div>{data.billing.subscription?.canManage && <Button disabled={busy === "manage"} onClick={() => void manage()} variant="ghost" className="billing-manage">{busy === "manage" ? <LoaderCircle className="animate-spin" /> : <Settings />}{l("管理订阅与付款方式", "Manage subscription & payment")}</Button>}</article>}
    </section>

    {notice && <div className="billing-notice"><Check />{notice}</div>}
    {error && <div className="ai-error-banner" role="alert"><TriangleAlert /><div><strong>{l("计费操作未完成", "Billing action did not complete")}</strong><span>{error}</span></div><button onClick={() => setError("")} aria-label={l("关闭", "Dismiss")}><X /></button></div>}
    {data?.identity.mode === "device" && <section className="billing-signin"><Cloud /><div><strong>{l("登录后开通并跨设备使用", "Sign in to subscribe and sync across devices")}</strong><p>{l("登录前仍可使用免费版；会员与账单只绑定到你的安全账户。", "You can keep using Free before signing in; subscriptions and invoices are attached only to your secure account.")}</p></div><a href="/signin-with-chatgpt?return_to=%2F%3Fview%3Dbilling" target="_top" onClick={(event) => { event.preventDefault(); signIn("/?view=billing"); }}>{l("登录", "Sign in")}</a></section>}
    {data?.identity.mode === "clerk" && <section className="billing-signin"><Cloud /><div><strong>{data.identity.email}</strong><p>{l("已登录，学习档案与会员跨设备同步。", "Signed in. Your learning profile and membership sync across devices.")}</p></div><a href="#" onClick={(event) => { event.preventDefault(); void clerkSignOut(); }}>{l("退出登录", "Sign out")}</a></section>}

    <div className="billing-switch" role="group" aria-label={l("计费周期", "Billing interval")}><button className={cn(interval === "month" && "is-active")} onClick={() => setInterval("month")}>{l("月付", "Monthly")}</button><button className={cn(interval === "year" && "is-active")} onClick={() => setInterval("year")}>{l("年付 · 省 28%", "Annual · save 28%")}</button></div>
    <section className="pricing-grid">
      {data?.plans.filter((plan) => plan.id !== "team").map((plan) => {
        const isCurrent = currentPlan?.id === plan.id;
        const price = interval === "month" ? plan.monthlyPriceCny : plan.annualPriceCny;
        const isRecommended = plan.id === "personal";
        return <article key={plan.id} className={cn("pricing-card", isRecommended && "is-recommended", isCurrent && "is-current")}>
          {isRecommended && <span className="pricing-recommend">{l("最适合开始", "BEST TO START")}</span>}
          <div className="pricing-title"><span>{plan.id === "free" ? <Sparkles /> : plan.id === "personal" ? <Crown /> : <Gauge />}</span><div><h2>{locale === "zh" ? plan.nameZh : plan.nameEn}</h2><p>{plan.id === "free" ? l("探索完整学习系统", "Explore the full learning system") : plan.id === "personal" ? l("持续构建个人能力", "Build personal mastery consistently") : l("高频学习与专业交付", "High-frequency learning and delivery")}</p></div></div>
          <div className="pricing-value"><strong>¥{price}</strong><span>/{interval === "month" ? l("月", "mo") : l("年", "yr")}</span></div>
          {interval === "year" && plan.id !== "free" && <small className="pricing-saving">{l(`相当于 ¥${Math.round((price ?? 0) / 12)}/月`, `Equivalent to ¥${Math.round((price ?? 0) / 12)}/month`)}</small>}
          <ul>{planFeatures(plan).map((feature) => <li key={feature}><Check />{feature}</li>)}</ul>
          {isCurrent ? <Button disabled className="pricing-button is-current"><Check />{l("当前套餐", "Current plan")}</Button> : plan.id === "free" ? <Button disabled variant="outline" className="pricing-button">{l("永久免费", "Free forever")}</Button> : <Button disabled={Boolean(busy)} onClick={() => void checkout(plan.id as "personal" | "pro")} className="pricing-button">{busy === plan.id ? <LoaderCircle className="animate-spin" /> : <CreditCard />}{trialDays ? l(`免费试用 ${trialDays} 天`, `Start ${trialDays}-day free trial`) : l("安全开通", "Continue to secure checkout")}</Button>}
          {!isCurrent && plan.id !== "free" && trialDays > 0 && <small className="mt-2 block text-center text-xs text-slate-500">{l("试用期内随时取消不扣费，到期后按所选周期续费", "Cancel anytime during the trial at no charge; it then renews at the chosen interval")}</small>}
        </article>;
      })}
    </section>

    <section className="team-plan"><div className="team-plan-icon"><Users /></div><div><div className="section-kicker">TEAM & ENTERPRISE</div><h2>{l("团队版 ¥79/人/月，企业版 ¥99,800/年起", "Team at ¥79/user/month; Enterprise from ¥99,800/year")}</h2><p>{l("团队知识库、成员管理、学习分析、权限与审计。10席起，企业方案支持 SSO、SLA 和定制集成。", "Shared knowledge bases, member administration, learning analytics, permissions, and audit logs. Team starts at 10 seats; Enterprise adds SSO, SLA, and custom integrations.")}</p></div><Button onClick={() => setNotice(l("团队与企业方案由管理员开通；商务联系入口将在企业资料确认后启用。", "Team and Enterprise plans are provisioned by an administrator; the sales contact opens after company details are confirmed."))} variant="outline" className="secondary-pill">{l("咨询企业方案", "Talk to sales")}</Button></section>

    {data && <section className="billing-ledger"><div className="ops-table-header"><div><div className="section-kicker">BILLING LEDGER</div><h2>{l("账单记录", "Billing history")}</h2></div><Receipt /></div>{data.billing.invoices.length ? <div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>{l("日期", "Date")}</th><th>{l("金额", "Amount")}</th><th>{l("状态", "Status")}</th><th>{l("发票", "Invoice")}</th></tr></thead><tbody>{data.billing.invoices.map((invoice) => <tr key={invoice.id}><td>{new Date((invoice.paidAt ?? invoice.createdAt) * 1000).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</td><td>{invoice.currency.toUpperCase()} {(invoice.amountPaid / 100).toFixed(2)}</td><td><span className={cn("source-status", invoice.status === "paid" && "is-ready")}>{invoice.status}</span></td><td>{invoice.hostedInvoiceUrl ? <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">{l("查看", "Open")}</a> : "—"}</td></tr>)}</tbody></table></div> : <div className="ops-empty">{l("还没有账单。首次成功付款后会自动出现在这里。", "No invoices yet. Your first successful payment will appear here automatically.")}</div>}</section>}
    <p className="billing-fineprint">{l("订阅由安全托管收银台处理。AI 点数按自然月重置，失败的支付不会提升套餐权益。开通即表示你同意", "Subscriptions are handled by a secure hosted checkout. AI credits reset each calendar month, and failed payments never unlock plan entitlements. By subscribing you agree to the")} <a href="/terms" target="_blank">{l("《用户协议》", "Terms")}</a>{l("、", ", ")}<a href="/privacy" target="_blank">{l("《隐私政策》", "Privacy Policy")}</a>{l("与", " and ")}<a href="/refund" target="_blank">{l("《退款规则》", "Refund Policy")}</a>{l("。", ".")}</p>
  </div>;
}
