"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Mic, Orbit, Play, RefreshCw, ShieldCheck, Target, TimerReset, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import type { GeneratedCourseBundle, GeneratedLesson } from "@/lib/onelearn/generated-course";
import { track } from "@/lib/onelearn/analytics";
import { oneLearnFetch } from "./client";
import { courseProgress, lessonNeighbors } from "./progress";
import { VoiceTutor } from "./voice-tutor";
import type { MasteryOverview, MasteryRecord, View } from "./types";
import { PageHeading } from "./ui";

export function fallbackLesson(locale: Locale): GeneratedLesson {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  return {
    id: "demo-l4",
    title: l("可靠的结构化输出", "Reliable structured outputs"),
    objective: l("区分语法有效与契约有效，并能解释 Schema 的作用。", "Distinguish syntax validity from contract validity and explain the role of schemas."),
    durationMinutes: 18,
    sections: [
      { heading: l("提示词提出要求，Schema 强制执行", "A prompt asks; a schema enforces"), body: l("结构化输出契约定义应用能够接受的精确数据形状，把期望性指令变成机器可检查的边界。", "A structured output contract defines the exact shape an application accepts, turning a hopeful instruction into a machine-checkable boundary.") },
      { heading: l("失败必须可见", "Failure must be visible"), body: l("Schema 不会让模型更聪明，但会让字段、类型和约束错误变得可分类、可重试和可修复。", "A schema does not make the model smarter; it makes field, type, and constraint failures classifiable, retryable, and repairable.") },
    ],
    keyPoints: [l("JSON 有效不等于 Schema 有效", "Valid JSON does not imply schema validity"), l("契约应在服务端验证", "Validate contracts on the server"), l("一次正确不能证明掌握", "One correct answer does not prove mastery")],
    workedExample: { scenario: l("API 返回 score: \"92\"", "An API returns score: \"92\""), steps: [l("JSON 解析成功", "JSON parsing succeeds"), l("Schema 要求 number", "The schema requires a number"), l("应用拒绝字符串类型", "The application rejects the string type")], takeaway: l("语法与契约是两层不同验证。", "Syntax and contract validation are separate layers.") },
    checkpointQuestion: l("为什么模型返回了有效 JSON，应用仍可能拒绝它？", "Why can a model return valid JSON that an application still rejects?"),
    expectedAnswer: l("因为 JSON 语法可以有效，但字段、类型或约束仍可能违反应用的 Schema。", "Because valid JSON syntax can still violate the application's field, type, or constraint schema."),
    practice: [{ id: "demo-q1", question: l("API 返回有效 JSON，但 score 是字符串而不是数字。失败发生在哪里？", "An API returns valid JSON, but score is a string instead of a number. What failed?"), options: locale === "zh" ? ["提示词", "JSON 语法", "Schema 契约", "网络请求"] : ["The prompt", "JSON syntax", "The schema contract", "The network request"], correctOption: 2, explanation: l("JSON 语法有效，但字段类型违反了 Schema。", "The JSON syntax is valid, but the field type violates the schema.") }],
  };
}

const lessonCache = new Map<string, GeneratedLesson>();
type LessonResult = { status: "ready"; lesson: GeneratedLesson } | { status: "loading" } | { status: "missing" } | { status: "error"; message: string };

/**
 * A lesson's full content: the bundle's first lesson, a cached copy, or /api/lesson,
 * which generates a lesson once and serves the stored copy afterwards.
 */
