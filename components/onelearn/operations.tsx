"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { oneLearnFetch } from "./client";
import type { OperationsSnapshot } from "./types";
import { PageHeading } from "./ui";

export function OperationsView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [data, setData] = useState<OperationsSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await oneLearnFetch(`/api/admin/metrics?locale=${locale}`);
      const payload = await response.json() as OperationsSnapshot & { error?: string };
      if (!response.ok) throw new Error(payload.error || l("运营数据不可用", "Operations data is unavailable"));
      setData(payload);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : l("运营数据不可用", "Operations data is unavailable")); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    void oneLearnFetch(`/api/admin/metrics?locale=${locale}`)
      .then(async (response) => {
        const payload = await response.json() as OperationsSnapshot & { error?: string };
        if (!response.ok) throw new Error(payload.error || (locale === "zh" ? "运营数据不可用" : "Operations data is unavailable"));
        if (active) setData(payload);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : (locale === "zh" ? "运营数据不可用" : "Operations data is unavailable"));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locale]);
  const metrics = data ? [
    [l("用户", "Users"), data.metrics.users, l("累计身份档案", "total profiles")],
    [l("付费用户", "Paid subscribers"), data.metrics.paidSubscribers, l("有效订阅", "active subscriptions")],
    [l("订阅月收入", "Subscription MRR"), `¥${Math.round(data.metrics.mrrCny).toLocaleString()}`, l("标准化月收入", "normalized monthly revenue")],
    [l("累计实收", "Revenue collected"), `¥${Math.round(data.metrics.revenueCny).toLocaleString()}`, l("成功支付账单", "paid invoices")],
    [l("活跃学习者", "Active learners"), data.metrics.activeLearners7d, l("最近 7 天", "last 7 days")],
    [l("课程版本", "Course versions"), data.metrics.courses, l("全部版本", "all versions")],
    [l("可信资料", "Trusted sources"), data.metrics.sources, l("已完成索引", "indexed")],
    [l("AI 调用", "AI runs"), data.metrics.aiRuns7d, l("最近 7 天", "last 7 days")],
    [l("Token 用量", "Token usage"), data.metrics.tokens7d.toLocaleString(), l("最近 7 天", "last 7 days")],
    [l("失败调用", "Failed runs"), data.metrics.failedRuns7d, l("需要排查", "needs attention")],
    [l("课程质量", "Course quality"), `${Math.round(data.metrics.averageQuality)}%`, l("平均评分", "average score")],
    [l("练习与复习作答", "Practice & review answers"), data.metrics.answers7d, l("最近 7 天", "last 7 days")],
    [l("通过延迟复测", "Delayed reviews passed"), data.metrics.verifiedNodes, l("已验证节点", "verified nodes")],
    [l("待处理反馈", "Open feedback"), data.metrics.openFeedback, l("需要回复", "needs a response")],
  ] : [];
  const updateFeedback = async (id: string, status: "open" | "resolved") => {
    const response = await oneLearnFetch("/api/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, id, status }) }).catch(() => null);
    if (!response?.ok) { setError(l("反馈状态更新失败", "Could not update the feedback status")); return; }
    setData((current) => current ? {
      ...current,
      metrics: { ...current.metrics, openFeedback: current.metrics.openFeedback + (status === "open" ? 1 : -1) },
      feedback: current.feedback.map((item) => item.id === id ? { ...item, status } : item),
    } : current);
  };
  const categoryLabel = (category: string) => ({ bug: l("故障", "Bug"), billing: l("账单", "Billing"), content: l("内容", "Content"), suggestion: l("建议", "Suggestion") } as Record<string, string>)[category] ?? l("其他", "Other");
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("运营与治理", "OPERATIONS & GOVERNANCE")} title={l("OneLearn 运营中心", "OneLearn operations center")} detail={l("监控用户、课程质量、资料索引、模型用量与失败率。", "Monitor learners, course quality, source indexing, model usage, and failures.")}><Button disabled={loading} onClick={() => void load()} variant="outline" className="secondary-pill"><RefreshCw className={cn(loading && "animate-spin")} />{l("刷新", "Refresh")}</Button></PageHeading>{error ? <article className="ops-gate"><LockKeyhole /><h2>{l("运营后台受到保护", "Operations is protected")}</h2><p>{error}</p><small>{l("在部署环境中设置 ONELEARN_ADMIN_EMAILS 后重新打开。", "Set ONELEARN_ADMIN_EMAILS in the deployment environment, then reopen this view.")}</small></article> : loading ? <article className="ai-empty-state"><LoaderCircle className="animate-spin" /><h2>{l("正在读取运营数据", "Loading operations data")}</h2></article> : data && <><section className="ops-metrics">{metrics.map(([label, value, detail]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section><section className="surface-card overflow-hidden"><div className="ops-table-header"><div><div className="section-kicker">QUALITY REVIEW QUEUE</div><h2>{l("课程质量复核队列", "Course quality review queue")}</h2></div><span>{data.qualityQueue.length}</span></div>{data.qualityQueue.length ? <div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>{l("课程", "Course")}</th><th>{l("版本", "Version")}</th><th>{l("语言", "Locale")}</th><th>{l("评分", "Score")}</th><th>{l("状态", "Status")}</th><th>{l("用户", "Learner")}</th></tr></thead><tbody>{data.qualityQueue.map((item) => <tr key={item.id}><td>{item.title}</td><td>V{item.version}</td><td>{item.locale.toUpperCase()}</td><td>{Math.round(item.qualityScore ?? 0)}</td><td><span className={cn("source-status", item.qualityStatus === "blocked" && "is-failed")}>{item.qualityStatus}</span></td><td>{item.email}</td></tr>)}</tbody></table></div> : <div className="ops-empty">{l("当前没有待复核课程。", "No courses currently need review.")}</div>}</section><section className="surface-card overflow-hidden"><div className="ops-table-header"><div><div className="section-kicker">SUPPORT INBOX</div><h2>{l("用户反馈", "Learner feedback")}</h2></div><span>{data.metrics.openFeedback}</span></div>{data.feedback.length ? <div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>{l("时间", "Time")}</th><th>{l("类型", "Type")}</th><th>{l("内容", "Message")}</th><th>{l("用户", "Learner")}</th><th>{l("状态", "Status")}</th></tr></thead><tbody>{data.feedback.map((item) => <tr key={item.id}><td>{new Date(item.createdAt * 1000).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}</td><td>{categoryLabel(item.category)}</td><td className="max-w-md whitespace-pre-wrap">{item.message}{item.page && <small className="block text-slate-500">{item.page}</small>}</td><td>{item.email}</td><td><button type="button" onClick={() => void updateFeedback(item.id, item.status === "open" ? "resolved" : "open")} className={cn("source-status", item.status === "resolved" && "is-ready")}>{item.status === "open" ? l("待处理 · 标记已解决", "Open · mark resolved") : l("已解决", "Resolved")}</button></td></tr>)}</tbody></table></div> : <div className="ops-empty">{l("还没有用户反馈。", "No feedback yet.")}</div>}</section></>}</div>;
}
