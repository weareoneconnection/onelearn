"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, BrainCircuit, Check, ChevronRight, CircleHelp,
  Cloud, CreditCard, Crown, Database, FileCheck2, FileText, FolderOpen, Gauge, GraduationCap, Languages, LayoutDashboard, LibraryBig,
  LoaderCircle, LockKeyhole, Map, Mic, MoreHorizontal, Orbit, Play, Plus, RefreshCw,
  Receipt, Search, Settings, ShieldCheck, Sparkles, Target, TimerReset, TriangleAlert, Trophy, Users,
  Upload, WandSparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
import type { GeneratedCourseBundle, GeneratedLesson } from "@/lib/onelearn/generated-course";
import { clerkEnabled, clerkMaybeSignedIn, clerkSessionToken, clerkSignOut, loadClerk, openClerkSignIn } from "@/lib/onelearn/clerk-browser";

type View = "dashboard" | "catalog" | "path" | "learn" | "practice" | "review" | "library" | "proof" | "billing" | "operations";
type WebModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
type GenerationState = { status: "idle" | "loading" | "error"; message?: string };
type LearnerIdentity = { displayName: string; email: string; mode: "chatgpt" | "clerk" | "device"; admin: boolean };
type LearnerStats = { courseVersions: number; learningEvents: number; sources: number; averageQuality: number; dueReviews: number };
type MasteryRecord = {
  courseVersionId: string; nodeKey: string; nodeTitle: string;
  score: number; retention: number; status: "unseen" | "learning" | "fragile" | "stable" | "mastered"; mastered: boolean; due: boolean;
  attempts: number; unassistedPasses: number; reviewPasses: number; lastEvidenceAt: number | null; nextReviewAt: number | null;
};
type MasteryOverview = {
  records: MasteryRecord[];
  due: MasteryRecord[];
  summary: { pathMastery: number; mastered: number; tracked: number; due: number; averageRetention: number; unassistedPasses: number; delayedReviews: number };
  weekly: Array<{ day: string; count: number }>;
  recent: Array<{ eventType: string; createdAt: number; lessonTitle: string | null; correct: boolean | null }>;
};
type SourceItem = { id: string; name: string; sourceKind: "file" | "text" | "web"; mimeType: string; sizeBytes: number; sourceUrl: string | null; status: "processing" | "ready" | "failed"; createdAt: number };
type OperationsSnapshot = {
  metrics: { users: number; courses: number; sources: number; aiRuns7d: number; failedRuns7d: number; tokens7d: number; activeLearners7d: number; averageQuality: number; paidSubscribers: number; mrrCny: number; revenueCny: number };
  qualityQueue: Array<{ id: string; title: string; version: number; locale: string; qualityScore: number | null; qualityStatus: string; createdAt: number; email: string }>;
};
type BillingPlan = { id: "free" | "personal" | "pro" | "team"; nameZh: string; nameEn: string; monthlyPriceCny: number | null; annualPriceCny: number | null; aiCredits: number; sourceCount: number; sourceBytes: number; courseEquivalent: number; tutorEquivalent: number };
type BillingPayload = {
  identity: { displayName: string; email: string; mode: "chatgpt" | "clerk" | "device" };
  plans: BillingPlan[];
  billing: {
    configured: boolean;
    plan: BillingPlan;
    subscription: { planId: string; billingInterval: "month" | "year"; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: number | null; canManage: boolean } | null;
    usage: { month: string; aiCreditsUsed: number; aiCreditsRemaining: number; sources: number; sourceBytes: number };
    invoices: Array<{ id: string; amountPaid: number; currency: string; status: string; hostedInvoiceUrl: string | null; paidAt: number | null; createdAt: number }>;
  };
};

const generatedCourseKey = (courseId: string, locale: Locale) => `onelearn-generated-course:${courseId}:${locale}`;
const DEVICE_ID_KEY = "onelearn-device-id";

function deviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

async function oneLearnFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-onelearn-device-id", deviceId());
  // Only wait for Clerk when a session may exist; signed-out visitors load immediately.
  const token = clerkMaybeSignedIn() ? await clerkSessionToken().catch(() => null) : null;
  if (clerkEnabled && !token) void loadClerk();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function signIn(returnTo: string) {
  if (clerkEnabled) void openClerkSignIn(new URL(returnTo, window.location.origin).href);
  else window.top?.location.assign(`/signin-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`);
}

