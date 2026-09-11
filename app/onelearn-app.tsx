"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, BrainCircuit, Check, ChevronRight, CircleHelp,
  FileText, Flame, FolderOpen, GraduationCap, Languages, LayoutDashboard, LibraryBig,
  LockKeyhole, Map, Mic, MoreHorizontal, Orbit, Play, Plus, Search, Settings,
  ShieldCheck, Sparkles, Target, TimerReset, Trophy, Upload, WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  academies, academyEntryCount, catalogScale, courseCatalog, dynamicCourseModes,
  futureCatalogScale, launchSequence, searchCatalog, type Academy, type CatalogEntry,
} from "@/lib/onelearn/catalog";
import {
  academyName, academyNotesEn, courseTitleEn, formatCatalogNumber, groupName,
  levelName, pick, type Locale,
} from "@/lib/onelearn/i18n";

type View = "dashboard" | "catalog" | "path" | "learn" | "practice" | "review" | "library" | "proof";
type WebModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

const navItems = [
  { id: "dashboard" as View, zh: "今日学习", en: "Today", icon: LayoutDashboard },
  { id: "catalog" as View, zh: "课程宇宙", en: "Course universe", icon: LibraryBig },
  { id: "path" as View, zh: "知识地图", en: "Knowledge map", icon: Map },
  { id: "learn" as View, zh: "学习空间", en: "Learning room", icon: GraduationCap },
  { id: "practice" as View, zh: "练习", en: "Practice", icon: Target },
  { id: "review" as View, zh: "复习", en: "Review", icon: TimerReset },
  { id: "library" as View, zh: "资料库", en: "Sources", icon: FolderOpen },
  { id: "proof" as View, zh: "掌握证明", en: "Mastery proof", icon: ShieldCheck },
];

const dynamicCopyEn: Record<string, { title: string; description: string; example: string; outputs: string[] }> = {
  goal: {
    title: "Goal-generated course",
    description: "Describe the capability and timeframe. OneLearn creates a dedicated course instantly without waiting for a marketplace listing.",
    example: "I want to learn how to build an AI SaaS independently in 30 days.",
    outputs: ["Skill diagnostic", "Personal path", "Daily missions", "Mastery proof"],
  },
  source: {
    title: "Source-generated course",
    description: "Upload a book, paper, standard, or company document and turn trusted material into a complete learning loop.",
    example: "Upload a book, paper, standard, or company document.",
    outputs: ["Knowledge map", "Lessons", "Practice", "Error log", "Project", "Exam", "Review plan"],
  },
  outcome: {
    title: "Outcome-backward course",
    description: "Start from a real-world outcome and work backward to the essential knowledge, skills, and deliverables.",
    example: "Pass an interview, deliver a project, build a product, pass PMP, or present to a client in English.",
    outputs: ["Outcome breakdown", "Gap diagnostic", "Task path", "Scenario practice", "Outcome verification"],
  },
};

const futureScaleEn = ["Academies", "Primary disciplines", "Standard learning paths", "Standalone courses", "Knowledge nodes", "Dynamic personalized courses"];
const launchSequenceEn = [
  "AI & AI agents", "Programming & digital skills", "Construction AI & engineering management",
  "English & professional communication", "Project management & certification exams",
  "Enterprise knowledge learning", "Open uploads for any source", "Open course creation for experts and institutions",
];

function Brand() {
  return <div className="flex items-center gap-3 px-2"><div className="brand-mark" aria-hidden="true"><span /></div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><div className="text-[15px] font-semibold tracking-[-0.02em] text-white">OneLearn</div><div className="text-[11px] tracking-[0.16em] text-slate-500">MASTERY OS</div></div></div>;
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof BrainCircuit }) {
  return <article className="metric-card"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><span className="icon-well"><Icon className="size-4" /></span></div><div className="mt-5 text-[2rem] font-medium leading-none tracking-[-0.05em] text-white">{value}</div><p className="mt-2 text-xs text-slate-500">{detail}</p></article>;
}