function useLesson(locale: Locale, bundle: GeneratedCourseBundle | null, lessonId: string | null, cachedOnly = false) {
  const courseVersionId = bundle?.generation.courseVersionId ?? null;
  const cacheKey = `${courseVersionId}:${lessonId}`;
  const immediate = !bundle ? fallbackLesson(locale)
    : !lessonId || bundle.curriculum.firstLesson.id === lessonId ? bundle.curriculum.firstLesson
    : lessonCache.get(cacheKey) ?? null;
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; result: LessonResult } | null>(null);
  const requestKey = `${cacheKey}:${cachedOnly}:${attempt}`;
  const needsFetch = !immediate && Boolean(courseVersionId && lessonId);

  useEffect(() => {
    if (!needsFetch) return;
    let active = true;
    const failed = locale === "zh" ? "课节暂时无法加载" : "The lesson could not be loaded";
    void oneLearnFetch("/api/lesson", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, courseVersionId, lessonId, cachedOnly }),
    }).then(async (response) => {
      const payload = await response.json() as { lesson?: GeneratedLesson; code?: string; error?: string };
      if (!active) return;
      if (response.ok && payload.lesson) {
        lessonCache.set(cacheKey, payload.lesson);
        setLoaded({ key: requestKey, result: { status: "ready", lesson: payload.lesson } });
      } else if (payload.code === "lesson_not_generated") {
        setLoaded({ key: requestKey, result: { status: "missing" } });
      } else {
        setLoaded({ key: requestKey, result: { status: "error", message: payload.error || failed } });
      }
    }).catch(() => { if (active) setLoaded({ key: requestKey, result: { status: "error", message: failed } }); });
    return () => { active = false; };
  }, [needsFetch, requestKey, cacheKey, courseVersionId, lessonId, cachedOnly, locale]);

  const retry = () => setAttempt((current) => current + 1);
  if (immediate) return { result: { status: "ready", lesson: immediate } as LessonResult, retry };
  return { result: loaded?.key === requestKey ? loaded.result : { status: "loading" } as LessonResult, retry };
}

