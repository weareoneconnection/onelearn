"use client";

import { Check, Circle, CircleCheck, LockKeyhole, Orbit, Play, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/onelearn/catalog";
import { courseTitleEn, type Locale, pick } from "@/lib/onelearn/i18n";
import type { GeneratedCourseBundle } from "@/lib/onelearn/generated-course";
import { courseProgress } from "./progress";
import type { MasteryOverview, View } from "./types";
import { PageHeading } from "./ui";

export function KnowledgeMap({ onNavigate, onOpenLesson, activeCourse, bundle, locale, onRegenerate, mastery }: { onNavigate: (view: View) => void; onOpenLesson: (lessonId: string) => void; activeCourse: CatalogEntry | null; bundle: GeneratedCourseBundle | null; locale: Locale; onRegenerate: () => void; mastery: MasteryOverview | null }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const activeTitle = activeCourse ? (locale === "en" ? courseTitleEn(activeCourse.title) : activeCourse.title) : null;
  if (activeCourse && !bundle) return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="OPENAI CURRICULUM ENGINE" title={activeTitle ?? activeCourse.title} detail={l("这门课程还没有生成当前语言版本。", "This course has not been generated in the current language yet.")}><Button onClick={onRegenerate} className="primary-pill"><Sparkles /> {l("用 OpenAI 生成", "Generate with OpenAI")}</Button></PageHeading><article className="ai-empty-state"><Orbit /><h2>{l("目录是入口，课程由大模型按需创建", "The catalog is the entry; the model creates the course on demand")}</h2><p>{l("OpenAI 会生成模块、课节、首课正文、检查问题与练习，并在当前设备缓存结果。", "OpenAI will generate modules, lessons, the first lesson content, checkpoints, and practice, then cache the result on this device.")}</p></article></div>;

  if (!bundle) {
    const demoNodes = [
      { id: 1, title: l("AI 基础", "AI foundations"), meta: l("已掌握", "Mastered"), score: 94, state: "mastered" },
      { id: 2, title: l("提示词系统", "Prompt systems"), meta: l("已掌握", "Mastered"), score: 88, state: "mastered" },
      { id: 3, title: l("API 与结构化数据", "APIs & structured data"), meta: l("学习中", "In progress"), score: 72, state: "active" },
      { id: 4, title: "Tool Calling", meta: l("下一步", "Ready next"), score: 18, state: "ready" },
      { id: 5, title: l("记忆与上下文", "Memory & context"), meta: l("未解锁", "Locked"), score: 0, state: "locked" },
    ];
    return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("演示知识图谱", "DEMO KNOWLEDGE GRAPH")} title={l("构建生产级 AI Agent", "Build a production AI agent")} detail={l("这是演示路径。从课程宇宙选择或生成一门课程后，这里会显示你的真实进度。", "This is a demo path. Pick or generate a course and your real progress appears here.")}><Button onClick={() => onNavigate("catalog")} className="primary-pill"><Sparkles /> {l("选择课程", "Choose a course")}</Button></PageHeading><div className="map-shell"><div className="map-grid" /><div className="path-line" aria-hidden="true" /><div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-5 py-5">{demoNodes.map((node, i) => <div key={node.id} className={cn("knowledge-node", "node-" + node.state, i % 2 ? "translate-x-[clamp(0px,8vw,90px)]" : "-translate-x-[clamp(0px,8vw,90px)]")}><span className="node-index">{node.state === "mastered" ? <Check /> : node.state === "locked" ? <LockKeyhole /> : node.id}</span><span className="min-w-0 flex-1 text-left"><strong>{node.title}</strong><small>{node.meta}</small></span><span className="node-score">{node.score}%</span></div>)}</div></div></div>;
  }

  const progress = courseProgress(bundle, mastery);
  const recommended = progress.lessons.find((lesson) => lesson.id === progress.recommendedId);
  const lessonCount = progress.lessons.length;
  const passedCount = progress.lessons.filter((lesson) => lesson.passed).length;
  return <div className="space-y-6 animate-in fade-in duration-500">
    <PageHeading kicker={`OPENAI · ${bundle.generation.model}${bundle.generation.version ? ` · V${bundle.generation.version}` : ""}`} title={bundle.curriculum.title} detail={`${bundle.curriculum.modules.length} ${l("个模块", "modules")} · ${lessonCount} ${l("节课", "lessons")} · ${l(`已通过 ${passedCount} 节`, `${passedCount} passed`)} · ${bundle.curriculum.estimatedHours} ${l("小时", "hours")}`}>
      <div className="flex flex-wrap gap-2"><Button onClick={onRegenerate} variant="outline" className="secondary-pill"><RefreshCw /> {l("生成新版本", "Generate new version")}</Button>{recommended && <Button onClick={() => onOpenLesson(recommended.id)} className="primary-pill"><Play /> {passedCount ? l("继续学习", "Continue") : l("开始学习", "Start learning")}</Button>}</div>
    </PageHeading>
    <div className="ai-provenance"><Sparkles /><div><strong>{l("OpenAI 生成 · 独立质量门禁", "OpenAI generation · independent quality gate")}</strong><p>{bundle.curriculum.safetyNotice}</p><div className="provenance-metrics"><span className={cn(bundle.quality?.status === "passed" && "is-good", bundle.quality?.status === "blocked" && "is-risk")}>{l("质量", "Quality")} {Math.round(bundle.quality?.overallScore ?? 0)}</span><span>{l("引用资料", "Source citations")} {bundle.citations?.length ?? 0}</span><span>{bundle.generation.storage === "durable" ? l("云端已同步", "Cloud synced") : l("当前设备", "This device")}</span></div></div></div>
    <div className="map-shell"><div className="map-grid" /><div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 py-5">
      {progress.modules.map((module) => {
        const state = module.mastered === module.lessons.length ? "mastered" : !module.unlocked ? "locked" : module.lessons.some((lesson) => lesson.record) ? "active" : "ready";
        return <section key={module.index} className="w-full">
          <div className={cn("knowledge-node w-full max-w-none", "node-" + state)}><span className="node-index">{state === "mastered" ? <Check /> : state === "locked" ? <LockKeyhole /> : module.index + 1}</span><span className="min-w-0 flex-1 text-left"><strong>{module.title}</strong><small>{module.unlocked ? l(`${module.lessons.length} 节课 · 已通过 ${module.lessons.filter((lesson) => lesson.passed).length} · 已掌握 ${module.mastered}`, `${module.lessons.length} lessons · ${module.lessons.filter((lesson) => lesson.passed).length} passed · ${module.mastered} mastered`) : l("完成上一模块各节练习后解锁", "Unlocks when every lesson in the previous module is passed")}</small></span><span className="node-score">{module.score}%</span></div>
          <ol className="mt-2 grid gap-1.5 pl-5 sm:pl-8">
            {module.lessons.map((lesson) => {
              const isNext = lesson.id === progress.recommendedId;
              return <li key={lesson.id}><button type="button" disabled={!lesson.unlocked} onClick={() => onOpenLesson(lesson.id)} className={cn("flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/7 bg-white/[0.02] px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40", isNext && "border-cyan-300/40 bg-cyan-300/[0.06] text-white")}>
                {lesson.record?.mastered ? <CircleCheck className="size-4 flex-none text-emerald-300" /> : lesson.passed ? <CircleCheck className="size-4 flex-none text-cyan-300" /> : !lesson.unlocked ? <LockKeyhole className="size-4 flex-none text-slate-600" /> : <Circle className="size-4 flex-none text-slate-500" />}
                <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                {isNext && <span className="flex-none text-xs text-cyan-200">{l("下一节", "Up next")}</span>}
                <span className="flex-none text-xs tabular-nums text-slate-500">{lesson.record?.score ?? 0}%</span>
              </button></li>;
            })}
          </ol>
        </section>;
      })}
    </div><div className="map-legend"><span><CircleCheck className="size-3 text-emerald-300" /> {l("已掌握", "Mastered")}</span><span><CircleCheck className="size-3 text-cyan-300" /> {l("已通过练习", "Practice passed")}</span><span><LockKeyhole className="size-3 text-slate-500" /> {l("待解锁", "Locked")}</span></div></div>
  </div>;
}