function Dashboard({ onNavigate, locale }: { onNavigate: (view: View) => void; locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const activities = [
    [l("09:10", "09:10"), l("JSON 响应契约", "JSON response contracts"), l("课程", "Lesson"), l("掌握度 +6", "+6 mastery")],
    [l("09:28", "09:28"), l("Schema 修复挑战", "Schema repair challenge"), l("练习", "Practice"), l("已通过", "Passed")],
    [l("昨天", "Yesterday"), l("API 身份认证", "API authentication"), l("复习", "Review"), l("已稳定", "Stable")],
  ];
  const missionSteps = locale === "zh"
    ? ["理解 JSON Schema", "修复无效响应", "通过无提示检查"]
    : ["Understand JSON schemas", "Repair an invalid response", "Pass the no-hint check"];
  const reviewItems = locale === "zh" ? ["Token 窗口", "API 状态码", "System Prompt"] : ["Token windows", "API status codes", "System prompts"];
  return <div className="space-y-7 animate-in fade-in duration-500">
    <section className="dashboard-hero">
      <div className="relative z-10 max-w-2xl"><div className="eyebrow"><Sparkles className="size-3.5" />{l("自适应计划 · 第 12 天", "ADAPTIVE PLAN · DAY 12")}</div><h1>{l("早上好，King。", "Good morning, King.")}</h1><p>{l("再完成一次专注学习，你就能解锁", "You are one focused session away from unlocking")} <span>Tool Calling</span>{l("。", ".")}</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => onNavigate("learn")} className="primary-pill">{l("继续学习", "Continue learning")} <ArrowRight /></Button><Button onClick={() => onNavigate("path")} variant="outline" className="secondary-pill">{l("查看知识地图", "View knowledge map")}</Button></div></div>
      <div className="mastery-orbit" aria-label={l("当前路径掌握度 68%", "Current path mastery 68 percent")}><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-core"><strong>68%</strong><span>{l("路径掌握度", "PATH MASTERY")}</span></div><i className="orbit-node node-a" /><i className="orbit-node node-b" /><i className="orbit-node node-c" /></div>
    </section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label={l("已验证掌握", "Verified mastery")} value="24" detail={l("个知识节点", "knowledge nodes")} icon={BrainCircuit} /><MetricCard label={l("连续学习", "Learning streak")} value={l("12 天", "12 d")} detail={l("最佳纪录：18 天", "best streak: 18 days")} icon={Flame} /><MetricCard label={l("保持率", "Retention")} value="91%" detail={l("延迟复习后", "after delayed review")} icon={TimerReset} /><MetricCard label={l("能力证据", "Evidence")} value="8" detail={l("个已验证成果", "verified artifacts")} icon={ShieldCheck} /></section>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="section-kicker">{l("今日任务", "TODAY'S MISSION")}</div><h2 className="mt-2 text-xl font-medium tracking-tight text-white">{l("让模型输出更可靠", "Make model outputs reliable")}</h2><p className="mt-1 text-sm text-slate-400">{l("API 与结构化数据 · 第 4/6 课", "APIs & structured data · Lesson 4 of 6")}</p></div><span className="time-chip">{l("18 分钟", "18 min")}</span></div><div className="mt-7 grid gap-3 sm:grid-cols-3">{missionSteps.map((item, i) => <div key={item} className={cn("mission-step", i === 0 && "is-current")}><div className="flex items-center gap-2"><span>{i + 1}</span><p>{item}</p></div></div>)}</div><div className="mt-6 flex items-center gap-3"><Progress value={42} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">42%</span></div></article>
      <article className="surface-card flex min-h-[260px] flex-col p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("复习队列", "REVIEW QUEUE")}</div><h2 className="mt-2 text-lg font-medium text-white">{l("3 个节点待复习", "3 nodes due")}</h2></div><TimerReset className="size-5 text-amber-300" /></div><div className="mt-5 space-y-2">{reviewItems.map((item, i) => <button key={item} onClick={() => onNavigate("review")} className="review-row"><span className={cn("review-priority", i === 0 ? "high" : "normal")} /><span className="flex-1 text-left text-sm text-slate-200">{item}</span><span className="text-xs text-slate-500">{i === 0 ? l("薄弱", "fragile") : l("到期", "due")}</span><ChevronRight className="size-4 text-slate-600" /></button>)}</div><Button onClick={() => onNavigate("review")} variant="ghost" className="link-button mt-auto">{l("开始 8 分钟复习", "Start 8-minute review")} <ArrowRight /></Button></article>
    </section>
    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("掌握速度", "MASTERY VELOCITY")}</div><h2 className="mt-2 text-lg font-medium text-white">{l("本周", "This week")}</h2></div><span className="text-sm text-emerald-300">+18%</span></div><div className="velocity-chart" aria-label={l("每周掌握度增长图", "Weekly mastery gain chart")}>{[36, 55, 42, 72, 60, 86, 68].map((height, i) => <div key={i} className="chart-column"><i style={{ height: String(height) + "%" }} /><span>{(locale === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : ["M", "T", "W", "T", "F", "S", "S"])[i]}</span></div>)}</div></article>
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("学习轨迹", "LEARNING TRACE")}</div><h2 className="mt-2 text-lg font-medium text-white">{l("最近的能力证据", "Recent evidence")}</h2></div><MoreHorizontal className="size-4 text-slate-600" /></div><div className="mt-5 divide-y divide-white/6">{activities.map((a) => <div key={a[1]} className="grid grid-cols-[62px_1fr_auto] items-center gap-3 py-3.5"><span className="text-xs text-slate-600">{a[0]}</span><div><p className="text-sm text-slate-200">{a[1]}</p><p className="text-xs text-slate-500">{a[2]}</p></div><span className="text-xs text-cyan-300">{a[3]}</span></div>)}</div></article>
    </section>
  </div>;
}

function courseKindLabel(course: CatalogEntry, locale: Locale) {
  if (course.kind === "language_path") return pick(locale, "语言专属路径", "Language path");
  if (course.kind === "exam_path") return pick(locale, "考试学习模块", "Exam module");
  return pick(locale, "标准课程", "Standard course");
}

function AcademyCard({ academy, onOpen, locale }: { academy: Academy; onOpen: () => void; locale: Locale }) {
  const sample = academy.groups.flatMap((item) => item.courses).slice(0, 3);
  const l = (zh: string, en: string) => pick(locale, zh, en);
  return <button onClick={onOpen} className="academy-card">
    <div className="flex items-start justify-between gap-3"><span className="academy-index">{academy.id}</span><span className="academy-count">{academyEntryCount(academy.id)} {l("条路径", "paths")}</span></div>
    <h2>{academyName(academy.id, academy.name, locale)}</h2>
    <p>{academy.groups.map((item) => groupName(item.name, locale)).join(" · ")}</p>
    <div className="academy-samples">{sample.map((course) => <span key={course}>{locale === "en" ? courseTitleEn(course) : course}</span>)}</div>
    <div className="academy-open">{l("浏览全部", "Browse all")} <ArrowRight /></div>
  </button>;
}