const navItems = [
  { id: "dashboard" as View, zh: "今日学习", en: "Today", icon: LayoutDashboard },
  { id: "catalog" as View, zh: "课程宇宙", en: "Course universe", icon: LibraryBig },
  { id: "path" as View, zh: "知识地图", en: "Knowledge map", icon: Map },
  { id: "learn" as View, zh: "学习空间", en: "Learning room", icon: GraduationCap },
  { id: "practice" as View, zh: "练习", en: "Practice", icon: Target },
  { id: "review" as View, zh: "复习", en: "Review", icon: TimerReset },
  { id: "library" as View, zh: "资料库", en: "Sources", icon: FolderOpen },
  { id: "proof" as View, zh: "掌握证明", en: "Mastery proof", icon: ShieldCheck },
  { id: "billing" as View, zh: "套餐与账单", en: "Plans & billing", icon: CreditCard },
  { id: "operations" as View, zh: "运营中心", en: "Operations", icon: BarChart3 },
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

function Dashboard({ onNavigate, locale, identity, stats, storage, mastery }: { onNavigate: (view: View) => void; locale: Locale; identity: LearnerIdentity | null; stats: LearnerStats | null; storage: "durable" | "ephemeral"; mastery: MasteryOverview | null }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const pathMastery = mastery?.summary.pathMastery ?? 0;
  const dueItems = mastery?.due.slice(0, 3) ?? [];
  const focus = mastery?.records.filter((record) => !record.mastered).sort((a, b) => a.score - b.score)[0] ?? null;
  const weekly = mastery?.weekly ?? [];
  const maxWeekly = Math.max(1, ...weekly.map((day) => day.count));
  const weekTotal = weekly.reduce((sum, day) => sum + day.count, 0);
  const recent = mastery?.recent ?? [];
  const eventLabel = (type: string) => type === "review_completed" ? l("复习", "Review") : type === "tutor_turn" ? l("导师", "Tutor") : l("练习", "Practice");
  const formatTime = (seconds: number) => new Date(seconds * 1000).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const missionSteps: Array<[string, View]> = [[l("学习讲解并回答导师", "Study and answer the tutor"), "learn"], [l("独立完成练习", "Pass practice unassisted"), "practice"], [l("隔天复习验证", "Verify with a delayed review"), "review"]];
  const missionStep = !focus ? 0 : focus.unassistedPasses === 0 ? 1 : 2;
  return <div className="space-y-7 animate-in fade-in duration-500">
    <section className="dashboard-hero">
      <div className="relative z-10 max-w-2xl"><div className="eyebrow"><Sparkles className="size-3.5" />{storage === "durable" ? l("跨设备学习档案已同步", "CROSS-DEVICE PROFILE SYNCED") : l("设备模式 · 登录后跨设备同步", "DEVICE MODE · SIGN IN TO SYNC")}</div><h1>{l(`你好，${identity?.displayName ?? "学习者"}。`, `Hello, ${identity?.displayName ?? "learner"}.`)}</h1><p>{l("课程、资料、练习和 AI 导师证据现在进入同一份学习档案。", "Courses, sources, practice, and AI tutor evidence now flow into one learning profile.")}</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => onNavigate("learn")} className="primary-pill">{l("继续学习", "Continue learning")} <ArrowRight /></Button><Button onClick={() => onNavigate("path")} variant="outline" className="secondary-pill">{l("查看知识地图", "View knowledge map")}</Button></div></div>
      <div className="mastery-orbit" aria-label={l(`当前路径掌握度 ${pathMastery}%`, `Current path mastery ${pathMastery} percent`)}><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-core"><strong>{pathMastery}%</strong><span>{l("路径掌握度", "PATH MASTERY")}</span></div><i className="orbit-node node-a" /><i className="orbit-node node-b" /><i className="orbit-node node-c" /></div>
    </section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label={l("课程版本", "Course versions")} value={String(stats?.courseVersions ?? 0)} detail={l("跨设备保存", "saved across devices")} icon={BrainCircuit} /><MetricCard label={l("学习事件", "Learning events")} value={String(stats?.learningEvents ?? 0)} detail={l("课程、练习与导师", "courses, practice, and tutor")} icon={Activity} /><MetricCard label={l("平均质量", "Average quality")} value={`${Math.round(stats?.averageQuality ?? 0)}%`} detail={l("AI 独立评测", "independent AI review")} icon={FileCheck2} /><MetricCard label={l("可信资料", "Trusted sources")} value={String(stats?.sources ?? 0)} detail={l("已进入检索知识库", "indexed for retrieval")} icon={Database} /></section>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="section-kicker">{l("今日任务", "TODAY'S MISSION")}</div><h2 className="mt-2 text-xl font-medium tracking-tight text-white">{focus ? focus.nodeTitle : l("开始第一节课", "Start your first lesson")}</h2><p className="mt-1 text-sm text-slate-400">{focus ? l(`当前掌握度 ${focus.score}% · 已独立答对 ${focus.unassistedPasses} 次`, `Mastery ${focus.score}% · ${focus.unassistedPasses} unassisted passes`) : l("生成课程并开始练习后，这里会显示你最需要加强的节点。", "Generate a course and practice; your weakest node will appear here.")}</p></div></div><div className="mt-7 grid gap-3 sm:grid-cols-3">{missionSteps.map(([item, target], i) => <button key={item} onClick={() => onNavigate(target)} className={cn("mission-step text-left", i === missionStep && "is-current")}><div className="flex items-center gap-2"><span>{i + 1}</span><p>{item}</p></div></button>)}</div><div className="mt-6 flex items-center gap-3"><Progress value={focus?.score ?? 0} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">{focus?.score ?? 0}%</span></div></article>
      <article className="surface-card flex min-h-[260px] flex-col p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("复习队列", "REVIEW QUEUE")}</div><h2 className="mt-2 text-lg font-medium text-white">{l(`${mastery?.summary.due ?? 0} 个节点待复习`, `${mastery?.summary.due ?? 0} nodes due`)}</h2></div><TimerReset className="size-5 text-amber-300" /></div><div className="mt-5 space-y-2">{dueItems.length ? dueItems.map((item) => <button key={`${item.courseVersionId}:${item.nodeKey}`} onClick={() => onNavigate("review")} className="review-row"><span className={cn("review-priority", item.retention < 60 ? "high" : "normal")} /><span className="flex-1 text-left text-sm text-slate-200">{item.nodeTitle}</span><span className="text-xs text-slate-500">{l(`保持率 ${item.retention}%`, `${item.retention}% retained`)}</span><ChevronRight className="size-4 text-slate-600" /></button>) : <p className="text-sm text-slate-500">{l("暂时没有到期的复习。", "Nothing is due for review yet.")}</p>}</div><Button onClick={() => onNavigate("review")} variant="ghost" className="link-button mt-auto">{l("打开复习队列", "Open review queue")} <ArrowRight /></Button></article>
    </section>
    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("学习证据", "LEARNING EVIDENCE")}</div><h2 className="mt-2 text-lg font-medium text-white">{l("最近 7 天", "Last 7 days")}</h2></div><span className="text-sm text-emerald-300">{weekTotal}</span></div><div className="velocity-chart" aria-label={l("最近 7 天学习证据数量", "Learning evidence over the last 7 days")}>{weekly.map((day) => <div key={day.day} className="chart-column"><i style={{ height: `${Math.max(4, Math.round((day.count / maxWeekly) * 100))}%` }} /><span>{new Date(`${day.day}T00:00:00Z`).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { weekday: "narrow", timeZone: "UTC" })}</span></div>)}</div></article>
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">{l("学习轨迹", "LEARNING TRACE")}</div><h2 className="mt-2 text-lg font-medium text-white">{l("最近的能力证据", "Recent evidence")}</h2></div><MoreHorizontal className="size-4 text-slate-600" /></div><div className="mt-5 divide-y divide-white/6">{recent.length ? recent.slice(0, 5).map((item, i) => <div key={`${item.createdAt}-${i}`} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 py-3.5"><span className="text-xs text-slate-600">{formatTime(item.createdAt)}</span><div><p className="text-sm text-slate-200">{item.lessonTitle ?? l("学习节点", "Learning node")}</p><p className="text-xs text-slate-500">{eventLabel(item.eventType)}</p></div><span className="text-xs text-cyan-300">{item.correct === null ? l("已记录", "Recorded") : item.correct ? l("答对", "Correct") : l("答错", "Missed")}</span></div>) : <p className="py-4 text-sm text-slate-500">{l("完成练习或与导师对话后，证据会出现在这里。", "Evidence appears here after practice or tutor sessions.")}</p>}</div></article>
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