function LessonStatus({ locale, result, retry }: { locale: Locale; result: LessonResult; retry: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  if (result.status === "error") return <article className="ai-empty-state"><TriangleAlert /><h2>{l("这节课暂时无法加载", "This lesson could not be loaded")}</h2><p>{result.message}</p><Button onClick={retry} variant="outline" className="secondary-pill mt-4"><RefreshCw />{l("重试", "Retry")}</Button></article>;
  return <article className="ai-empty-state"><LoaderCircle className="animate-spin" /><h2>{l("正在准备这一节课", "Preparing this lesson")}</h2><p>{l("第一次打开时由 OpenAI 生成（约 20–40 秒，消耗 6 个 AI 点数），之后再打开不再消耗。", "The first time you open it, OpenAI writes it (about 20–40 seconds, 6 AI credits). Opening it again is free.")}</p></article>;
}

type LessonNavigation = { lessonId: string | null; mastery: MasteryOverview | null; onOpenLesson: (lessonId: string) => void; onNavigate: (view: View) => void };

export function LearningRoom({ locale, bundle, lessonId, mastery, onOpenLesson, onNavigate }: { locale: Locale; bundle: GeneratedCourseBundle | null } & LessonNavigation) {
  const { result, retry } = useLesson(locale, bundle, lessonId);
  if (result.status !== "ready") return <LessonStatus locale={locale} result={result} retry={retry} />;
  return <LessonBody key={result.lesson.id} locale={locale} bundle={bundle} lesson={result.lesson} mastery={mastery} onOpenLesson={onOpenLesson} onNavigate={onNavigate} />;
}

function LessonBody({ locale, bundle, lesson, mastery, onOpenLesson, onNavigate }: { locale: Locale; bundle: GeneratedCourseBundle | null; lesson: GeneratedLesson } & Omit<LessonNavigation, "lessonId">) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [messages, setMessages] = useState<Array<{ from: "tutor" | "you"; text: string }>>([{ from: "tutor", text: lesson.checkpointQuestion }]);
  const [answer, setAnswer] = useState("");
  const [turns, setTurns] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const courseVersionId = bundle?.generation.courseVersionId ?? null;
  const position = bundle ? lessonNeighbors(bundle, lesson.id) : null;
  const progress = bundle ? courseProgress(bundle, mastery) : null;
  const record = progress?.lessons.find((item) => item.id === lesson.id)?.record ?? null;
  const next = position?.next ? progress?.lessons.find((item) => item.id === position.next!.id) ?? null : null;
  const score = record?.score ?? 0;

  useEffect(() => {
    if (!courseVersionId) return;
    void oneLearnFetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, courseVersionId, eventType: "lesson_started", payload: { lessonId: lesson.id, title: lesson.title } }),
    });
  }, [courseVersionId, lesson.id, lesson.title, locale]);

  const submit = async () => {
    if (!answer.trim()) return;
    const learnerAnswer = answer.trim();
    const history = messages.slice(-10).map((message) => ({ role: message.from === "you" ? "learner" as const : "tutor" as const, text: message.text }));
    setMessages((items) => [...items, { from: "you", text: learnerAnswer }]);
    setAnswer("");
    setIsThinking(true);
    try {
      const response = await oneLearnFetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: learnerAnswer,
          node: lesson.title,
          courseTitle: bundle?.curriculum.title ?? l("结构化输出", "Structured outputs"),
          lessonObjective: lesson.objective,
          expectedAnswer: lesson.expectedAnswer,
          mastery: score,
          locale,
          courseVersionId,
          lessonId: bundle ? lesson.id : undefined,
          history,
        }),
      });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || l("导师暂时不可用", "The tutor is temporarily unavailable"));
      setMessages((items) => [...items, { from: "tutor", text: payload.reply! }]);
      setTurns((current) => current + 1);
    } catch (error) {
      setMessages((items) => [...items, { from: "tutor", text: error instanceof Error ? error.message : l("导师暂时不可用", "The tutor is temporarily unavailable") }]);
    } finally {
      setIsThinking(false);
    }
  };

  const kicker = position?.current
    ? l(`模块 ${position.current.moduleIndex + 1} · 第 ${position.index + 1}/${position.total} 节 · ${lesson.durationMinutes} 分钟`, `MODULE ${position.current.moduleIndex + 1} · LESSON ${position.index + 1}/${position.total} · ${lesson.durationMinutes} MIN`)
    : `${lesson.id.toUpperCase()} · ${lesson.durationMinutes} ${l("分钟", "MIN")}`;

  return <div className="learning-layout animate-in fade-in duration-500"><section className="lesson-surface"><div className="flex items-center justify-between border-b border-white/7 px-5 py-4 sm:px-7"><div><div className="section-kicker">{kicker}</div><h1 className="mt-1 text-lg font-medium text-white">{lesson.title}</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">{bundle ? l("OpenAI 生成课程", "OpenAI-generated course") : l("演示课程", "Demo course")}</span><span className="status-dot" /></div></div><div className="lesson-body generated-lesson-body"><div className="section-kicker">{l("学习目标", "LEARNING OBJECTIVE")}</div><h2>{lesson.objective}</h2>{lesson.sections.map((section) => <section key={section.heading} className="lesson-section"><h3>{section.heading}</h3><p>{section.body}</p></section>)}<div className="lesson-key-points"><span>{l("关键要点", "KEY POINTS")}</span>{lesson.keyPoints.map((point) => <p key={point}><Check />{point}</p>)}</div><div className="worked-example"><span>{l("示例", "WORKED EXAMPLE")}</span><h3>{lesson.workedExample.scenario}</h3><ol>{lesson.workedExample.steps.map((item, index) => <li key={item}><i>{index + 1}</i>{item}</li>)}</ol><p>{lesson.workedExample.takeaway}</p></div></div>
    <div className="flex flex-col gap-3 border-t border-white/7 p-4 sm:flex-row sm:items-center sm:px-7"><div className="flex flex-1 items-center gap-3"><span className="text-xs text-slate-500">{l("本节掌握度", "Lesson mastery")}</span><Progress value={score} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">{score}%</span></div><div className="flex gap-2"><Button onClick={() => onNavigate("practice")} variant="outline" className="secondary-pill"><Target />{l("练习本节", "Practice")}</Button>{next && <Button disabled={!next.unlocked} onClick={() => onOpenLesson(next.id)} className="primary-pill" title={next.unlocked ? undefined : l("完成本模块各节练习后解锁", "Pass practice for every lesson in this module to unlock")}>{l("下一节", "Next lesson")}<ArrowRight /></Button>}</div></div>
  </section><aside className="tutor-panel"><div className="flex items-center gap-3 border-b border-white/7 p-5"><div className="tutor-avatar"><Orbit /></div><div className="min-w-0 flex-1"><h2 className="text-sm font-medium text-white">Sora · {l("OpenAI 导师", "OpenAI Tutor")}</h2><p className="text-xs text-emerald-300">{isThinking ? l("正在思考…", "Thinking…") : l("基于当前课程追问", "Grounded in this lesson")}</p></div>{courseVersionId && <Button onClick={() => setVoiceOpen(true)} size="sm" variant="outline" className="secondary-pill h-9 flex-none"><Mic />{l("语音对话", "Voice")}</Button>}</div>{voiceOpen && courseVersionId && <VoiceTutor locale={locale} courseVersionId={courseVersionId} lessonId={lesson.id} onClose={() => setVoiceOpen(false)} />}<div className="tutor-thread scrollbar-thin">{messages.map((message, i) => <div key={i} className={cn("message", message.from === "you" && "message-you")}><span>{message.from === "tutor" ? "SORA" : l("你", "YOU")}</span><p>{message.text}</p></div>)}{isThinking && <div className="message"><span>SORA</span><p className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />{l("正在分析你的回答", "Analyzing your answer")}</p></div>}{turns > 0 && <div className="mastery-signal"><Check className="size-4" /><span>{l("理解证据已记录", "Understanding evidence captured")}</span></div>}</div><div className="tutor-input-wrap"><label htmlFor="tutor-answer" className="sr-only">{l("回答导师", "Answer your tutor")}</label><textarea id="tutor-answer" disabled={isThinking} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder={l("用你自己的话解释…", "Explain in your own words…")} /><div className="flex items-center justify-end"><Button disabled={isThinking || !answer.trim()} onClick={() => void submit()} size="sm" className="primary-pill h-8">{isThinking ? <LoaderCircle className="animate-spin" /> : l("发送", "Send")} {!isThinking && <ArrowRight />}</Button></div></div></aside></div>;
}