function CourseUniverse({ selectedCourse, onSelectCourse, onStartCourse, locale }: {
  selectedCourse: CatalogEntry | null;
  onSelectCourse: (course: CatalogEntry | null) => void;
  onStartCourse: (course: CatalogEntry) => void;
  locale: Locale;
}) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [query, setQuery] = useState("");
  const [academyId, setAcademyId] = useState("all");
  const [group, setGroup] = useState("all");
  const [visibleCount, setVisibleCount] = useState(72);
  const [dynamicMode, setDynamicMode] = useState<(typeof dynamicCourseModes)[number] | null>(null);
  const activeAcademy = academies.find((academy) => academy.id === academyId);
  const filteredCourses = useMemo(() => {
    const matches = searchCatalog(query, academyId);
    return group === "all" ? matches : matches.filter((course) => course.group === group);
  }, [academyId, group, query]);
  const showOverview = academyId === "all" && !query.trim();
  const displayCourseTitle = (course: CatalogEntry) => locale === "en" ? courseTitleEn(course.title) : course.title;
  const displayAcademy = (course: CatalogEntry) => academyName(course.academyId, course.academy, locale);
  const dynamicText = dynamicMode ? (locale === "en" ? dynamicCopyEn[dynamicMode.id] : {
    title: dynamicMode.title, description: dynamicMode.description, example: dynamicMode.example, outputs: [...dynamicMode.outputs],
  }) : null;

  const beginDynamicCourse = () => {
    if (!dynamicMode) return;
    const english = dynamicCopyEn[dynamicMode.id];
    onStartCourse({
      id: "dynamic-" + dynamicMode.id,
      title: dynamicMode.title,
      academyId: "dynamic",
      academy: "动态课程引擎",
      group: dynamicMode.title,
      kind: "standard",
      level: "专业",
      description: dynamicMode.description,
      searchable: (dynamicMode.title + " " + dynamicMode.description + " " + english.title + " " + english.description).toLocaleLowerCase("en-US"),
    });
    setDynamicMode(null);
  };

  return <div className="space-y-7 animate-in fade-in duration-500">
    <section className="catalog-hero">
      <div className="catalog-hero-copy"><div className="eyebrow"><Sparkles className="size-3.5" /> ONELEARN COURSE UNIVERSE</div><h1>{l("把世界知识，变成你的掌握路径。", "Turn the world's knowledge into your mastery path.")}</h1><p>{l("覆盖主要人类知识与职业能力。选择标准课程，或从你的目标、资料与现实结果即时生成专属课程。", "Explore major fields of human knowledge and professional capability. Choose a standard course, or generate one instantly from your goal, source material, or desired outcome.")}</p></div>
      <div className="catalog-scale">{catalogScale.map((item, index) => <div key={item.label}><strong>{item.value}</strong><span>{locale === "zh" ? item.label : ["Academies", "Standard courses", "Available paths", "Dynamic courses"][index]}</span></div>)}</div>
    </section>

    <section className="catalog-toolbar" aria-label={l("课程筛选", "Course filters")}>
      <div className="catalog-search"><Search /><Input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(72); }} placeholder={l("搜索课程、学院、技能或认证…", "Search courses, academies, skills, or certifications…")} /></div>
      <select aria-label={l("选择学院", "Choose an academy")} value={academyId} onChange={(event) => { setAcademyId(event.target.value); setGroup("all"); setVisibleCount(72); }}>
        <option value="all">{l("全部 32 个学院", "All 32 academies")}</option>
        {academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.id}. {academyName(academy.id, academy.name, locale)}</option>)}
      </select>
    </section>

    {showOverview ? <>
      <section><div className="catalog-section-heading"><div><div className="section-kicker">DYNAMIC CURRICULUM</div><h2>{l("三种方式，学习任何可信知识", "Three ways to learn any trusted knowledge")}</h2></div><span>{l("无需等待课程预制", "No prebuilt course required")}</span></div><div className="dynamic-grid">{dynamicCourseModes.map((mode, index) => {
        const Icon = [WandSparkles, FileText, Target][index];
        const copy = locale === "en" ? dynamicCopyEn[mode.id] : { title: mode.title, description: mode.description, outputs: [...mode.outputs] };
        return <button key={mode.id} onClick={() => setDynamicMode(mode)} className="dynamic-card"><span className="dynamic-icon"><Icon /></span><small>{mode.eyebrow}</small><h3>{copy.title}</h3><p>{copy.description}</p><div>{copy.outputs.slice(0, 4).map((output) => <span key={output}>{output}</span>)}</div><strong>{l("立即生成", "Generate now")} <ArrowRight /></strong></button>;
      })}</div></section>
      <section><div className="catalog-section-heading"><div><div className="section-kicker">32 ACADEMIES</div><h2>{l("完整知识与职业能力版图", "A complete map of knowledge and professional skills")}</h2></div><span>{l("共", "")} {formatCatalogNumber(courseCatalog.length, locale)} {l("条可选学习路径", "available learning paths")}</span></div><div className="academy-grid">{academies.map((academy) => <AcademyCard key={academy.id} academy={academy} locale={locale} onOpen={() => { setAcademyId(academy.id); setGroup("all"); setVisibleCount(72); }} />)}</div></section>
      <section className="catalog-roadmap"><div><div className="section-kicker">COURSE UNIVERSE ROADMAP</div><h2>{l("从重点首发，到无限个性化", "From focused launch to unlimited personalization")}</h2><p>{l("OneLearn 的终点不是堆积课程，而是把任何可信知识转化为可验证、可保持的个性化学习路径。", "OneLearn is not about stockpiling courses. It turns any trusted knowledge into a personalized path that can be verified and retained.")}</p><div className="future-scale">{futureCatalogScale.map((item, index) => <div key={item.label}><strong>{locale === "en" && item.value === "理论上无限" ? "Unlimited" : item.value}</strong><span>{locale === "zh" ? item.label : futureScaleEn[index]}</span></div>)}</div></div><ol>{launchSequence.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{locale === "zh" ? item : launchSequenceEn[index]}</p></li>)}</ol></section>
    </> : <section className="catalog-results">
      <div className="catalog-section-heading"><div>{activeAcademy && <button className="catalog-back" onClick={() => { setAcademyId("all"); setGroup("all"); setQuery(""); setVisibleCount(72); }}><ArrowLeft /> {l("全部学院", "All academies")}</button>}<div className="section-kicker">{activeAcademy ? "ACADEMY " + activeAcademy.id : l("搜索结果", "SEARCH RESULTS")}</div><h2>{activeAcademy ? academyName(activeAcademy.id, activeAcademy.name, locale) : l("“" + query + "” 的搜索结果", "Results for “" + query + "”")}</h2>{activeAcademy?.note && <p className="academy-note"><ShieldCheck />{locale === "en" ? academyNotesEn[activeAcademy.id] : activeAcademy.note}</p>}</div><span>{formatCatalogNumber(filteredCourses.length, locale)} {l("条学习路径", "learning paths")}</span></div>
      {activeAcademy && activeAcademy.groups.length > 1 && <div className="group-tabs"><button onClick={() => { setGroup("all"); setVisibleCount(72); }} className={cn(group === "all" && "is-active")}>{l("全部", "All")}</button>{activeAcademy.groups.map((item) => <button key={item.name} onClick={() => { setGroup(item.name); setVisibleCount(72); }} className={cn(group === item.name && "is-active")}>{groupName(item.name, locale)}</button>)}</div>}
      {filteredCourses.length ? <><div className="course-grid">{filteredCourses.slice(0, visibleCount).map((course) => <button key={course.id} onClick={() => onSelectCourse(course)} className="course-card"><div className="flex items-center justify-between gap-2"><span className={cn("course-level", "level-" + course.level)}>{levelName(course.level, locale)}</span><span className="course-kind">{courseKindLabel(course, locale)}</span></div><h3>{displayCourseTitle(course)}</h3><p>{groupName(course.group, locale)} · {displayAcademy(course)}</p>{locale === "en" && displayCourseTitle(course) !== course.title && <small className="course-original">{course.title}</small>}<div>{l("查看学习路径", "View learning path")} <ChevronRight /></div></button>)}</div>{visibleCount < filteredCourses.length && <div className="flex justify-center pt-2"><Button onClick={() => setVisibleCount((count) => count + 72)} variant="outline" className="secondary-pill">{l("加载更多课程（剩余 " + (filteredCourses.length - visibleCount) + "）", "Load more (" + (filteredCourses.length - visibleCount) + " remaining)")}</Button></div>}</> : <div className="catalog-empty"><Search /><h3>{l("没有找到匹配课程", "No matching courses")}</h3><p>{l("可以换一个关键词，或使用“用户生成课程”即时创建。", "Try a shorter keyword or generate a course from your goal.")}</p><Button onClick={() => { setAcademyId("all"); setGroup("all"); setQuery(""); setVisibleCount(72); }} variant="outline" className="secondary-pill">{l("返回课程宇宙", "Back to course universe")}</Button></div>}
    </section>}

    <Dialog open={Boolean(selectedCourse)} onOpenChange={(open) => { if (!open) onSelectCourse(null); }}><DialogContent className="course-dialog border-white/10 bg-[#0c1422] text-white sm:max-w-2xl">{selectedCourse && <><DialogHeader><div className="flex items-center gap-2"><span className="course-level">{levelName(selectedCourse.level, locale)}</span><span className="course-kind">{courseKindLabel(selectedCourse, locale)}</span></div><DialogTitle className="pt-3 text-2xl">{displayCourseTitle(selectedCourse)}</DialogTitle><DialogDescription className="text-slate-400">{displayAcademy(selectedCourse)} · {groupName(selectedCourse.group, locale)}</DialogDescription></DialogHeader><p className="course-description">{l(selectedCourse.description, "Build a complete mastery path for “" + courseTitleEn(selectedCourse.title) + "”, from entry diagnostic and knowledge map to guided learning, practice, project verification, and long-term review.")}</p><div className="path-preview">{(locale === "zh" ? ["起点诊断", "知识地图", "AI 精讲", "自适应练习", "真实项目", "掌握证明"] : ["Entry diagnostic", "Knowledge map", "AI instruction", "Adaptive practice", "Real project", "Mastery proof"]).map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></div>)}</div><DialogFooter><Button variant="ghost" onClick={() => onSelectCourse(null)} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("稍后再看", "Maybe later")}</Button><Button onClick={() => onStartCourse(selectedCourse)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{l("建立我的学习路径", "Build my learning path")} <ArrowRight /></Button></DialogFooter></>}</DialogContent></Dialog>

    <Dialog open={Boolean(dynamicMode)} onOpenChange={(open) => { if (!open) setDynamicMode(null); }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl">{dynamicMode && dynamicText && <><DialogHeader><div className="section-kicker">{dynamicMode.eyebrow}</div><DialogTitle className="pt-2 text-2xl">{dynamicText.title}</DialogTitle><DialogDescription className="leading-6 text-slate-400">{dynamicText.description}</DialogDescription></DialogHeader><div className="dynamic-example"><span>{l("示例输入", "EXAMPLE INPUT")}</span><p>“{dynamicText.example}”</p></div><div className="dynamic-outputs">{dynamicText.outputs.map((output) => <span key={output}><Check />{output}</span>)}</div><DialogFooter><Button variant="ghost" onClick={() => setDynamicMode(null)} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("取消", "Cancel")}</Button><Button onClick={beginDynamicCourse} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{l("开始生成路径", "Generate path")} <WandSparkles /></Button></DialogFooter></>}</DialogContent></Dialog>
  </div>;
}