function CourseUniverse({ selectedCourse, onSelectCourse, onStartCourse, locale, generationState }: {
  selectedCourse: CatalogEntry | null;
  onSelectCourse: (course: CatalogEntry | null) => void;
  onStartCourse: (course: CatalogEntry, goal?: string) => void;
  locale: Locale;
  generationState: GenerationState;
}) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [query, setQuery] = useState("");
  const [academyId, setAcademyId] = useState("all");
  const [group, setGroup] = useState("all");
  const [visibleCount, setVisibleCount] = useState(72);
  const [dynamicMode, setDynamicMode] = useState<(typeof dynamicCourseModes)[number] | null>(null);
  const [dynamicPrompt, setDynamicPrompt] = useState("");
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
    const requestedGoal = dynamicPrompt.trim() || (locale === "en" ? english.example : dynamicMode.example);
    onStartCourse({
      id: "dynamic-" + dynamicMode.id,
      title: requestedGoal,
      academyId: "dynamic",
      academy: "动态课程引擎",
      group: dynamicMode.title,
      kind: "standard",
      level: "专业",
      description: dynamicMode.description,
      searchable: (dynamicMode.title + " " + dynamicMode.description + " " + english.title + " " + english.description).toLocaleLowerCase("en-US"),
    }, requestedGoal);
    setDynamicMode(null);
    setDynamicPrompt("");
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

    <Dialog open={Boolean(selectedCourse)} onOpenChange={(open) => { if (!open && generationState.status !== "loading") onSelectCourse(null); }}><DialogContent className="course-dialog border-white/10 bg-[#0c1422] text-white sm:max-w-2xl">{selectedCourse && <><DialogHeader><div className="flex items-center gap-2"><span className="course-level">{levelName(selectedCourse.level, locale)}</span><span className="course-kind">{courseKindLabel(selectedCourse, locale)}</span></div><DialogTitle className="pt-3 text-2xl">{displayCourseTitle(selectedCourse)}</DialogTitle><DialogDescription className="text-slate-400">{displayAcademy(selectedCourse)} · {groupName(selectedCourse.group, locale)}</DialogDescription></DialogHeader><p className="course-description">{l(selectedCourse.description, "Build a complete mastery path for “" + courseTitleEn(selectedCourse.title) + "”, from entry diagnostic and knowledge map to guided learning, practice, project verification, and long-term review.")}</p><div className="path-preview">{(locale === "zh" ? ["OpenAI 生成", "知识地图", "AI 精讲", "自适应练习", "真实项目", "掌握证明"] : ["OpenAI generation", "Knowledge map", "AI instruction", "Adaptive practice", "Real project", "Mastery proof"]).map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></div>)}</div><p className="ai-generation-note"><Sparkles />{l("点击后，OpenAI 将按需生成、独立评测并保存课程；登录环境可跨设备同步。", "OpenAI will generate, independently evaluate, and save the course on demand; signed-in environments sync across devices.")}</p><DialogFooter><Button disabled={generationState.status === "loading"} variant="ghost" onClick={() => onSelectCourse(null)} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("稍后再看", "Maybe later")}</Button><Button disabled={generationState.status === "loading"} onClick={() => onStartCourse(selectedCourse)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{generationState.status === "loading" ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{generationState.status === "loading" ? l("正在生成…", "Generating…") : l("用 OpenAI 生成课程", "Generate with OpenAI")}</Button></DialogFooter></>}</DialogContent></Dialog>

    <Dialog open={Boolean(dynamicMode)} onOpenChange={(open) => { if (!open && generationState.status !== "loading") { setDynamicMode(null); setDynamicPrompt(""); } }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl">{dynamicMode && dynamicText && <><DialogHeader><div className="section-kicker">{dynamicMode.eyebrow}</div><DialogTitle className="pt-2 text-2xl">{dynamicText.title}</DialogTitle><DialogDescription className="leading-6 text-slate-400">{dynamicText.description}</DialogDescription></DialogHeader><label className="dynamic-prompt-label" htmlFor="dynamic-course-prompt">{l("告诉 OpenAI 你的具体目标或资料主题", "Tell OpenAI your exact goal or source topic")}</label><Input id="dynamic-course-prompt" value={dynamicPrompt} onChange={(event) => setDynamicPrompt(event.target.value)} placeholder={dynamicText.example} className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600" /><div className="dynamic-outputs">{dynamicText.outputs.map((output) => <span key={output}><Check />{output}</span>)}</div><DialogFooter><Button disabled={generationState.status === "loading"} variant="ghost" onClick={() => { setDynamicMode(null); setDynamicPrompt(""); }} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("取消", "Cancel")}</Button><Button disabled={generationState.status === "loading"} onClick={beginDynamicCourse} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{generationState.status === "loading" ? <LoaderCircle className="animate-spin" /> : <WandSparkles />}{generationState.status === "loading" ? l("OpenAI 生成中…", "OpenAI is generating…") : l("开始生成路径", "Generate path")}</Button></DialogFooter></>}</DialogContent></Dialog>
  </div>;
}

function KnowledgeMap({ onNavigate, activeCourse, bundle, locale, onRegenerate, mastery }: { onNavigate: (view: View) => void; activeCourse: CatalogEntry | null; bundle: GeneratedCourseBundle | null; locale: Locale; onRegenerate: () => void; mastery: MasteryOverview | null }) {
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

function fallbackLesson(locale: Locale): GeneratedLesson {
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

function LearningRoom({ locale, bundle }: { locale: Locale; bundle: GeneratedCourseBundle | null }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const lesson = bundle?.curriculum.firstLesson ?? fallbackLesson(locale);
  const [messages, setMessages] = useState<Array<{ from: "tutor" | "you"; text: string }>>([{ from: "tutor", text: lesson.checkpointQuestion }]);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  useEffect(() => {
    if (!bundle?.generation.courseVersionId) return;
    void oneLearnFetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, courseVersionId: bundle.generation.courseVersionId, eventType: "lesson_started", payload: { lessonId: lesson.id, title: lesson.title } }),
    });
  }, [bundle?.generation.courseVersionId, lesson.id, lesson.title, locale]);
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
          mastery: step === 1 ? 0 : 25,
          locale,
          courseVersionId: bundle?.generation.courseVersionId ?? null,
          lessonId: bundle ? lesson.id : undefined,
          history,
        }),
      });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || l("导师暂时不可用", "The tutor is temporarily unavailable"));
      setMessages((items) => [...items, { from: "tutor", text: payload.reply! }]);
      setStep((current) => current + 1);
    } catch (error) {
      setMessages((items) => [...items, { from: "tutor", text: error instanceof Error ? error.message : l("导师暂时不可用", "The tutor is temporarily unavailable") }]);
    } finally {
      setIsThinking(false);
    }
  };
  return <div className="learning-layout animate-in fade-in duration-500"><section className="lesson-surface"><div className="flex items-center justify-between border-b border-white/7 px-5 py-4 sm:px-7"><div><div className="section-kicker">{lesson.id.toUpperCase()} · {lesson.durationMinutes} {l("分钟", "MIN")}</div><h1 className="mt-1 text-lg font-medium text-white">{lesson.title}</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">{bundle ? l("OpenAI 生成课程", "OpenAI-generated course") : l("演示课程", "Demo course")}</span><span className="status-dot" /></div></div><div className="lesson-body generated-lesson-body"><div className="section-kicker">{l("学习目标", "LEARNING OBJECTIVE")}</div><h2>{lesson.objective}</h2>{lesson.sections.map((section) => <section key={section.heading} className="lesson-section"><h3>{section.heading}</h3><p>{section.body}</p></section>)}<div className="lesson-key-points"><span>{l("关键要点", "KEY POINTS")}</span>{lesson.keyPoints.map((point) => <p key={point}><Check />{point}</p>)}</div><div className="worked-example"><span>{l("示例", "WORKED EXAMPLE")}</span><h3>{lesson.workedExample.scenario}</h3><ol>{lesson.workedExample.steps.map((item, index) => <li key={item}><i>{index + 1}</i>{item}</li>)}</ol><p>{lesson.workedExample.takeaway}</p></div></div><div className="border-t border-white/7 p-4 sm:px-7"><div className="flex items-center gap-3"><Progress value={Math.min(90, 35 + step * 18)} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">{Math.min(90, 35 + step * 18)}%</span></div></div></section><aside className="tutor-panel"><div className="flex items-center gap-3 border-b border-white/7 p-5"><div className="tutor-avatar"><Orbit /></div><div><h2 className="text-sm font-medium text-white">Sora · {l("OpenAI 导师", "OpenAI Tutor")}</h2><p className="text-xs text-emerald-300">{isThinking ? l("正在思考…", "Thinking…") : l("基于当前课程追问", "Grounded in this lesson")}</p></div></div><div className="tutor-thread scrollbar-thin">{messages.map((message, i) => <div key={i} className={cn("message", message.from === "you" && "message-you")}><span>{message.from === "tutor" ? "SORA" : l("你", "YOU")}</span><p>{message.text}</p></div>)}{isThinking && <div className="message"><span>SORA</span><p className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />{l("正在分析你的回答", "Analyzing your answer")}</p></div>}{step > 1 && <div className="mastery-signal"><Check className="size-4" /><span>{l("理解证据已记录", "Understanding evidence captured")}</span></div>}</div><div className="tutor-input-wrap"><label htmlFor="tutor-answer" className="sr-only">{l("回答导师", "Answer your tutor")}</label><textarea id="tutor-answer" disabled={isThinking} value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder={l("用你自己的话解释…", "Explain in your own words…")} /><div className="flex items-center justify-between"><Button variant="ghost" size="icon-sm" aria-label={l("语音输入", "Voice input")} className="text-slate-500"><Mic /></Button><Button disabled={isThinking || !answer.trim()} onClick={() => void submit()} size="sm" className="primary-pill h-8">{isThinking ? <LoaderCircle className="animate-spin" /> : l("发送", "Send")} {!isThinking && <ArrowRight />}</Button></div></div></aside></div>;
}