/** Multiple-choice questions from one lesson. Answers on a saved course are graded by the server. */
export function QuestionCard({ locale, bundle, lesson, mode, onAnswered }: { locale: Locale; bundle: GeneratedCourseBundle | null; lesson: GeneratedLesson; mode: "practice" | "review"; onAnswered: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const available = lesson.practice.filter((item) => item.options.length >= 2);
  const questions = available.length ? available : fallbackLesson(locale).practice;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; correctOption: number; explanation: string; score?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const question = questions[index % questions.length];
  const localCorrect = question.correctOption >= 0 && question.correctOption < question.options.length ? question.correctOption : 0;
  const correctOption = result?.correctOption ?? localCorrect;
  const checkAnswer = async () => {
    if (selected === null) return;
    const courseVersionId = bundle?.generation.courseVersionId;
    if (!bundle || !courseVersionId) { setResult({ correct: selected === localCorrect, correctOption: localCorrect, explanation: question.explanation }); return; }
    setBusy(true); setError("");
    try {
      const response = await oneLearnFetch("/api/mastery/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, courseVersionId, lessonId: lesson.id, questionId: question.id, selected, mode }),
      });
      const payload = await response.json() as { correct?: boolean; correctOption?: number; explanation?: string; record?: { score: number }; error?: string };
      if (!response.ok || typeof payload.correct !== "boolean") throw new Error(payload.error || l("答案未能记录", "The answer could not be recorded"));
      setResult({ correct: payload.correct, correctOption: payload.correctOption ?? localCorrect, explanation: payload.explanation ?? question.explanation, score: payload.record?.score });
      track("practice_answered", { mode, correct: payload.correct });
      onAnswered();
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : l("答案未能记录", "The answer could not be recorded"));
    } finally { setBusy(false); }
  };
  const next = () => { setIndex((current) => current + 1); setSelected(null); setResult(null); setError(""); };
  return <article className="surface-card mt-8 overflow-hidden"><div className="border-b border-white/7 p-6 sm:p-9"><span className="question-type">{mode === "review" ? l("间隔复习", "SPACED REVIEW") : l("单项最佳答案", "SINGLE BEST ANSWER")} · {(index % questions.length) + 1}/{questions.length}</span><h2 className="mt-5 max-w-2xl text-xl font-medium leading-8 text-white">{question.question}</h2></div><div className="space-y-3 p-6 sm:p-9">{question.options.map((option, i) => <button key={option} onClick={() => !result && setSelected(i)} className={cn("answer-option", selected === i && "is-selected", result && i === correctOption && "is-correct", result && selected === i && i !== correctOption && "is-wrong")}><span>{String.fromCharCode(65 + i)}</span><p>{option}</p>{result && i === correctOption && <Check />}</button>)}{result && <div className="feedback-box"><ShieldCheck /><div><strong>{result.correct ? l("回答正确", "Correct") : l("还不完全正确", "Not quite")}{typeof result.score === "number" && ` · ${l("掌握度", "Mastery")} ${result.score}%`}</strong><p>{result.explanation}</p></div></div>}{error && <p className="source-error"><TriangleAlert />{error}</p>}<div className="flex justify-end pt-3">{result ? <Button onClick={next} className="primary-pill">{l("下一题", "Next question")} <ArrowRight /></Button> : <Button disabled={selected === null || busy} onClick={() => void checkAnswer()} className="primary-pill">{busy && <LoaderCircle className="animate-spin" />}{l("检查答案", "Check answer")}</Button>}</div></div></article>;
}