function KnowledgeMap({ onNavigate, activeCourse, locale }: { onNavigate: (view: View) => void; activeCourse: CatalogEntry | null; locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const pathNodes = [
    { id: 1, title: l("AI 基础", "AI foundations"), meta: l("已掌握", "Mastered"), score: 94, state: "mastered" },
    { id: 2, title: l("提示词系统", "Prompt systems"), meta: l("已掌握", "Mastered"), score: 88, state: "mastered" },
    { id: 3, title: l("API 与结构化数据", "APIs & structured data"), meta: l("学习中", "In progress"), score: 72, state: "active" },
    { id: 4, title: "Tool Calling", meta: l("下一步", "Ready next"), score: 18, state: "ready" },
    { id: 5, title: l("记忆与上下文", "Memory & context"), meta: l("未解锁", "Locked"), score: 0, state: "locked" },
    { id: 6, title: l("生产级 Agent", "Production agent"), meta: l("未解锁", "Locked"), score: 0, state: "locked" },
  ];
  const activeTitle = activeCourse ? (locale === "en" ? courseTitleEn(activeCourse.title) : activeCourse.title) : null;
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("自适应知识图谱", "ADAPTIVE KNOWLEDGE GRAPH")} title={activeTitle ? l("掌握 ", "Master ") + activeTitle : l("构建生产级 AI Agent", "Build a production AI agent")} detail={activeCourse ? academyName(activeCourse.academyId, activeCourse.academy, locale) + " · " + l("已生成 36 个知识节点", "36 knowledge nodes generated") : l("36 个节点 · 24 个已掌握 · 4 个当前可学", "36 nodes · 24 mastered · 4 currently available")}><Button onClick={() => onNavigate("learn")} className="primary-pill"><Play /> {l("继续路径", "Resume path")}</Button></PageHeading><div className="map-shell"><div className="map-grid" /><div className="path-line" aria-hidden="true" /><div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-5 py-5">{pathNodes.map((node, i) => <button key={node.id} disabled={node.state === "locked"} onClick={() => node.state !== "locked" && onNavigate("learn")} className={cn("knowledge-node", "node-" + node.state, i % 2 ? "translate-x-[clamp(0px,8vw,90px)]" : "-translate-x-[clamp(0px,8vw,90px)]")}><span className="node-index">{node.state === "mastered" ? <Check /> : node.state === "locked" ? <LockKeyhole /> : node.id}</span><span className="min-w-0 flex-1 text-left"><strong>{node.title}</strong><small>{node.meta}</small></span><span className="node-score">{node.score}%</span></button>)}</div><div className="map-legend"><span><i className="bg-emerald-300" /> {l("已掌握", "Mastered")}</span><span><i className="bg-cyan-300" /> {l("学习中", "Learning")}</span><span><i className="bg-slate-600" /> {l("未解锁", "Locked")}</span></div></div></div>;
}