/** One multiple-choice question from the active lesson. Answers on a saved course are graded by the server. */
function QuestionCard({ locale, bundle, mode, onAnswered }: { locale: Locale; bundle: GeneratedCourseBundle | null; mode: "practice" | "review"; onAnswered: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const lesson = bundle?.curriculum.firstLesson ?? fallbackLesson(locale);
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
      onAnswered();
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : l("答案未能记录", "The answer could not be recorded"));
    } finally { setBusy(false); }
  };
  const next = () => { setIndex((current) => current + 1); setSelected(null); setResult(null); setError(""); };
  return <article className="surface-card mt-8 overflow-hidden"><div className="border-b border-white/7 p-6 sm:p-9"><span className="question-type">{mode === "review" ? l("间隔复习", "SPACED REVIEW") : l("单项最佳答案", "SINGLE BEST ANSWER")} · {(index % questions.length) + 1}/{questions.length}</span><h2 className="mt-5 max-w-2xl text-xl font-medium leading-8 text-white">{question.question}</h2></div><div className="space-y-3 p-6 sm:p-9">{question.options.map((option, i) => <button key={option} onClick={() => !result && setSelected(i)} className={cn("answer-option", selected === i && "is-selected", result && i === correctOption && "is-correct", result && selected === i && i !== correctOption && "is-wrong")}><span>{String.fromCharCode(65 + i)}</span><p>{option}</p>{result && i === correctOption && <Check />}</button>)}{result && <div className="feedback-box"><ShieldCheck /><div><strong>{result.correct ? l("回答正确", "Correct") : l("还不完全正确", "Not quite")}{typeof result.score === "number" && ` · ${l("掌握度", "Mastery")} ${result.score}%`}</strong><p>{result.explanation}</p></div></div>}{error && <p className="source-error"><TriangleAlert />{error}</p>}<div className="flex justify-end pt-3">{result ? <Button onClick={next} className="primary-pill">{l("下一题", "Next question")} <ArrowRight /></Button> : <Button disabled={selected === null || busy} onClick={() => void checkAnswer()} className="primary-pill">{busy && <LoaderCircle className="animate-spin" />}{l("检查答案", "Check answer")}</Button>}</div></div></article>;
}

function PracticeView({ locale, bundle, onAnswered }: { locale: Locale; bundle: GeneratedCourseBundle | null; onAnswered: () => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  return <div className="mx-auto max-w-4xl animate-in fade-in duration-500"><PageHeading kicker={bundle ? "OPENAI · ADAPTIVE PRACTICE" : l("自适应练习", "ADAPTIVE PRACTICE")} title={bundle?.curriculum.firstLesson.title ?? l("Schema 推理", "Schema reasoning")} detail={bundle ? l("答案由服务器评分，并更新掌握度与复习计划。", "Answers are graded on the server and update your mastery and review schedule.") : l("演示题目 · 生成课程后开始记录掌握度", "Demo question · generate a course to start tracking mastery")}><span className="time-chip">{bundle ? l("计入掌握度", "Counts toward mastery") : l("演示", "Demo")}</span></PageHeading><QuestionCard locale={locale} bundle={bundle} mode="practice" onAnswered={onAnswered} /></div>;
}

function ReviewView({ locale, bundle, mastery, onAnswered, onNavigate }: { locale: Locale; bundle: GeneratedCourseBundle | null; mastery: MasteryOverview | null; onAnswered: () => void; onNavigate: (view: View) => void }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [active, setActive] = useState<string | null>(null);
  const keyOf = (record: MasteryRecord) => `${record.courseVersionId}:${record.nodeKey}`;
  const canQuiz = (record: MasteryRecord) => bundle?.generation.courseVersionId === record.courseVersionId && bundle.curriculum.firstLesson.id === record.nodeKey;
  const due = mastery?.due ?? [];
  const upcoming = (mastery?.records ?? []).filter((record) => !record.due && record.nextReviewAt).sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0)).slice(0, 6);
  const firstQuizzable = due.find(canQuiz);
  const formatDate = (seconds: number | null) => seconds ? new Date(seconds * 1000).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const card = (record: MasteryRecord, isDue: boolean) => <article key={keyOf(record)} className="surface-card p-6"><div className="flex items-center justify-between"><span className={cn("status-chip", isDue && record.retention < 60 && "is-amber")}>{isDue ? (record.retention < 60 ? l("优先复习", "Priority review") : l("已到期", "Due now")) : l(`${formatDate(record.nextReviewAt)} 到期`, `Due ${formatDate(record.nextReviewAt)}`)}</span><TimerReset className="size-5 text-slate-500" /></div><h2 className="mt-8 text-lg font-medium text-white">{record.nodeTitle}</h2><p className="mt-1 text-sm text-slate-500">{l("预测保持率", "Predicted retention")}</p><div className="mt-5 flex items-center gap-3"><Progress value={record.retention} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-sm text-slate-300">{record.retention}%</span></div>{isDue && <Button variant="ghost" className="link-button mt-6" onClick={() => canQuiz(record) ? setActive(keyOf(record)) : onNavigate("learn")}>{canQuiz(record) ? l("现在复习", "Review now") : l("在学习空间复习", "Review in the learning room")} <ArrowRight /></Button>}</article>;
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("间隔记忆", "SPACED RETENTION")} title={l("你的复习队列", "Your review queue")} detail={due.length ? l(`${due.length} 个节点已到期。隔天仍能独立答对，才算真正掌握。`, `${due.length} nodes are due. Answering correctly after a delay is what proves mastery.`) : l("暂时没有到期的节点。练习后，系统会按遗忘曲线安排复习。", "Nothing is due. After practice, reviews are scheduled along your forgetting curve.")}>{firstQuizzable && <Button className="primary-pill" onClick={() => setActive(keyOf(firstQuizzable))}><Play /> {l("开始复习", "Start review")}</Button>}</PageHeading>{active && <div><QuestionCard key={active} locale={locale} bundle={bundle} mode="review" onAnswered={onAnswered} /><div className="mt-3 flex justify-end"><Button variant="ghost" className="link-button" onClick={() => setActive(null)}>{l("结束本次复习", "Finish this review")}</Button></div></div>}{due.length ? <div className="grid gap-4 lg:grid-cols-3">{due.map((record) => card(record, true))}</div> : <article className="ai-empty-state"><TimerReset /><h2>{l("复习队列是空的", "Your review queue is empty")}</h2><p>{l("完成练习后，节点会在合适的时间回到这里。", "After practice, nodes return here at the right time.")}</p></article>}{upcoming.length > 0 && <section><div className="section-kicker mb-3">{l("即将到期", "UPCOMING")}</div><div className="grid gap-4 lg:grid-cols-3">{upcoming.map((record) => card(record, false))}</div></section>}</div>;
}

