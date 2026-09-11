"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { oneLearnFetch } from "./client";

type Question = { moduleIndex: number; question: string; options: string[]; correctOption?: number; explanation?: string };
type Result = { results: boolean[]; knownModules: number[]; questions: Question[]; answers: number[] | null };

/** Placement diagnostic: one question per module; modules answered correctly can be skipped. */
export function DiagnosticDialog({ locale, courseVersionId, moduleTitles, open, onOpenChange, onCompleted }: { locale: Locale; courseVersionId: string; moduleTitles: string[]; open: boolean; onOpenChange: (open: boolean) => void; onCompleted: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || questions) return;
    let active = true;
    void oneLearnFetch("/api/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, courseVersionId }) })
      .then(async (response) => {
        const payload = await response.json() as { status?: "pending" | "completed"; questions?: Question[]; answers?: number[] | null; knownModules?: number[]; error?: string };
        if (!active) return;
        if (!response.ok || !payload.questions) throw new Error(payload.error || (locale === "zh" ? "暂时无法生成入门诊断" : "The diagnostic is unavailable"));
        setQuestions(payload.questions);
        if (payload.status === "completed") {
          const saved = payload.answers ?? [];
          setAnswers(saved);
          setResult({ questions: payload.questions, answers: saved, knownModules: payload.knownModules ?? [], results: payload.questions.map((question, index) => saved[index] === question.correctOption) });
        }
      })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : String(loadError)); });
    return () => { active = false; };
  }, [open, questions, locale, courseVersionId]);

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const response = await oneLearnFetch("/api/diagnostic/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, courseVersionId, answers }) });
      const payload = await response.json() as Result & { error?: string };
      if (!response.ok || !payload.results) throw new Error(payload.error || l("提交失败，请重试", "Could not submit. Please retry"));
      setResult(payload);
      onCompleted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally { setBusy(false); }
  };

  const shown = result?.questions ?? questions ?? [];
  const complete = shown.length > 0 && shown.every((_, index) => typeof answers[index] === "number" && answers[index] >= 0);
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-2xl">
    <DialogHeader><DialogTitle>{l("入门诊断", "Placement diagnostic")}</DialogTitle><DialogDescription className="text-slate-400">{l("每个模块一道题。答对的模块会直接解锁，推荐学习时自动跳过。答不出来很正常，选最接近的即可。", "One question per module. Modules you answer correctly unlock and are skipped in recommendations. Guessing is fine.")}</DialogDescription></DialogHeader>
    {!questions && !error && <div className="flex items-center gap-3 py-8 text-sm text-slate-400"><LoaderCircle className="size-4 animate-spin" />{l("正在生成诊断题（约 10–20 秒，消耗 4 个 AI 点数）…", "Writing the diagnostic (about 10–20 seconds, 4 AI credits)…")}</div>}
    {error && <p className="source-error"><TriangleAlert />{error}</p>}
    {shown.length > 0 && <ol className="space-y-5">
      {shown.map((question, index) => <li key={index} className="space-y-2">
        <p className="text-xs text-cyan-200">{l(`模块 ${question.moduleIndex + 1}`, `Module ${question.moduleIndex + 1}`)} · {moduleTitles[question.moduleIndex] ?? ""}</p>
        <p className="text-sm font-medium leading-6 text-white">{question.question}</p>
        <div className="grid gap-1.5">{question.options.map((option, optionIndex) => {
          const chosen = answers[index] === optionIndex;
          const correct = result && question.correctOption === optionIndex;
          return <button key={optionIndex} type="button" disabled={Boolean(result)} onClick={() => setAnswers((current) => { const next = [...current]; next[index] = optionIndex; return next; })} className={cn("flex min-h-11 items-center gap-3 rounded-xl border border-white/8 px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5", chosen && "border-cyan-300/50 bg-cyan-300/[0.07] text-white", correct && "border-emerald-300/50 bg-emerald-300/[0.08]", result && chosen && !correct && "border-rose-300/50 bg-rose-300/[0.08]")}>
            <span className="grid size-6 flex-none place-items-center rounded-md bg-white/6 text-xs">{String.fromCharCode(65 + optionIndex)}</span><span className="flex-1">{option}</span>{correct && <Check className="size-4 text-emerald-300" />}{result && chosen && !correct && <X className="size-4 text-rose-300" />}
          </button>;
        })}</div>
        {result && question.explanation && <p className="text-xs leading-5 text-slate-400">{question.explanation}</p>}
      </li>)}
    </ol>}
    {result && <div className="feedback-box"><Check /><div><strong>{result.knownModules.length ? l(`已掌握 ${result.knownModules.length} 个模块，将从后面的内容开始`, `${result.knownModules.length} modules already known — you'll start further ahead`) : l("没关系，将从第一个模块开始", "No problem — you'll start from the first module")}</strong><p>{result.knownModules.map((index) => moduleTitles[index]).filter(Boolean).join("、") || l("按顺序学习效果最好。", "Learning in order works best.")}</p></div></div>}
    <DialogFooter>{result ? <Button onClick={() => onOpenChange(false)} className="primary-pill">{l("开始学习", "Start learning")}</Button> : <Button disabled={!complete || busy} onClick={() => void submit()} className="primary-pill">{busy && <LoaderCircle className="animate-spin" />}{l("提交诊断", "Submit")}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}