function LearningRoom({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [messages, setMessages] = useState([{ from: "tutor", text: l("进入下一步前，请解释：为什么模型返回了有效 JSON，应用仍可能拒绝它？", "Before we move on: why can a model return valid JSON that still fails your application?") }]);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(1);
  const submit = () => {
    if (!answer.trim()) return;
    setMessages((items) => [...items, { from: "you", text: answer }, { from: "tutor", text: l("完全正确：语法可能有效，但字段、类型或约束仍可能违反契约。你已经理解了这个关键区别。", "Exactly—the syntax may be valid while fields, types, or constraints violate the contract. Your explanation shows applied understanding.") }]);
    setAnswer("");
    setStep(2);
  };
  return <div className="learning-layout animate-in fade-in duration-500"><section className="lesson-surface"><div className="flex items-center justify-between border-b border-white/7 px-5 py-4 sm:px-7"><div><div className="section-kicker">{l("第 4 课 · 18 分钟", "LESSON 4 · 18 MIN")}</div><h1 className="mt-1 text-lg font-medium text-white">{l("可靠的结构化输出", "Reliable structured outputs")}</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">{l("专注模式", "Focus mode")}</span><span className="status-dot" /></div></div><div className="lesson-body"><div className="lesson-number">04</div><div className="section-kicker">{l("核心概念", "CONCEPT")}</div><h2>{l("提示词提出要求。", "A prompt asks.")}<br />{l("Schema 强制执行。", "A schema enforces.")}</h2><p>{l("结构化输出契约定义了应用能够接受的精确数据形状，把一条期望性指令变成机器可检查的边界。", "A structured output contract defines the exact shape your application can accept. It turns a hopeful instruction into a machine-checkable boundary.")}</p><div className="concept-compare"><div><span>PROMPT</span><code>{l("“用 JSON 返回姓名和分数。”", "“Return name and score as JSON.”")}</code><small>{l("仅表达意图", "Intent only")}</small></div><ArrowRight className="size-5 text-slate-600" /><div className="is-strong"><span>SCHEMA</span><code>{"{ name: string, score: 0..100 }"}</code><small>{l("可执行契约", "Enforceable contract")}</small></div></div><div className="insight-note"><BrainCircuit className="size-5" /><p><strong>{l("迁移洞见", "Transfer insight")}</strong>{l("Schema 不会让模型更聪明，但会让失败变得可见、可分类、可修复。", "A schema does not make the model smarter. It makes failure visible, classifiable, and repairable.")}</p></div></div><div className="border-t border-white/7 p-4 sm:px-7"><div className="flex items-center gap-3"><Progress value={step === 1 ? 58 : 76} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">{step === 1 ? "58" : "76"}%</span></div></div></section><aside className="tutor-panel"><div className="flex items-center gap-3 border-b border-white/7 p-5"><div className="tutor-avatar"><Orbit /></div><div><h2 className="text-sm font-medium text-white">Sora · {l("AI 导师", "AI Tutor")}</h2><p className="text-xs text-emerald-300">{l("正在检查理解", "Checking understanding")}</p></div></div><div className="tutor-thread scrollbar-thin">{messages.map((message, i) => <div key={i} className={cn("message", message.from === "you" && "message-you")}><span>{message.from === "tutor" ? "SORA" : l("你", "YOU")}</span><p>{message.text}</p></div>)}{step === 2 && <div className="mastery-signal"><Check className="size-4" /><span>{l("理解证据已记录", "Understanding evidence captured")}</span></div>}</div><div className="tutor-input-wrap"><label htmlFor="tutor-answer" className="sr-only">{l("回答导师", "Answer your tutor")}</label><textarea id="tutor-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder={l("用你自己的话解释…", "Explain in your own words…")} /><div className="flex items-center justify-between"><Button variant="ghost" size="icon-sm" aria-label={l("语音输入", "Voice input")} className="text-slate-500"><Mic /></Button><Button onClick={submit} size="sm" className="primary-pill h-8">{l("发送", "Send")} <ArrowRight /></Button></div></div></aside></div>;
}

function PracticeView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const options = locale === "zh"
    ? ["模型没有遵循提示词", "JSON 格式无效", "输出违反了预期 Schema", "API 请求超时"]
    : ["The model did not follow the prompt", "The JSON is invalid", "The output violates the expected schema", "The API request timed out"];
  return <div className="mx-auto max-w-4xl animate-in fade-in duration-500"><PageHeading kicker={l("自适应练习", "ADAPTIVE PRACTICE")} title={l("Schema 推理", "Schema reasoning")} detail={l("第 3/8 项挑战 · 难度会随每次回答自动调整", "Challenge 3 of 8 · difficulty adapts after every answer")}><span className="time-chip">05:42</span></PageHeading><article className="surface-card mt-8 overflow-hidden"><div className="border-b border-white/7 p-6 sm:p-9"><span className="question-type">{l("单项最佳答案", "SINGLE BEST ANSWER")}</span><h2 className="mt-5 max-w-2xl text-xl font-medium leading-8 text-white">{l("某 API 返回了有效 JSON，但应用拒绝了它，因为 ", "An API returns valid JSON, but your application rejects it because ")}<code>score</code>{l(" 是字符串而不是数字。失败发生在哪里？", " is a string instead of a number. What failed?")}</h2></div><div className="space-y-3 p-6 sm:p-9">{options.map((option, i) => <button key={option} onClick={() => !checked && setSelected(i)} className={cn("answer-option", selected === i && "is-selected", checked && i === 2 && "is-correct", checked && selected === i && i !== 2 && "is-wrong")}><span>{String.fromCharCode(65 + i)}</span><p>{option}</p>{checked && i === 2 && <Check />}</button>)}{checked && <div className="feedback-box"><ShieldCheck /><div><strong>{selected === 2 ? l("正确——这是契约失败。", "Correct — this is a contract failure.") : l("还不完全正确——语法有效和 Schema 有效并不相同。", "Not quite — syntax and schema validity are different.")}</strong><p>{l("JSON 在语法上可以有效，同时仍违反应用要求的字段类型。", "JSON can be syntactically valid while violating the field types your application requires.")}</p></div></div>}<div className="flex justify-end pt-3"><Button disabled={selected === null} onClick={() => setChecked(true)} className="primary-pill">{l("检查答案", "Check answer")}</Button></div></div></article></div>;
}

