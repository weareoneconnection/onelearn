"use client";

import { Check, LockKeyhole, Orbit, Play, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/onelearn/catalog";
import { courseTitleEn, type Locale, pick } from "@/lib/onelearn/i18n";
import type { GeneratedCourseBundle } from "@/lib/onelearn/generated-course";
import type { MasteryOverview, View } from "./types";
import { PageHeading } from "./ui";

export function KnowledgeMap({ onNavigate, activeCourse, bundle, locale, onRegenerate, mastery }: { onNavigate: (view: View) => void; activeCourse: CatalogEntry | null; bundle: GeneratedCourseBundle | null; locale: Locale; onRegenerate: () => void; mastery: MasteryOverview | null }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const fallbackNodes = [
    { id: 1, title: l("AI 基础", "AI foundations"), meta: l("已掌握", "Mastered"), score: 94, state: "mastered" },
    { id: 2, title: l("提示词系统", "Prompt systems"), meta: l("已掌握", "Mastered"), score: 88, state: "mastered" },
    { id: 3, title: l("API 与结构化数据", "APIs & structured data"), meta: l("学习中", "In progress"), score: 72, state: "active" },
    { id: 4, title: "Tool Calling", meta: l("下一步", "Ready next"), score: 18, state: "ready" },
    { id: 5, title: l("记忆与上下文", "Memory & context"), meta: l("未解锁", "Locked"), score: 0, state: "locked" },
    { id: 6, title: l("生产级 Agent", "Production agent"), meta: l("未解锁", "Locked"), score: 0, state: "locked" },
  ];
  // Module score = average of its lessons' mastery; a module unlocks once any lesson of the previous one is stable (≥ 65).
  const recordFor = (lessonId: string) => mastery?.records.find((record) => record.courseVersionId === bundle?.generation.courseVersionId && record.nodeKey === lessonId);
  const moduleStats = bundle ? bundle.curriculum.modules.map((module) => {
    const records = module.lessons.map((lesson) => recordFor(lesson.id));
    return {
      score: Math.round(records.reduce((sum, record) => sum + (record?.score ?? 0), 0) / Math.max(1, records.length)),
      best: Math.max(0, ...records.map((record) => record?.score ?? 0)),
      mastered: records.filter((record) => record?.mastered).length,
    };
  }) : [];
  const pathNodes = bundle ? bundle.curriculum.modules.map((module, index) => {
    const stats = moduleStats[index];
    const unlocked = index === 0 || moduleStats[index - 1].best >= 65;
    const state = stats.mastered === module.lessons.length ? "mastered" : !unlocked ? "locked" : stats.best > 0 ? "active" : "ready";
    return {
      id: index + 1,
      title: module.title,
      meta: state === "locked" ? l("完成上一模块后解锁", "Unlocks after the previous module") : l(`${module.lessons.length} 节课 · 已掌握 ${stats.mastered}`, `${module.lessons.length} lessons · ${stats.mastered} mastered`),
      score: stats.score,
      state,
    };
  }) : fallbackNodes;
  const activeTitle = activeCourse ? (locale === "en" ? courseTitleEn(activeCourse.title) : activeCourse.title) : null;
  if (activeCourse && !bundle) return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="OPENAI CURRICULUM ENGINE" title={activeTitle ?? activeCourse.title} detail={l("这门课程还没有生成当前语言版本。", "This course has not been generated in the current language yet.")}><Button onClick={onRegenerate} className="primary-pill"><Sparkles /> {l("用 OpenAI 生成", "Generate with OpenAI")}</Button></PageHeading><article className="ai-empty-state"><Orbit /><h2>{l("目录是入口，课程由大模型按需创建", "The catalog is the entry; the model creates the course on demand")}</h2><p>{l("OpenAI 会生成模块、课节、首课正文、检查问题与练习，并在当前设备缓存结果。", "OpenAI will generate modules, lessons, the first lesson content, checkpoints, and practice, then cache the result on this device.")}</p></article></div>;
  const lessonCount = bundle?.curriculum.modules.reduce((total, module) => total + module.lessons.length, 0) ?? 36;
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={bundle ? `OPENAI · ${bundle.generation.model}${bundle.generation.version ? ` · V${bundle.generation.version}` : ""}` : l("自适应知识图谱", "ADAPTIVE KNOWLEDGE GRAPH")} title={bundle?.curriculum.title ?? (activeTitle ? l("掌握 ", "Master ") + activeTitle : l("构建生产级 AI Agent", "Build a production AI agent"))} detail={bundle ? `${bundle.curriculum.modules.length} ${l("个模块", "modules")} · ${lessonCount} ${l("节课", "lessons")} · ${bundle.curriculum.estimatedHours} ${l("小时", "hours")}` : l("36 个节点 · 24 个已掌握 · 4 个当前可学", "36 nodes · 24 mastered · 4 currently available")}><div className="flex flex-wrap gap-2">{bundle && <Button onClick={onRegenerate} variant="outline" className="secondary-pill"><RefreshCw /> {l("生成新版本", "Generate new version")}</Button>}<Button onClick={() => onNavigate("learn")} className="primary-pill"><Play /> {l("开始学习", "Start learning")}</Button></div></PageHeading>{bundle && <div className="ai-provenance"><Sparkles /><div><strong>{l("OpenAI 生成 · 独立质量门禁", "OpenAI generation · independent quality gate")}</strong><p>{bundle.curriculum.safetyNotice}</p><div className="provenance-metrics"><span className={cn(bundle.quality?.status === "passed" && "is-good", bundle.quality?.status === "blocked" && "is-risk")}>{l("质量", "Quality")} {Math.round(bundle.quality?.overallScore ?? 0)}</span><span>{l("引用资料", "Source citations")} {bundle.citations?.length ?? 0}</span><span>{bundle.generation.storage === "durable" ? l("云端已同步", "Cloud synced") : l("当前设备", "This device")}</span></div></div></div>}<div className="map-shell"><div className="map-grid" /><div className="path-line" aria-hidden="true" /><div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-5 py-5">{pathNodes.map((node, i) => <button key={node.id} disabled={node.state === "locked"} onClick={() => node.state !== "locked" && onNavigate("learn")} className={cn("knowledge-node", "node-" + node.state, i % 2 ? "translate-x-[clamp(0px,8vw,90px)]" : "-translate-x-[clamp(0px,8vw,90px)]")}><span className="node-index">{node.state === "mastered" ? <Check /> : node.state === "locked" ? <LockKeyhole /> : node.id}</span><span className="min-w-0 flex-1 text-left"><strong>{node.title}</strong><small>{node.meta}</small></span><span className="node-score">{node.score}%</span></button>)}</div><div className="map-legend"><span><i className="bg-cyan-300" /> {l("可以开始", "Ready")}</span><span><i className="bg-slate-600" /> {l("待解锁", "Locked")}</span></div></div></div>;
}