function LibraryView({ locale }: { locale: Locale }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [storage, setStorage] = useState<"durable" | "ephemeral">("ephemeral");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void oneLearnFetch(`/api/sources?locale=${locale}`)
      .then(async (response) => {
        const payload = await response.json() as { sources?: SourceItem[]; storage?: "durable" | "ephemeral" };
        if (active && response.ok) {
          setSources(payload.sources ?? []);
          setStorage(payload.storage ?? "ephemeral");
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [locale]);
  const uploadSource = async () => {
    if (!file && !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      let body: BodyInit;
      let headers: HeadersInit | undefined;
      if (file) {
        const form = new FormData();
        form.set("file", file);
        if (sourceUrl.trim()) form.set("sourceUrl", sourceUrl.trim());
        body = form;
      } else {
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify({ name: sourceUrl.trim() ? new URL(sourceUrl.trim()).hostname + ".txt" : "learning-source.txt", text: text.trim(), sourceUrl: sourceUrl.trim() || undefined });
      }
      const response = await oneLearnFetch(`/api/sources?locale=${locale}`, { method: "POST", headers, body });
      const payload = await response.json() as { source?: SourceItem; storage?: "durable" | "ephemeral"; error?: string };
      if (!response.ok || !payload.source) throw new Error(payload.error || l("资料索引失败", "Source indexing failed"));
      setSources((items) => [payload.source!, ...items]);
      setStorage(payload.storage ?? "ephemeral");
      setFile(null); setText(""); setSourceUrl(""); setOpen(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : l("资料索引失败", "Source indexing failed"));
    } finally { setBusy(false); }
  };
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("资料库", "SOURCE LIBRARY")} title={l("用你的资料学习", "Learn from your material")} detail={l("PDF、文档与网页正文进入专属向量知识库，课程和导师会检索引用。", "PDFs, documents, and web text enter your private vector knowledge base for grounded courses and tutoring.")}><Button onClick={() => setOpen(true)} className="primary-pill"><Upload /> {l("添加资料", "Add source")}</Button></PageHeading><div className="source-drop"><Database className="size-7" /><h2>{l("检索增强学习已经启用", "Retrieval-grounded learning is enabled")}</h2><p>{storage === "durable" ? l("资料元数据和原文件已安全保存，向量索引用于课程生成与导师问答。", "Metadata and originals are stored durably; the vector index grounds course generation and tutoring.") : l("当前部署使用临时元数据；OpenAI 向量索引仍可用。", "This deployment uses temporary metadata; the OpenAI vector index remains available.")}</p><div className="mt-4 flex flex-wrap justify-center gap-2"><span className="status-chip">PDF</span><span className="status-chip">DOCX</span><span className="status-chip">PPTX</span><span className="status-chip">Markdown</span><span className="status-chip">HTML</span></div></div>{sources.length ? <div className="grid gap-3">{sources.map((source) => <article key={source.id} className="source-row"><span className="source-icon"><FileText /></span><div className="min-w-0 flex-1"><h2>{source.name}</h2><p>{source.mimeType || source.sourceKind} · {Math.max(1, Math.round(source.sizeBytes / 1024))} KB</p></div><span className={cn("source-status", source.status === "ready" && "is-ready", source.status === "failed" && "is-failed")}>{source.status === "ready" ? l("可检索", "Ready") : source.status === "failed" ? l("失败", "Failed") : l("索引中", "Indexing")}</span></article>)}</div> : <article className="ai-empty-state"><FolderOpen /><h2>{l("还没有学习资料", "No learning sources yet")}</h2><p>{l("上传第一份资料后，新课程会优先依据检索到的内容生成。", "After your first upload, new courses will prioritize retrieved source evidence.")}</p></article>}<Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-2xl"><DialogHeader><DialogTitle>{l("添加可信学习资料", "Add a trusted learning source")}</DialogTitle><DialogDescription className="text-slate-400">{l("上传受支持文件，或粘贴网页正文并保留来源网址。单个资料最大 15 MB。", "Upload a supported file, or paste web text with its source URL. Maximum 15 MB per source.")}</DialogDescription></DialogHeader><div className="source-form"><label><span>{l("文件", "File")}</span><Input type="file" accept=".pdf,.doc,.docx,.pptx,.txt,.md,.html,.json,.js,.ts,.py" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><div className="source-divider"><span>{l("或者粘贴正文", "OR PASTE TEXT")}</span></div><label><span>{l("来源网址（可选）", "Source URL (optional)")}</span><Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/article" /></label><label><span>{l("资料正文", "Source text")}</span><Textarea value={text} onChange={(event) => setText(event.target.value)} rows={8} placeholder={l("粘贴文章、标准、笔记或网页正文…", "Paste an article, standard, notes, or webpage text…")} /></label>{error && <p className="source-error"><TriangleAlert />{error}</p>}</div><DialogFooter><Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>{l("取消", "Cancel")}</Button><Button className="primary-pill" disabled={busy || (!file && !text.trim())} onClick={() => void uploadSource()}>{busy ? <LoaderCircle className="animate-spin" /> : <Upload />}{busy ? l("正在索引…", "Indexing…") : l("上传并索引", "Upload and index")}</Button></DialogFooter></DialogContent></Dialog></div>;
}

function BillingView({ locale }: { locale: Locale }) {
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
  const creditsPercent = currentPlan ? Math.min(100, Math.round((data!.billing.usage.aiCreditsUsed / currentPlan.aiCredits) * 100)) : 0;
  const planFeatures = (plan: BillingPlan) => [
    l(`每月 ${plan.aiCredits.toLocaleString()} AI 点数`, `${plan.aiCredits.toLocaleString()} AI credits / month`),
    l(`约 ${plan.courseEquivalent} 门新课程`, `About ${plan.courseEquivalent} new courses`),
    l(`约 ${plan.tutorEquivalent.toLocaleString()} 次导师问答`, `About ${plan.tutorEquivalent.toLocaleString()} tutor turns`),
    l(`${plan.sourceCount} 份可信资料`, `${plan.sourceCount} trusted sources`),
  ];
  return <div className="billing-page animate-in fade-in duration-500">
    <section className="billing-hero">
      <div><div className="eyebrow"><Crown className="size-3.5" /> ONELEARN MEMBERSHIP</div><h1>{l("选择与你目标匹配的学习算力。", "Choose the learning power that fits your goal.")}</h1><p>{l("按月获得 AI 点数，用于课程生成、课节扩展、导师问答和资料索引；不会按 Token 给你出账。", "Receive monthly AI credits for course generation, lesson expansion, tutoring, and source indexing—never a surprise token bill.")}</p></div>
      {data && <article className="billing-usage-card"><div className="flex items-center justify-between"><span>{l("当前套餐", "CURRENT PLAN")}</span><strong>{locale === "zh" ? data.billing.plan.nameZh : data.billing.plan.nameEn}</strong></div><div className="billing-credit-number"><b>{data.billing.usage.aiCreditsRemaining.toLocaleString()}</b><span>/ {data.billing.plan.aiCredits.toLocaleString()} {l("点剩余", "left")}</span></div><Progress value={creditsPercent} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><div className="billing-usage-meta"><span><Gauge />{l(`本月已用 ${data.billing.usage.aiCreditsUsed}`, `${data.billing.usage.aiCreditsUsed} used this month`)}</span><span><FileText />{l(`${data.billing.usage.sources}/${data.billing.plan.sourceCount} 份资料`, `${data.billing.usage.sources}/${data.billing.plan.sourceCount} sources`)}</span></div>{data.billing.subscription?.canManage && <Button disabled={busy === "manage"} onClick={() => void manage()} variant="ghost" className="billing-manage">{busy === "manage" ? <LoaderCircle className="animate-spin" /> : <Settings />}{l("管理订阅与付款方式", "Manage subscription & payment")}</Button>}</article>}
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
          {isCurrent ? <Button disabled className="pricing-button is-current"><Check />{l("当前套餐", "Current plan")}</Button> : plan.id === "free" ? <Button disabled variant="outline" className="pricing-button">{l("永久免费", "Free forever")}</Button> : <Button disabled={Boolean(busy)} onClick={() => void checkout(plan.id as "personal" | "pro")} className="pricing-button">{busy === plan.id ? <LoaderCircle className="animate-spin" /> : <CreditCard />}{l("安全开通", "Continue to secure checkout")}</Button>}
        </article>;
      })}
    </section>

    <section className="team-plan"><div className="team-plan-icon"><Users /></div><div><div className="section-kicker">TEAM & ENTERPRISE</div><h2>{l("团队版 ¥79/人/月，企业版 ¥99,800/年起", "Team at ¥79/user/month; Enterprise from ¥99,800/year")}</h2><p>{l("团队知识库、成员管理、学习分析、权限与审计。10席起，企业方案支持 SSO、SLA 和定制集成。", "Shared knowledge bases, member administration, learning analytics, permissions, and audit logs. Team starts at 10 seats; Enterprise adds SSO, SLA, and custom integrations.")}</p></div><Button onClick={() => setNotice(l("团队与企业方案由管理员开通；商务联系入口将在企业资料确认后启用。", "Team and Enterprise plans are provisioned by an administrator; the sales contact opens after company details are confirmed."))} variant="outline" className="secondary-pill">{l("咨询企业方案", "Talk to sales")}</Button></section>

    {data && <section className="billing-ledger"><div className="ops-table-header"><div><div className="section-kicker">BILLING LEDGER</div><h2>{l("账单记录", "Billing history")}</h2></div><Receipt /></div>{data.billing.invoices.length ? <div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>{l("日期", "Date")}</th><th>{l("金额", "Amount")}</th><th>{l("状态", "Status")}</th><th>{l("发票", "Invoice")}</th></tr></thead><tbody>{data.billing.invoices.map((invoice) => <tr key={invoice.id}><td>{new Date((invoice.paidAt ?? invoice.createdAt) * 1000).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}</td><td>{invoice.currency.toUpperCase()} {(invoice.amountPaid / 100).toFixed(2)}</td><td><span className={cn("source-status", invoice.status === "paid" && "is-ready")}>{invoice.status}</span></td><td>{invoice.hostedInvoiceUrl ? <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noreferrer">{l("查看", "Open")}</a> : "—"}</td></tr>)}</tbody></table></div> : <div className="ops-empty">{l("还没有账单。首次成功付款后会自动出现在这里。", "No invoices yet. Your first successful payment will appear here automatically.")}</div>}</section>}
    <p className="billing-fineprint">{l("订阅由安全托管收银台处理。AI 点数按自然月重置，失败的支付不会提升套餐权益。开通即表示你同意", "Subscriptions are handled by a secure hosted checkout. AI credits reset each calendar month, and failed payments never unlock plan entitlements. By subscribing you agree to the")} <a href="/terms" target="_blank">{l("《用户协议》", "Terms")}</a>{l("、", ", ")}<a href="/privacy" target="_blank">{l("《隐私政策》", "Privacy Policy")}</a>{l("与", " and ")}<a href="/refund" target="_blank">{l("《退款规则》", "Refund Policy")}</a>{l("。", ".")}</p>
  </div>;
}

function OperationsView({ locale }: { locale: Locale }) {
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
  ] : [];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("运营与治理", "OPERATIONS & GOVERNANCE")} title={l("OneLearn 运营中心", "OneLearn operations center")} detail={l("监控用户、课程质量、资料索引、模型用量与失败率。", "Monitor learners, course quality, source indexing, model usage, and failures.")}><Button disabled={loading} onClick={() => void load()} variant="outline" className="secondary-pill"><RefreshCw className={cn(loading && "animate-spin")} />{l("刷新", "Refresh")}</Button></PageHeading>{error ? <article className="ops-gate"><LockKeyhole /><h2>{l("运营后台受到保护", "Operations is protected")}</h2><p>{error}</p><small>{l("在部署环境中设置 ONELEARN_ADMIN_EMAILS 后重新打开。", "Set ONELEARN_ADMIN_EMAILS in the deployment environment, then reopen this view.")}</small></article> : loading ? <article className="ai-empty-state"><LoaderCircle className="animate-spin" /><h2>{l("正在读取运营数据", "Loading operations data")}</h2></article> : data && <><section className="ops-metrics">{metrics.map(([label, value, detail]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section><section className="surface-card overflow-hidden"><div className="ops-table-header"><div><div className="section-kicker">QUALITY REVIEW QUEUE</div><h2>{l("课程质量复核队列", "Course quality review queue")}</h2></div><span>{data.qualityQueue.length}</span></div>{data.qualityQueue.length ? <div className="overflow-x-auto"><table className="ops-table"><thead><tr><th>{l("课程", "Course")}</th><th>{l("版本", "Version")}</th><th>{l("语言", "Locale")}</th><th>{l("评分", "Score")}</th><th>{l("状态", "Status")}</th><th>{l("用户", "Learner")}</th></tr></thead><tbody>{data.qualityQueue.map((item) => <tr key={item.id}><td>{item.title}</td><td>V{item.version}</td><td>{item.locale.toUpperCase()}</td><td>{Math.round(item.qualityScore ?? 0)}</td><td><span className={cn("source-status", item.qualityStatus === "blocked" && "is-failed")}>{item.qualityStatus}</span></td><td>{item.email}</td></tr>)}</tbody></table></div> : <div className="ops-empty">{l("当前没有待复核课程。", "No courses currently need review.")}</div>}</section></>}</div>;
}

function ProofView({ locale, mastery }: { locale: Locale; mastery: MasteryOverview | null }) {
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
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker={l("掌握护照", "MASTERY PASSPORT")} title={l("以证据证明能力", "Capability, backed by evidence")} detail={l("只有同时具备应用证据、独立答对和隔天复测通过的节点，才会出现在这里。", "A node appears here only with application evidence, an unassisted pass, and a delayed review.")}><span className="time-chip">{l(`平均保持率 ${summary?.averageRetention ?? 0}%`, `Avg. retention ${summary?.averageRetention ?? 0}%`)}</span></PageHeading><article className="passport-card"><div className="passport-glow" /><div className="relative z-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="size-4" /> {mastered.length ? l("已验证能力", "VERIFIED CAPABILITY") : l("尚未验证", "NOT YET VERIFIED")}</div><h2 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white">{mastered[0]?.nodeTitle ?? l("你的第一项已验证能力", "Your first verified capability")}</h2><p className="mt-2 text-slate-400">{mastered.length ? l(`${mastered.length} 个节点通过掌握验证`, `${mastered.length} nodes passed mastery verification`) : l("完成练习，并在隔天复习中再次答对即可获得。", "Pass practice, then answer correctly again in a review the next day.")}</p></div><div className="passport-seal"><Orbit /></div></div><div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">{stats.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div></article>{mastered.length ? <div className="grid gap-4 md:grid-cols-2">{mastered.map((record) => <article key={`${record.courseVersionId}:${record.nodeKey}`} className="surface-card flex items-center gap-4 p-5"><span className="source-icon"><Trophy /></span><div className="flex-1"><h2 className="text-sm font-medium text-white">{record.nodeTitle}</h2><p className="mt-1 text-xs text-slate-500">{l(`掌握度 ${record.score}% · 独立答对 ${record.unassistedPasses} 次 · 延迟复测 ${record.reviewPasses} 次`, `Mastery ${record.score}% · ${record.unassistedPasses} unassisted · ${record.reviewPasses} delayed reviews`)}</p></div><ChevronRight className="size-4 text-slate-600" /></article>)}</div> : <article className="ai-empty-state"><Trophy /><h2>{l("还没有已验证的能力", "No verified capabilities yet")}</h2><p>{l("一次答对不算掌握：需要独立完成练习，并在至少 20 小时后的复习中再次答对。", "One correct answer is not mastery: pass practice on your own, then again in a review at least 20 hours later.")}</p></article>}</div>;
}

function PageHeading({ kicker, title, detail, children }: { kicker: string; title: string; detail: string; children: React.ReactNode }) {
  return <div className="page-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{detail}</p></div>{children}</div>;
}

function NewGoalDialog({ locale, onStartGoal, isGenerating }: { locale: Locale; onStartGoal: (goal: string) => void; isGenerating: boolean }) {
  const l = (zh: string, en: string) => pick(locale, zh, en);
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const goalKinds = locale === "zh"
    ? [[Target, "学习一个目标"], [BookOpen, "学习一份资料"], [Trophy, "准备一个结果"]]
    : [[Target, "Learn a goal"], [BookOpen, "Learn a source"], [Trophy, "Prepare for an outcome"]];
  const begin = () => {
    const value = goal.trim();
    if (!value) return;
    setOpen(false);
    onStartGoal(value);
    setGoal("");
  };
  return <Dialog open={open} onOpenChange={(next) => { if (!isGenerating) setOpen(next); }}><DialogTrigger asChild><Button className="w-full justify-start rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0"><Plus /><span className="group-data-[collapsible=icon]:hidden">{l("新建学习目标", "New learning goal")}</span></Button></DialogTrigger><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-xl">{l("你想掌握什么？", "What do you want to master?")}</DialogTitle><DialogDescription className="text-slate-400">{l("描述目标结果，OpenAI 会生成知识地图、首节课与练习。", "Describe the outcome. OpenAI will generate the knowledge map, first lesson, and practice.")}</DialogDescription></DialogHeader><Input value={goal} onChange={(event) => setGoal(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") begin(); }} placeholder={l("例如：构建并部署一个生产级 AI Agent", "e.g. Build and deploy a production AI agent")} className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600" /><div className="grid gap-2 sm:grid-cols-3">{goalKinds.map(([Icon, label], i) => { const GoalIcon = Icon as typeof Target; return <button key={label as string} className={cn("goal-kind", i === 0 && "is-active")}><GoalIcon /><span>{label as string}</span></button>; })}</div><DialogFooter><Button disabled={isGenerating} variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:bg-white/5 hover:text-white">{l("取消", "Cancel")}</Button><Button disabled={!goal.trim() || isGenerating} onClick={begin} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{isGenerating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{isGenerating ? l("生成中…", "Generating…") : l("用 OpenAI 生成", "Generate with OpenAI")}</Button></DialogFooter></DialogContent></Dialog>;
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
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourseBundle | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>({ status: "idle" });
  const [identity, setIdentity] = useState<LearnerIdentity | null>(null);
  const [learnerStats, setLearnerStats] = useState<LearnerStats | null>(null);
  const [mastery, setMastery] = useState<MasteryOverview | null>(null);
  const masteryRef = useRef<MasteryOverview | null>(null);
  const refreshMastery = useCallback(() => {
    void oneLearnFetch(`/api/mastery?locale=${locale}`).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as MasteryOverview;
      masteryRef.current = payload;
      setMastery(payload);
    }).catch(() => undefined);
  }, [locale]);
  useEffect(() => {
    if (view === "dashboard" || view === "path" || view === "review" || view === "proof") refreshMastery();
  }, [view, refreshMastery]);
  const [storage, setStorage] = useState<"durable" | "ephemeral">("ephemeral");
  const l = (zh: string, en: string) => pick(locale, zh, en);

  useEffect(() => {
    const saved = window.localStorage.getItem("onelearn-view") as View | null;
    const savedLocale = window.localStorage.getItem("onelearn-locale") as Locale | null;
    const storedCourse = window.localStorage.getItem("onelearn-active-course");
    const hydrationFrame = window.requestAnimationFrame(() => {
      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
      if (requestedView && navItems.some((item) => item.id === requestedView)) {
        setView(requestedView);
        window.localStorage.setItem("onelearn-view", requestedView);
      } else if (saved && navItems.some((item) => item.id === saved)) setView(saved);
      if (savedLocale === "zh" || savedLocale === "en") {
        setLocale(savedLocale);
        document.documentElement.lang = savedLocale === "zh" ? "zh-CN" : "en";
      }
      if (storedCourse) {
        try {
          const course = JSON.parse(storedCourse) as CatalogEntry;
          const courseLocale = savedLocale === "en" ? "en" : "zh";
          setActiveCourse(course);
          const storedBundle = window.localStorage.getItem(generatedCourseKey(course.id, courseLocale));
          if (storedBundle) setGeneratedCourse(JSON.parse(storedBundle) as GeneratedCourseBundle);
        } catch {
          window.localStorage.removeItem("onelearn-active-course");
        }
      }
      const requestedLocale = savedLocale === "en" ? "en" : "zh";
      void oneLearnFetch(`/api/workspace?locale=${requestedLocale}`).then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json() as {
          identity?: LearnerIdentity;
          workspace?: { storage?: "durable" | "ephemeral"; locale?: Locale; course?: Partial<CatalogEntry> | null; bundle?: GeneratedCourseBundle | null; stats?: LearnerStats };
        };
        if (payload.identity) setIdentity(payload.identity);
        if (payload.workspace?.stats) setLearnerStats(payload.workspace.stats);
        setStorage(payload.workspace?.storage ?? "ephemeral");
        if (payload.workspace?.locale === "zh" || payload.workspace?.locale === "en") {
          setLocale(payload.workspace.locale);
          window.localStorage.setItem("onelearn-locale", payload.workspace.locale);
          document.documentElement.lang = payload.workspace.locale === "zh" ? "zh-CN" : "en";
        }
        if (payload.workspace?.course && payload.workspace.bundle) {
          const rawCourse = payload.workspace.course;
          const course = { ...rawCourse, searchable: rawCourse.searchable ?? `${rawCourse.title ?? ""} ${rawCourse.academy ?? ""} ${rawCourse.group ?? ""}`.toLocaleLowerCase("en-US") } as CatalogEntry;
          setActiveCourse(course);
          setGeneratedCourse(payload.workspace.bundle);
          window.localStorage.setItem("onelearn-active-course", JSON.stringify(course));
          window.localStorage.setItem(generatedCourseKey(course.id, payload.workspace.bundle.generation.locale), JSON.stringify(payload.workspace.bundle));
        }
      }).catch(() => undefined);
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
          pathMastery: masteryRef.current?.summary.pathMastery ?? 0,
          verifiedNodes: masteryRef.current?.summary.mastered ?? 0,
          retention: masteryRef.current?.summary.averageRetention ?? 0,
          dueReviews: masteryRef.current?.summary.due ?? 0,
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
    if (activeCourse) {
      const cached = window.localStorage.getItem(generatedCourseKey(activeCourse.id, next));
      try { setGeneratedCourse(cached ? JSON.parse(cached) as GeneratedCourseBundle : null); }
      catch { setGeneratedCourse(null); }
    }
    setGenerationState({ status: "idle" });
    void oneLearnFetch("/api/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
  };
  const navigate = (next: View) => {
    setView(next);
    window.localStorage.setItem("onelearn-view", next);
  };
  const startCourse = async (course: CatalogEntry, goal = "", force = false) => {
    setSelectedCourse(null);
    setGenerationState({ status: "loading" });
    const cacheKey = generatedCourseKey(course.id, locale);
    if (!force) {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const bundle = JSON.parse(cached) as GeneratedCourseBundle;
          setActiveCourse(course);
          setGeneratedCourse(bundle);
          window.localStorage.setItem("onelearn-active-course", JSON.stringify(course));
          if (bundle.generation.courseVersionId || storage === "ephemeral") {
            setGenerationState({ status: "idle" });
            navigate("path");
            return;
          }
        } catch { window.localStorage.removeItem(cacheKey); }
      }
    }
    try {
      const response = await oneLearnFetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          title: course.title,
          titleEn: courseTitleEn(course.title),
          academy: academyName(course.academyId, course.academy, locale),
          group: groupName(course.group, locale),
          level: levelName(course.level, locale),
          locale,
          goal,
          sourceText: "",
        }),
      });
      const payload = await response.json() as GeneratedCourseBundle & { error?: string };
      if (!response.ok || !payload.curriculum) throw new Error(payload.error || l("课程生成失败，请稍后重试。", "Course generation failed. Please try again."));
      setActiveCourse(course);
      setGeneratedCourse(payload);
      window.localStorage.setItem("onelearn-active-course", JSON.stringify(course));
      window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      setStorage(payload.generation.storage ?? storage);
      setLearnerStats((current) => current ? {
        ...current,
        courseVersions: current.courseVersions + 1,
        averageQuality: payload.quality?.overallScore ?? current.averageQuality,
      } : current);
      setGenerationState({ status: "idle" });
      navigate("path");
    } catch (error) {
      setGenerationState({ status: "error", message: error instanceof Error ? error.message : l("课程生成失败，请稍后重试。", "Course generation failed. Please try again.") });
    }
  };
  const startGoal = (goal: string) => {
    const course: CatalogEntry = {
      id: `dynamic-goal-${Date.now()}`,
      title: goal,
      academyId: "dynamic",
      academy: "动态课程引擎",
      group: "用户生成课程",
      kind: "standard",
      level: "专业",
      description: goal,
      searchable: goal.toLocaleLowerCase("en-US"),
    };
    void startCourse(course, goal);
  };
  const regenerateCourse = () => {
    if (activeCourse) void startCourse(activeCourse, "", true);
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
      <SidebarFooter className="gap-3 border-t border-white/7 p-3"><NewGoalDialog locale={locale} onStartGoal={startGoal} isGenerating={generationState.status === "loading"} /><button onClick={() => navigate("billing")} className="flex items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5 group-data-[collapsible=icon]:justify-center"><span className="flex size-8 items-center justify-center rounded-lg bg-white/7 text-xs font-semibold text-cyan-200">{identity?.displayName?.slice(0, 2).toUpperCase() ?? "OL"}</span><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-medium text-slate-200">{identity?.displayName ?? l("学习者", "Learner")}</p><p className="flex items-center gap-1 text-[11px] text-slate-600">{storage === "durable" ? <Cloud className="size-3" /> : <Database className="size-3" />}{storage === "durable" ? l("云端学习档案", "Cloud learning profile") : l("设备模式", "Device mode")}</p></div><Settings aria-label={l("套餐与账单", "Plans and billing")} className="size-4 text-slate-600 group-data-[collapsible=icon]:hidden" /></button></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[#060b13]">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/7 bg-[#060b13]/90 px-4 backdrop-blur-xl sm:px-7"><SidebarTrigger aria-label={l("切换侧边栏", "Toggle sidebar")} className="text-slate-400 hover:bg-white/5 hover:text-white" /><div className="h-5 w-px bg-white/8" /><span className="text-sm text-slate-400">{title}</span><div className="ml-auto flex items-center gap-2"><LocaleSwitch locale={locale} onChange={changeLocale} /><button onClick={() => setCommandOpen(true)} className="command-button"><Search /><span className="hidden sm:inline">{l("全局搜索", "Search anything")}</span><kbd className="hidden lg:inline">⌘ K</kbd></button><Button variant="ghost" size="icon-sm" aria-label={l("帮助", "Help")} className="hidden text-slate-500 hover:bg-white/5 hover:text-white sm:inline-flex"><CircleHelp /></Button><Button variant="ghost" size="icon-sm" aria-label={l("通知", "Notifications")} className="relative text-slate-500 hover:bg-white/5 hover:text-white"><Bell /><i className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300" /></Button></div></header>
      <main className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        {generationState.status === "loading" && <div className="ai-generation-toast" role="status"><LoaderCircle className="animate-spin" /><div><strong>{l("OpenAI 正在创建课程", "OpenAI is creating your course")}</strong><span>{l("正在生成知识地图、课节、首课内容与练习…", "Generating the knowledge map, lessons, first lesson, and practice…")}</span></div></div>}
        {generationState.status === "error" && <div className="ai-error-banner" role="alert"><TriangleAlert /><div><strong>{l("课程生成未完成", "Course generation did not complete")}</strong><span>{generationState.message}</span></div><button onClick={() => setGenerationState({ status: "idle" })} aria-label={l("关闭错误提示", "Dismiss error")}><X /></button></div>}
        {view === "dashboard" && <Dashboard onNavigate={navigate} locale={locale} identity={identity} stats={learnerStats} storage={storage} mastery={mastery} />}
        {view === "catalog" && <CourseUniverse selectedCourse={selectedCourse} onSelectCourse={setSelectedCourse} onStartCourse={(course, goal) => void startCourse(course, goal)} locale={locale} generationState={generationState} />}
        {view === "path" && <KnowledgeMap onNavigate={navigate} activeCourse={activeCourse} bundle={generatedCourse} locale={locale} onRegenerate={regenerateCourse} mastery={mastery} />}
        {view === "learn" && <LearningRoom key={`${locale}-${generatedCourse?.generation.responseId ?? "demo"}`} locale={locale} bundle={generatedCourse} />}
        {view === "practice" && <PracticeView key={`${locale}-${generatedCourse?.generation.responseId ?? "demo"}`} locale={locale} bundle={generatedCourse} onAnswered={refreshMastery} />}
        {view === "review" && <ReviewView locale={locale} bundle={generatedCourse} mastery={mastery} onAnswered={refreshMastery} onNavigate={navigate} />}
        {view === "library" && <LibraryView locale={locale} />}
        {view === "proof" && <ProofView locale={locale} mastery={mastery} />}
        {view === "billing" && <BillingView locale={locale} />}
        {view === "operations" && <OperationsView locale={locale} />}
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