function ReviewView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const items = [
    { title: l("Token 窗口", "Token windows"), due: l("优先复习", "Priority review"), score: 61, amber: true },
    { title: l("API 状态码", "API status codes"), due: l("今天到期", "Due today"), score: 74 },
    { title: "System Prompts", due: l("今天到期", "Due today"), score: 79 },
  ];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("间隔记忆", "SPACED RETENTION")} title={l("你的复习队列", "Your review queue")} detail={l("今天投入 8 分钟，让三个薄弱概念保持稳定。", "8 minutes today keeps three fragile concepts stable.")}><Button className="primary-pill"><Play /> {l("开始复习", "Start review")}</Button></PageHeading><div className="grid gap-4 lg:grid-cols-3">{items.map((item) => <article key={item.title} className="surface-card p-6"><div className="flex items-center justify-between"><span className={cn("status-chip", item.amber && "is-amber")}>{item.due}</span><TimerReset className="size-5 text-slate-500" /></div><h2 className="mt-8 text-lg font-medium text-white">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{l("预测保持率", "Predicted retention")}</p><div className="mt-5 flex items-center gap-3"><Progress value={item.score} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-sm text-slate-300">{item.score}%</span></div><Button variant="ghost" className="link-button mt-6">{l("现在复习", "Review now")} <ArrowRight /></Button></article>)}</div></div>;
}

function LibraryView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const sources = [
    { name: l("构建 AI Agent — 实战笔记.pdf", "Building AI Agents — field notes.pdf"), type: l("PDF · 84 页", "PDF · 84 pages"), nodes: l("18 个知识节点", "18 knowledge nodes"), trust: l("已验证", "Verified") },
    { name: "OpenAI API reference", type: l("网页资料 · 已同步", "Web source · synced"), nodes: l("12 个知识节点", "12 knowledge nodes"), trust: l("最新", "Current") },
    { name: "Agent systems workshop.md", type: "Markdown · 22 KB", nodes: l("7 个知识节点", "7 knowledge nodes"), trust: l("私有", "Private") },
  ];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("资料库", "SOURCE LIBRARY")} title={l("用你的资料学习", "Learn from your material")} detail={l("每个知识主张始终连接到来源与版本。", "Every claim stays connected to its source and version.")}><Button className="primary-pill"><Upload /> {l("添加资料", "Add source")}</Button></PageHeading><div className="source-drop"><Upload className="size-7" /><h2>{l("把任何资料变成掌握路径", "Turn any source into a mastery path")}</h2><p>{l("拖入 PDF、DOCX、PPTX、Markdown、音频，或粘贴网址。", "Drop PDF, DOCX, PPTX, Markdown, audio, or paste a URL.")}</p><Button variant="outline" className="secondary-pill mt-4">{l("选择文件", "Choose files")}</Button></div><div className="grid gap-3">{sources.map((source) => <article key={source.name} className="source-row"><span className="source-icon"><FileText /></span><div className="min-w-0 flex-1"><h2>{source.name}</h2><p>{source.type} · {source.nodes}</p></div><span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-xs text-emerald-300 sm:block">{source.trust}</span><MoreHorizontal className="size-4 text-slate-600" /></article>)}</div></div>;
}

function ProofView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const proofs = [
    { title: l("结构化输出验证器", "Structured output validator"), type: l("实践项目", "Working project"), detail: l("通过 18/18 项契约测试", "Passed 18/18 contract tests") },
    { title: l("口头答辩：API 可靠性", "Oral defense: API reliability"), type: l("自适应评估", "Adaptive assessment"), detail: l("评估器高度一致", "High evaluator agreement") },
  ];
  const stats = locale === "zh"
    ? [["证据", "8 项成果"], ["评估", "91 / 100"], ["保持率", "稳定"], ["最近验证", "2026年9月11日"]]
    : [["Evidence", "8 artifacts"], ["Assessment", "91 / 100"], ["Retention", "Stable"], ["Last verified", "Sep 11, 2026"]];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("掌握护照", "MASTERY PASSPORT")} title={l("以证据证明能力", "Capability, backed by evidence")} detail={l("不是结课徽章，而是你真正能做什么的动态记录。", "Not a completion badge. A living record of what you can do.")}><Button variant="outline" className="secondary-pill">{l("分享档案", "Share profile")}</Button></PageHeading><article className="passport-card"><div className="passport-glow" /><div className="relative z-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="size-4" /> {l("已验证能力", "VERIFIED CAPABILITY")}</div><h2 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white">{l("AI Agent 基础", "AI Agent Foundations")}</h2><p className="mt-2 text-slate-400">{l("等级 3 · 可独立应用", "Level 3 · Applied independently")}</p></div><div className="passport-seal"><Orbit /></div></div><div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></article><div className="grid gap-4 md:grid-cols-2">{proofs.map((proof) => <article key={proof.title} className="surface-card flex items-center gap-4 p-5"><span className="source-icon"><Trophy /></span><div className="flex-1"><h2 className="text-sm font-medium text-white">{proof.title}</h2><p className="mt-1 text-xs text-slate-500">{proof.type} · {proof.detail}</p></div><ChevronRight className="size-4 text-slate-600" /></article>)}</div></div>;
}