export function PracticeView({ locale, bundle, lessonId, onAnswered, onNavigate }: { locale: Locale; bundle: GeneratedCourseBundle | null; lessonId: string | null; onAnswered: () => void; onNavigate: (view: View) => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const { result, retry } = useLesson(locale, bundle, lessonId);
  if (result.status !== "ready") return <LessonStatus locale={locale} result={result} retry={retry} />;
  return <div className="mx-auto max-w-4xl animate-in fade-in duration-500"><PageHeading kicker={bundle ? "OPENAI · ADAPTIVE PRACTICE" : l("自适应练习", "ADAPTIVE PRACTICE")} title={result.lesson.title} detail={bundle ? l("答案由服务器评分，并更新掌握度与复习计划。", "Answers are graded on the server and update your mastery and review schedule.") : l("演示题目 · 生成课程后开始记录掌握度", "Demo question · generate a course to start tracking mastery")}><Button onClick={() => onNavigate("learn")} variant="outline" className="secondary-pill">{l("回到课文", "Back to lesson")}</Button></PageHeading><QuestionCard key={result.lesson.id} locale={locale} bundle={bundle} lesson={result.lesson} mode="practice" onAnswered={onAnswered} /></div>;
}

function ReviewQuiz({ locale, bundle, record, onAnswered, onOpenLesson }: { locale: Locale; bundle: GeneratedCourseBundle; record: MasteryRecord; onAnswered: () => void; onOpenLesson: (lessonId: string) => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const { result, retry } = useLesson(locale, bundle, record.nodeKey, true);
  if (result.status === "ready") return <QuestionCard key={record.nodeKey} locale={locale} bundle={bundle} lesson={result.lesson} mode="review" onAnswered={onAnswered} />;
  if (result.status === "missing") return <article className="ai-empty-state mt-8"><TimerReset /><h2>{l("这节课还没有练习题", "This lesson has no practice yet")}</h2><p>{l("先打开这节课学习，生成后即可在这里复习。", "Open the lesson first; once it exists you can review it here.")}</p><Button onClick={() => onOpenLesson(record.nodeKey)} className="primary-pill mt-4">{l("打开这节课", "Open lesson")}<ArrowRight /></Button></article>;
  return <LessonStatus locale={locale} result={result} retry={retry} />;
}

export function ReviewView({ locale, bundle, mastery, onAnswered, onNavigate, onOpenLesson }: { locale: Locale; bundle: GeneratedCourseBundle | null; mastery: MasteryOverview | null; onAnswered: () => void; onNavigate: (view: View) => void; onOpenLesson: (lessonId: string) => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [active, setActive] = useState<string | null>(null);
  const keyOf = (record: MasteryRecord) => `${record.courseVersionId}:${record.nodeKey}`;
  const canQuiz = (record: MasteryRecord) => bundle?.generation.courseVersionId === record.courseVersionId;
  const due = mastery?.due ?? [];
  const upcoming = (mastery?.records ?? []).filter((record) => !record.due && record.nextReviewAt).sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0)).slice(0, 6);
  const activeRecord = [...due, ...upcoming].find((record) => keyOf(record) === active) ?? (mastery?.records ?? []).find((record) => keyOf(record) === active) ?? null;
  const firstQuizzable = due.find(canQuiz);
  const formatDate = (seconds: number | null) => seconds ? new Date(seconds * 1000).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const card = (record: MasteryRecord, isDue: boolean) => <article key={keyOf(record)} className="surface-card p-6"><div className="flex items-center justify-between"><span className={cn("status-chip", isDue && record.retention < 60 && "is-amber")}>{isDue ? (record.retention < 60 ? l("优先复习", "Priority review") : l("已到期", "Due now")) : l(`${formatDate(record.nextReviewAt)} 到期`, `Due ${formatDate(record.nextReviewAt)}`)}</span><TimerReset className="size-5 text-slate-500" /></div><h2 className="mt-8 text-lg font-medium text-white">{record.nodeTitle}</h2><p className="mt-1 text-sm text-slate-500">{l("预测保持率", "Predicted retention")}</p><div className="mt-5 flex items-center gap-3"><Progress value={record.retention} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-sm text-slate-300">{record.retention}%</span></div>{isDue && <Button variant="ghost" className="link-button mt-6" onClick={() => canQuiz(record) ? setActive(keyOf(record)) : onNavigate("learn")}>{canQuiz(record) ? l("现在复习", "Review now") : l("在学习空间复习", "Review in the learning room")} <ArrowRight /></Button>}</article>;
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("间隔记忆", "SPACED RETENTION")} title={l("你的复习队列", "Your review queue")} detail={due.length ? l(`${due.length} 个节点已到期。隔天仍能独立答对，才算真正掌握。`, `${due.length} nodes are due. Answering correctly after a delay is what proves mastery.`) : l("暂时没有到期的节点。练习后，系统会按遗忘曲线安排复习。", "Nothing is due. After practice, reviews are scheduled along your forgetting curve.")}>{firstQuizzable && <Button className="primary-pill" onClick={() => setActive(keyOf(firstQuizzable))}><Play /> {l("开始复习", "Start review")}</Button>}</PageHeading>{active && activeRecord && bundle && <div><div className="section-kicker mt-2">{activeRecord.nodeTitle}</div><ReviewQuiz key={active} locale={locale} bundle={bundle} record={activeRecord} onAnswered={onAnswered} onOpenLesson={onOpenLesson} /><div className="mt-3 flex justify-end"><Button variant="ghost" className="link-button" onClick={() => setActive(null)}>{l("结束本次复习", "Finish this review")}</Button></div></div>}{due.length ? <div className="grid gap-4 lg:grid-cols-3">{due.map((record) => card(record, true))}</div> : <article className="ai-empty-state"><TimerReset /><h2>{l("复习队列是空的", "Your review queue is empty")}</h2><p>{l("完成练习后，节点会在合适的时间回到这里。", "After practice, nodes return here at the right time.")}</p></article>}{upcoming.length > 0 && <section><div className="section-kicker mb-3">{l("即将到期", "UPCOMING")}</div><div className="grid gap-4 lg:grid-cols-3">{upcoming.map((record) => card(record, false))}</div></section>}</div>;
}