function PageHeading({ kicker, title, detail, children }: { kicker: string; title: string; detail: string; children: React.ReactNode }) {
  return <div className="page-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{detail}</p></div>{children}</div>;
}

function NewGoalDialog({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const goalKinds = locale === "zh"
    ? [[Target, "学习一个目标"], [BookOpen, "学习一份资料"], [Trophy, "准备一个结果"]]
    : [[Target, "Learn a goal"], [BookOpen, "Learn a source"], [Trophy, "Prepare for an outcome"]];
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="w-full justify-start rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0"><Plus /><span className="group-data-[collapsible=icon]:hidden">{l("新建学习目标", "New learning goal")}</span></Button></DialogTrigger><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-xl">{l("你想掌握什么？", "What do you want to master?")}</DialogTitle><DialogDescription className="text-slate-400">{l("描述目标结果，OneLearn 会诊断你的水平并建立最短可信路径。", "Describe the outcome. OneLearn will diagnose your level and build the shortest credible path.")}</DialogDescription></DialogHeader><Input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder={l("例如：构建并部署一个生产级 AI Agent", "e.g. Build and deploy a production AI agent")} className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600" /><div className="grid gap-2 sm:grid-cols-3">{goalKinds.map(([Icon, label], i) => { const GoalIcon = Icon as typeof Target; return <button key={label as string} className={cn("goal-kind", i === 0 && "is-active")}><GoalIcon /><span>{label as string}</span></button>; })}</div><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("取消", "Cancel")}</Button><Button disabled={!goal.trim()} onClick={() => setOpen(false)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{l("开始诊断", "Begin diagnosis")} <ArrowRight /></Button></DialogFooter></DialogContent></Dialog>;
}

function LocaleSwitch({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  return <div className="locale-switch" role="group" aria-label={pick(locale, "界面语言", "Interface language")}><Languages aria-hidden="true" /><button type="button" aria-pressed={locale === "zh"} className={cn(locale === "zh" && "is-active")} onClick={() => onChange("zh")}>中</button><button type="button" aria-pressed={locale === "en"} className={cn(locale === "en" && "is-active")} onClick={() => onChange("en")}>EN</button></div>;
}

export function OneLearnApp() {
  const [view, setView] = useState<View>("dashboard");
  const [locale, setLocale] = useState<Locale>("zh");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CatalogEntry | null>(null);
  const [activeCourse, setActiveCourse] = useState<CatalogEntry | null>(null);
  const l = (zh: string, en: string) => pick(locale, zh, en);

  useEffect(() => {
    const saved = window.localStorage.getItem("onelearn-view") as View | null;
    const savedLocale = window.localStorage.getItem("onelearn-locale") as Locale | null;
    const storedCourse = window.localStorage.getItem("onelearn-active-course");
    const hydrationFrame = window.requestAnimationFrame(() => {
      if (saved && navItems.some((item) => item.id === saved)) setView(saved);
      if (savedLocale === "zh" || savedLocale === "en") {
        setLocale(savedLocale);
        document.documentElement.lang = savedLocale === "zh" ? "zh-CN" : "en";
      }
      if (storedCourse) {
        try { setActiveCourse(JSON.parse(storedCourse) as CatalogEntry); } catch { window.localStorage.removeItem("onelearn-active-course"); }
      }
    });

    const context = (document as Document & { modelContext?: WebModelContext }).modelContext;
    if (!context?.registerTool) return () => window.cancelAnimationFrame(hydrationFrame);
    const lifecycle = new AbortController();
    const views = navItems.map((item) => item.id);

    void Promise.resolve(context.registerTool({
      name: "navigate_learning_surface",
      title: "Open OneLearn section",
      description: "Open a visible OneLearn surface including the course universe, knowledge map, learning room, practice, review, sources, or mastery proof.",
      inputSchema: { type: "object", properties: { view: { type: "string", enum: views } }, required: ["view"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const next = (input as { view?: View })?.view;
        if (!next || !views.includes(next)) throw new Error("Unknown learning surface");
        setView(next);
        window.localStorage.setItem("onelearn-view", next);
        return { view: next, status: "opened" };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    void Promise.resolve(context.registerTool({
      name: "search_course_universe",
      title: "Search OneLearn courses",
      description: "Search the bilingual OneLearn course universe by course, skill, academy, language, or certification.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const query = (input as { query?: string })?.query ?? "";
        const matches = searchCatalog(query);
        return {
          query,
          total: matches.length,
          results: matches.slice(0, 12).map((course) => ({
            titleZh: course.title,
            titleEn: courseTitleEn(course.title),
            academyZh: course.academy,
            academyEn: academyName(course.academyId, course.academy, "en"),
            groupZh: course.group,
            groupEn: groupName(course.group, "en"),
            level: course.level,
          })),
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    void Promise.resolve(context.registerTool({
      name: "get_learning_status",
      title: "Get learning status",
      description: "Read the current OneLearn learner status, interface language, and curriculum scale.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return {
          activeView: window.localStorage.getItem("onelearn-view") ?? "dashboard",
          locale: window.localStorage.getItem("onelearn-locale") ?? "zh",
          pathMastery: 68,
          verifiedNodes: 24,
          retention: 91,
          dueReviews: 3,
          academies: academies.length,
          availableLearningPaths: courseCatalog.length,
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => { window.cancelAnimationFrame(hydrationFrame); lifecycle.abort(); };
  }, []);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  const changeLocale = (next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("onelearn-locale", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
  };
  const navigate = (next: View) => {
    setView(next);
    window.localStorage.setItem("onelearn-view", next);
  };
  const startCourse = (course: CatalogEntry) => {
    setActiveCourse(course);
    setSelectedCourse(null);
    window.localStorage.setItem("onelearn-active-course", JSON.stringify(course));
    navigate("path");
  };
  const commandResults = useMemo(
    () => commandQuery.trim() ? searchCatalog(commandQuery).slice(0, 8) : [],
    [commandQuery],
  );
  const title = useMemo(() => {
    const item = navItems.find((candidate) => candidate.id === view);
    return item ? pick(locale, item.zh, item.en) : pick(locale, "今日学习", "Today");
  }, [locale, view]);

  return <SidebarProvider defaultOpen>
    <Sidebar collapsible="icon" className="border-r border-white/7 bg-[#08101c]" variant="sidebar">
      <SidebarHeader className="p-4"><Brand /></SidebarHeader>
      <SidebarContent className="px-2"><SidebarGroup><SidebarGroupContent><SidebarMenu>{navItems.map((item) => { const label = pick(locale, item.zh, item.en); return <SidebarMenuItem key={item.id}><SidebarMenuButton isActive={view === item.id} tooltip={label} onClick={() => navigate(item.id)} className="h-10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white data-[active=true]:bg-cyan-300/10 data-[active=true]:text-cyan-200"><item.icon /><span>{label}</span></SidebarMenuButton></SidebarMenuItem>; })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter className="gap-3 border-t border-white/7 p-3"><NewGoalDialog locale={locale} /><div className="flex items-center gap-3 rounded-xl p-2 group-data-[collapsible=icon]:justify-center"><span className="flex size-8 items-center justify-center rounded-lg bg-white/7 text-xs font-semibold text-cyan-200">KM</span><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-medium text-slate-200">King Ma</p><p className="text-[11px] text-slate-600">{l("专业学习者", "Pro learner")}</p></div><Settings aria-label={l("设置", "Settings")} className="size-4 text-slate-600 group-data-[collapsible=icon]:hidden" /></div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[#060b13]">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/7 bg-[#060b13]/90 px-4 backdrop-blur-xl sm:px-7"><SidebarTrigger aria-label={l("切换侧边栏", "Toggle sidebar")} className="text-slate-400 hover:bg-white/5 hover:text-white" /><div className="h-5 w-px bg-white/8" /><span className="text-sm text-slate-400">{title}</span><div className="ml-auto flex items-center gap-2"><LocaleSwitch locale={locale} onChange={changeLocale} /><button onClick={() => setCommandOpen(true)} className="command-button"><Search /><span className="hidden sm:inline">{l("全局搜索", "Search anything")}</span><kbd className="hidden lg:inline">⌘ K</kbd></button><Button variant="ghost" size="icon-sm" aria-label={l("帮助", "Help")} className="hidden text-slate-500 hover:bg-white/5 hover:text-white sm:inline-flex"><CircleHelp /></Button><Button variant="ghost" size="icon-sm" aria-label={l("通知", "Notifications")} className="relative text-slate-500 hover:bg-white/5 hover:text-white"><Bell /><i className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300" /></Button></div></header>
      <main className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        {view === "dashboard" && <Dashboard onNavigate={navigate} locale={locale} />}
        {view === "catalog" && <CourseUniverse selectedCourse={selectedCourse} onSelectCourse={setSelectedCourse} onStartCourse={startCourse} locale={locale} />}
        {view === "path" && <KnowledgeMap onNavigate={navigate} activeCourse={activeCourse} locale={locale} />}
        {view === "learn" && <LearningRoom key={locale} locale={locale} />}
        {view === "practice" && <PracticeView key={locale} locale={locale} />}
        {view === "review" && <ReviewView locale={locale} />}
        {view === "library" && <LibraryView locale={locale} />}
        {view === "proof" && <ProofView locale={locale} />}
      </main>
    </SidebarInset>
    <Dialog open={commandOpen} onOpenChange={(open) => { setCommandOpen(open); if (!open) setCommandQuery(""); }}>
      <DialogContent className="top-[22%] border-white/10 bg-[#0c1422] p-0 text-white sm:max-w-xl">
        <DialogTitle className="sr-only">{l("搜索 OneLearn", "Search OneLearn")}</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/8 px-4"><Search className="size-4 text-slate-500" /><Input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder={l("搜索 1,000+ 课程、知识、资料或功能…", "Search 1,000+ courses, concepts, sources, or actions…")} className="h-14 border-0 bg-transparent px-0 text-white shadow-none focus-visible:ring-0" /></div>
        <div className="max-h-[420px] overflow-y-auto p-3">
          {commandQuery.trim() ? <>
            <p className="px-2 pb-2 text-xs uppercase tracking-widest text-slate-600">{l("课程宇宙", "COURSE UNIVERSE")} · {formatCatalogNumber(searchCatalog(commandQuery).length, locale)} {l("个结果", "results")}</p>
            {commandResults.map((course) => <button key={course.id} onClick={() => { setSelectedCourse(course); navigate("catalog"); setCommandOpen(false); setCommandQuery(""); }} className="command-result"><span><LibraryBig /></span><div><strong>{locale === "en" ? courseTitleEn(course.title) : course.title}</strong><small>{academyName(course.academyId, course.academy, locale)} · {groupName(course.group, locale)}</small></div><ChevronRight /></button>)}
            {!commandResults.length && <div className="px-2 py-8 text-center text-sm text-slate-500">{l("没有匹配课程，试试更短的关键词。", "No matching courses. Try a shorter keyword.")}</div>}
          </> : <>
            <p className="px-2 pb-2 text-xs uppercase tracking-widest text-slate-600">{l("快捷操作", "QUICK ACTIONS")}</p>
            {navItems.slice(1, 6).map((item) => { const label = pick(locale, item.zh, item.en); return <button key={item.id} onClick={() => { navigate(item.id); setCommandOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5"><item.icon className="size-4 text-slate-500" />{label}<ChevronRight className="ml-auto size-4 text-slate-700" /></button>; })}
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </SidebarProvider>;
}
