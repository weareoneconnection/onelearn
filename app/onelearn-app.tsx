"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, BrainCircuit, Check, ChevronRight, CircleHelp,
  FileText, Flame, FolderOpen, GraduationCap, LayoutDashboard, LibraryBig, LockKeyhole,
  Map, Mic, MoreHorizontal, Orbit, Play, Plus, Search, Settings, ShieldCheck,
  Sparkles, Target, TimerReset, Trophy, Upload, WandSparkles,
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

type View = "dashboard" | "catalog" | "path" | "learn" | "practice" | "review" | "library" | "proof";
type WebModelContext = { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };

const navItems = [
  { id: "dashboard" as View, label: "Today", icon: LayoutDashboard },
  { id: "catalog" as View, label: "课程宇宙", icon: LibraryBig },
  { id: "path" as View, label: "Knowledge map", icon: Map },
  { id: "learn" as View, label: "Learning room", icon: GraduationCap },
  { id: "practice" as View, label: "Practice", icon: Target },
  { id: "review" as View, label: "Review", icon: TimerReset },
  { id: "library" as View, label: "Sources", icon: FolderOpen },
  { id: "proof" as View, label: "Mastery proof", icon: ShieldCheck },
];

const pathNodes = [
  { id: 1, title: "AI foundations", meta: "Mastered", score: 94, state: "mastered" },
  { id: 2, title: "Prompt systems", meta: "Mastered", score: 88, state: "mastered" },
  { id: 3, title: "APIs & structured data", meta: "In progress", score: 72, state: "active" },
  { id: 4, title: "Tool calling", meta: "Ready next", score: 18, state: "ready" },
  { id: 5, title: "Memory & context", meta: "Locked", score: 0, state: "locked" },
  { id: 6, title: "Production agent", meta: "Locked", score: 0, state: "locked" },
];

function Brand() {
  return <div className="flex items-center gap-3 px-2"><div className="brand-mark" aria-hidden="true"><span /></div><div className="min-w-0 group-data-[collapsible=icon]:hidden"><div className="text-[15px] font-semibold tracking-[-0.02em] text-white">OneLearn</div><div className="text-[11px] tracking-[0.16em] text-slate-500">MASTERY OS</div></div></div>;
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof BrainCircuit }) {
  return <article className="metric-card"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><span className="icon-well"><Icon className="size-4" /></span></div><div className="mt-5 text-[2rem] font-medium leading-none tracking-[-0.05em] text-white">{value}</div><p className="mt-2 text-xs text-slate-500">{detail}</p></article>;
}

function Dashboard({ onNavigate }: { onNavigate: (view: View) => void }) {
  const activities = [
    ["09:10", "JSON response contracts", "Lesson", "+6 mastery"],
    ["09:28", "Schema repair challenge", "Practice", "Passed"],
    ["Yesterday", "API authentication", "Review", "Stable"],
  ];
  return <div className="space-y-7 animate-in fade-in duration-500">
    <section className="dashboard-hero">
      <div className="relative z-10 max-w-2xl"><div className="eyebrow"><Sparkles className="size-3.5" /> ADAPTIVE PLAN · DAY 12</div><h1>Good morning, King.</h1><p>You are one focused session away from unlocking <span>Tool calling</span>.</p><div className="mt-7 flex flex-wrap gap-3"><Button onClick={() => onNavigate("learn")} className="primary-pill">Continue learning <ArrowRight /></Button><Button onClick={() => onNavigate("path")} variant="outline" className="secondary-pill">View knowledge map</Button></div></div>
      <div className="mastery-orbit" aria-label="Current path mastery 68 percent"><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /><div className="orbit-core"><strong>68%</strong><span>PATH MASTERY</span></div><i className="orbit-node node-a" /><i className="orbit-node node-b" /><i className="orbit-node node-c" /></div>
    </section>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><MetricCard label="Verified mastery" value="24" detail="knowledge nodes" icon={BrainCircuit} /><MetricCard label="Learning streak" value="12 d" detail="best streak: 18 days" icon={Flame} /><MetricCard label="Retention" value="91%" detail="after delayed review" icon={TimerReset} /><MetricCard label="Evidence" value="8" detail="verified artifacts" icon={ShieldCheck} /></section>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="section-kicker">TODAY&apos;S MISSION</div><h2 className="mt-2 text-xl font-medium tracking-tight text-white">Make model outputs reliable</h2><p className="mt-1 text-sm text-slate-400">APIs & structured data · Lesson 4 of 6</p></div><span className="time-chip">18 min</span></div><div className="mt-7 grid gap-3 sm:grid-cols-3">{["Understand JSON schemas", "Repair an invalid response", "Pass the no-hint check"].map((item, i) => <div key={item} className={cn("mission-step", i === 0 && "is-current")}><div className="flex items-center gap-2"><span>{i + 1}</span><p>{item}</p></div></div>)}</div><div className="mt-6 flex items-center gap-3"><Progress value={42} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">42%</span></div></article>
      <article className="surface-card flex min-h-[260px] flex-col p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">REVIEW QUEUE</div><h2 className="mt-2 text-lg font-medium text-white">3 nodes due</h2></div><TimerReset className="size-5 text-amber-300" /></div><div className="mt-5 space-y-2">{["Token windows", "API status codes", "System prompts"].map((item, i) => <button key={item} onClick={() => onNavigate("review")} className="review-row"><span className={cn("review-priority", i === 0 ? "high" : "normal")} /><span className="flex-1 text-left text-sm text-slate-200">{item}</span><span className="text-xs text-slate-500">{i === 0 ? "fragile" : "due"}</span><ChevronRight className="size-4 text-slate-600" /></button>)}</div><Button onClick={() => onNavigate("review")} variant="ghost" className="link-button mt-auto">Start 8-minute review <ArrowRight /></Button></article>
    </section>
    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">MASTERY VELOCITY</div><h2 className="mt-2 text-lg font-medium text-white">This week</h2></div><span className="text-sm text-emerald-300">+18%</span></div><div className="velocity-chart" aria-label="Weekly mastery gain chart">{[36, 55, 42, 72, 60, 86, 68].map((height, i) => <div key={i} className="chart-column"><i style={{ height: `${height}%` }} /><span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span></div>)}</div></article>
      <article className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><div className="section-kicker">LEARNING TRACE</div><h2 className="mt-2 text-lg font-medium text-white">Recent evidence</h2></div><MoreHorizontal className="size-4 text-slate-600" /></div><div className="mt-5 divide-y divide-white/6">{activities.map((a) => <div key={a[1]} className="grid grid-cols-[62px_1fr_auto] items-center gap-3 py-3.5"><span className="text-xs text-slate-600">{a[0]}</span><div><p className="text-sm text-slate-200">{a[1]}</p><p className="text-xs text-slate-500">{a[2]}</p></div><span className="text-xs text-cyan-300">{a[3]}</span></div>)}</div></article>
    </section>
  </div>;
}

function courseKindLabel(course: CatalogEntry) {
  if (course.kind === "language_path") return "语言专属路径";
  if (course.kind === "exam_path") return "考试学习模块";
  return "标准课程";
}

function AcademyCard({ academy, onOpen }: { academy: Academy; onOpen: () => void }) {
  const sample = academy.groups.flatMap((group) => group.courses).slice(0, 3);
  return <button onClick={onOpen} className="academy-card">
    <div className="flex items-start justify-between gap-3"><span className="academy-index">{academy.id}</span><span className="academy-count">{academyEntryCount(academy.id)} 条路径</span></div>
    <h2>{academy.name}</h2>
    <p>{academy.groups.map((group) => group.name).join(" · ")}</p>
    <div className="academy-samples">{sample.map((course) => <span key={course}>{course}</span>)}</div>
    <div className="academy-open">浏览全部 <ArrowRight /></div>
  </button>;
}

function CourseUniverse({ selectedCourse, onSelectCourse, onStartCourse }: {
  selectedCourse: CatalogEntry | null;
  onSelectCourse: (course: CatalogEntry | null) => void;
  onStartCourse: (course: CatalogEntry) => void;
}) {
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

  const beginDynamicCourse = () => {
    if (!dynamicMode) return;
    onStartCourse({
      id: `dynamic-${dynamicMode.id}`,
      title: dynamicMode.title,
      academyId: "dynamic",
      academy: "动态课程引擎",
      group: dynamicMode.title,
      kind: "standard",
      level: "专业",
      description: dynamicMode.description,
      searchable: `${dynamicMode.title} ${dynamicMode.description}`.toLocaleLowerCase("zh-CN"),
    });
    setDynamicMode(null);
  };

  return <div className="space-y-7 animate-in fade-in duration-500">
    <section className="catalog-hero">
      <div className="catalog-hero-copy"><div className="eyebrow"><Sparkles className="size-3.5" /> ONELEARN COURSE UNIVERSE</div><h1>把世界知识，变成你的掌握路径。</h1><p>覆盖主要人类知识与职业能力。选择标准课程，或从你的目标、资料与现实结果即时生成专属课程。</p></div>
      <div className="catalog-scale">{catalogScale.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>
    </section>

    <section className="catalog-toolbar" aria-label="课程筛选">
      <div className="catalog-search"><Search /><Input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(72); }} placeholder="搜索课程、学院、技能或认证…" /></div>
      <select aria-label="选择学院" value={academyId} onChange={(event) => { setAcademyId(event.target.value); setGroup("all"); setVisibleCount(72); }}>
        <option value="all">全部 32 个学院</option>
        {academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.id}. {academy.name}</option>)}
      </select>
    </section>

    {showOverview ? <>
      <section><div className="catalog-section-heading"><div><div className="section-kicker">DYNAMIC CURRICULUM</div><h2>三种方式，学习任何可信知识</h2></div><span>无需等待课程预制</span></div><div className="dynamic-grid">{dynamicCourseModes.map((mode, index) => {
        const Icon = [WandSparkles, FileText, Target][index];
        return <button key={mode.id} onClick={() => setDynamicMode(mode)} className="dynamic-card"><span className="dynamic-icon"><Icon /></span><small>{mode.eyebrow}</small><h3>{mode.title}</h3><p>{mode.description}</p><div>{mode.outputs.slice(0, 4).map((output) => <span key={output}>{output}</span>)}</div><strong>立即生成 <ArrowRight /></strong></button>;
      })}</div></section>
      <section><div className="catalog-section-heading"><div><div className="section-kicker">32 ACADEMIES</div><h2>完整知识与职业能力版图</h2></div><span>共 {courseCatalog.length.toLocaleString("zh-CN")} 条可选学习路径</span></div><div className="academy-grid">{academies.map((academy) => <AcademyCard key={academy.id} academy={academy} onOpen={() => { setAcademyId(academy.id); setGroup("all"); setVisibleCount(72); }} />)}</div></section>
      <section className="catalog-roadmap"><div><div className="section-kicker">COURSE UNIVERSE ROADMAP</div><h2>从重点首发，到无限个性化</h2><p>OneLearn 的终点不是堆积课程，而是把任何可信知识转化为可验证、可保持的个性化学习路径。</p><div className="future-scale">{futureCatalogScale.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div></div><ol>{launchSequence.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></li>)}</ol></section>
    </> : <section className="catalog-results">
      <div className="catalog-section-heading"><div>{activeAcademy && <button className="catalog-back" onClick={() => { setAcademyId("all"); setGroup("all"); setQuery(""); setVisibleCount(72); }}><ArrowLeft /> 全部学院</button>}<div className="section-kicker">{activeAcademy ? `ACADEMY ${activeAcademy.id}` : "SEARCH RESULTS"}</div><h2>{activeAcademy?.name ?? `“${query}” 的搜索结果`}</h2>{activeAcademy?.note && <p className="academy-note"><ShieldCheck />{activeAcademy.note}</p>}</div><span>{filteredCourses.length.toLocaleString("zh-CN")} 条学习路径</span></div>
      {activeAcademy && activeAcademy.groups.length > 1 && <div className="group-tabs"><button onClick={() => { setGroup("all"); setVisibleCount(72); }} className={cn(group === "all" && "is-active")}>全部</button>{activeAcademy.groups.map((item) => <button key={item.name} onClick={() => { setGroup(item.name); setVisibleCount(72); }} className={cn(group === item.name && "is-active")}>{item.name}</button>)}</div>}
      {filteredCourses.length ? <><div className="course-grid">{filteredCourses.slice(0, visibleCount).map((course) => <button key={course.id} onClick={() => onSelectCourse(course)} className="course-card"><div className="flex items-center justify-between gap-2"><span className={cn("course-level", `level-${course.level}`)}>{course.level}</span><span className="course-kind">{courseKindLabel(course)}</span></div><h3>{course.title}</h3><p>{course.group} · {course.academy}</p><div>查看学习路径 <ChevronRight /></div></button>)}</div>{visibleCount < filteredCourses.length && <div className="flex justify-center pt-2"><Button onClick={() => setVisibleCount((count) => count + 72)} variant="outline" className="secondary-pill">加载更多课程（剩余 {filteredCourses.length - visibleCount}）</Button></div>}</> : <div className="catalog-empty"><Search /><h3>没有找到匹配课程</h3><p>可以换一个关键词，或使用“用户生成课程”即时创建。</p><Button onClick={() => { setAcademyId("all"); setGroup("all"); setQuery(""); setVisibleCount(72); }} variant="outline" className="secondary-pill">返回课程宇宙</Button></div>}
    </section>}

    <Dialog open={Boolean(selectedCourse)} onOpenChange={(open) => { if (!open) onSelectCourse(null); }}><DialogContent className="course-dialog border-white/10 bg-[#0c1422] text-white sm:max-w-2xl">{selectedCourse && <><DialogHeader><div className="flex items-center gap-2"><span className="course-level">{selectedCourse.level}</span><span className="course-kind">{courseKindLabel(selectedCourse)}</span></div><DialogTitle className="pt-3 text-2xl">{selectedCourse.title}</DialogTitle><DialogDescription className="text-slate-400">{selectedCourse.academy} · {selectedCourse.group}</DialogDescription></DialogHeader><p className="course-description">{selectedCourse.description}</p><div className="path-preview">{["起点诊断", "知识地图", "AI 精讲", "自适应练习", "真实项目", "掌握证明"].map((step, index) => <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></div>)}</div><DialogFooter><Button variant="ghost" onClick={() => onSelectCourse(null)} className="text-slate-400 hover:bg-white/5 hover:text-white">稍后再看</Button><Button onClick={() => onStartCourse(selectedCourse)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">建立我的学习路径 <ArrowRight /></Button></DialogFooter></>}</DialogContent></Dialog>

    <Dialog open={Boolean(dynamicMode)} onOpenChange={(open) => { if (!open) setDynamicMode(null); }}><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl">{dynamicMode && <><DialogHeader><div className="section-kicker">{dynamicMode.eyebrow}</div><DialogTitle className="pt-2 text-2xl">{dynamicMode.title}</DialogTitle><DialogDescription className="leading-6 text-slate-400">{dynamicMode.description}</DialogDescription></DialogHeader><div className="dynamic-example"><span>示例输入</span><p>“{dynamicMode.example}”</p></div><div className="dynamic-outputs">{dynamicMode.outputs.map((output) => <span key={output}><Check />{output}</span>)}</div><DialogFooter><Button variant="ghost" onClick={() => setDynamicMode(null)} className="text-slate-400 hover:bg-white/5 hover:text-white">取消</Button><Button onClick={beginDynamicCourse} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">开始生成路径 <WandSparkles /></Button></DialogFooter></>}</DialogContent></Dialog>
  </div>;
}

function KnowledgeMap({ onNavigate, activeCourse }: { onNavigate: (view: View) => void; activeCourse: CatalogEntry | null }) {
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="ADAPTIVE KNOWLEDGE GRAPH" title={activeCourse ? `掌握 ${activeCourse.title}` : "Build a production AI agent"} detail={activeCourse ? `${activeCourse.academy} · 已生成 36 个知识节点` : "36 nodes · 24 mastered · 4 currently available"}><Button onClick={() => onNavigate("learn")} className="primary-pill"><Play /> Resume path</Button></PageHeading><div className="map-shell"><div className="map-grid" /><div className="path-line" aria-hidden="true" /><div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-5 py-5">{pathNodes.map((node, i) => <button key={node.id} disabled={node.state === "locked"} onClick={() => node.state !== "locked" && onNavigate("learn")} className={cn("knowledge-node", `node-${node.state}`, i % 2 ? "translate-x-[clamp(0px,8vw,90px)]" : "-translate-x-[clamp(0px,8vw,90px)]")}><span className="node-index">{node.state === "mastered" ? <Check /> : node.state === "locked" ? <LockKeyhole /> : node.id}</span><span className="min-w-0 flex-1 text-left"><strong>{node.title}</strong><small>{node.meta}</small></span><span className="node-score">{node.score}%</span></button>)}</div><div className="map-legend"><span><i className="bg-emerald-300" /> Mastered</span><span><i className="bg-cyan-300" /> Learning</span><span><i className="bg-slate-600" /> Locked</span></div></div></div>;
}

function LearningRoom() {
  const [messages, setMessages] = useState([{ from: "tutor", text: "Before we move on: why can a model return valid JSON that still fails your application?" }]);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(1);
  const submit = () => { if (!answer.trim()) return; setMessages((m) => [...m, { from: "you", text: answer }, { from: "tutor", text: "Exactly—the syntax may be valid while fields, types, or constraints violate the contract. That distinction is the key. Your explanation shows applied understanding." }]); setAnswer(""); setStep(2); };
  return <div className="learning-layout animate-in fade-in duration-500"><section className="lesson-surface"><div className="flex items-center justify-between border-b border-white/7 px-5 py-4 sm:px-7"><div><div className="section-kicker">LESSON 4 · 18 MIN</div><h1 className="mt-1 text-lg font-medium text-white">Reliable structured outputs</h1></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-500 sm:inline">Focus mode</span><span className="status-dot" /></div></div><div className="lesson-body"><div className="lesson-number">04</div><div className="section-kicker">CONCEPT</div><h2>A prompt asks.<br />A schema enforces.</h2><p>A structured output contract defines the exact shape your application can accept. It turns a hopeful instruction into a machine-checkable boundary.</p><div className="concept-compare"><div><span>PROMPT</span><code>“Return name and score as JSON.”</code><small>Intent only</small></div><ArrowRight className="size-5 text-slate-600" /><div className="is-strong"><span>SCHEMA</span><code>{`{ name: string, score: 0..100 }`}</code><small>Enforceable contract</small></div></div><div className="insight-note"><BrainCircuit className="size-5" /><p><strong>Transfer insight</strong>A schema does not make the model smarter. It makes failure visible, classifiable, and repairable.</p></div></div><div className="border-t border-white/7 p-4 sm:px-7"><div className="flex items-center gap-3"><Progress value={step === 1 ? 58 : 76} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-xs text-slate-500">{step === 1 ? "58" : "76"}%</span></div></div></section><aside className="tutor-panel"><div className="flex items-center gap-3 border-b border-white/7 p-5"><div className="tutor-avatar"><Orbit /></div><div><h2 className="text-sm font-medium text-white">Sora · AI Tutor</h2><p className="text-xs text-emerald-300">Checking understanding</p></div></div><div className="tutor-thread scrollbar-thin">{messages.map((m, i) => <div key={i} className={cn("message", m.from === "you" && "message-you")}><span>{m.from === "tutor" ? "SORA" : "YOU"}</span><p>{m.text}</p></div>)}{step === 2 && <div className="mastery-signal"><Check className="size-4" /><span>Understanding evidence captured</span></div>}</div><div className="tutor-input-wrap"><label htmlFor="tutor-answer" className="sr-only">Answer your tutor</label><textarea id="tutor-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Explain in your own words…" /><div className="flex items-center justify-between"><Button variant="ghost" size="icon-sm" className="text-slate-500"><Mic /></Button><Button onClick={submit} size="sm" className="primary-pill h-8">Send <ArrowRight /></Button></div></div></aside></div>;
}

function PracticeView() {
  const [selected, setSelected] = useState<number | null>(null); const [checked, setChecked] = useState(false);
  const options = ["The model did not follow the prompt", "The JSON is invalid", "The output violates the expected schema", "The API request timed out"];
  return <div className="mx-auto max-w-4xl animate-in fade-in duration-500"><PageHeading kicker="ADAPTIVE PRACTICE" title="Schema reasoning" detail="Challenge 3 of 8 · difficulty adapts after every answer"><span className="time-chip">05:42</span></PageHeading><article className="surface-card mt-8 overflow-hidden"><div className="border-b border-white/7 p-6 sm:p-9"><span className="question-type">SINGLE BEST ANSWER</span><h2 className="mt-5 max-w-2xl text-xl font-medium leading-8 text-white">An API returns valid JSON, but your application rejects it because <code>score</code> is a string instead of a number. What failed?</h2></div><div className="space-y-3 p-6 sm:p-9">{options.map((o, i) => <button key={o} onClick={() => !checked && setSelected(i)} className={cn("answer-option", selected === i && "is-selected", checked && i === 2 && "is-correct", checked && selected === i && i !== 2 && "is-wrong")}><span>{String.fromCharCode(65 + i)}</span><p>{o}</p>{checked && i === 2 && <Check />}</button>)}{checked && <div className="feedback-box"><ShieldCheck /><div><strong>{selected === 2 ? "Correct — this is a contract failure." : "Not quite — syntax and schema validity are different."}</strong><p>JSON can be syntactically valid while violating the field types your application requires.</p></div></div>}<div className="flex justify-end pt-3"><Button disabled={selected === null} onClick={() => setChecked(true)} className="primary-pill">Check answer</Button></div></div></article></div>;
}

function ReviewView() {
  const items = [{ title: "Token windows", due: "Priority review", score: 61, amber: true }, { title: "API status codes", due: "Due today", score: 74 }, { title: "System prompts", due: "Due today", score: 79 }];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="SPACED RETENTION" title="Your review queue" detail="8 minutes today keeps three fragile concepts stable."><Button className="primary-pill"><Play /> Start review</Button></PageHeading><div className="grid gap-4 lg:grid-cols-3">{items.map((item) => <article key={item.title} className="surface-card p-6"><div className="flex items-center justify-between"><span className={cn("status-chip", item.amber && "is-amber")}>{item.due}</span><TimerReset className="size-5 text-slate-500" /></div><h2 className="mt-8 text-lg font-medium text-white">{item.title}</h2><p className="mt-1 text-sm text-slate-500">Predicted retention</p><div className="mt-5 flex items-center gap-3"><Progress value={item.score} className="h-1.5 bg-white/8 [&>div]:bg-cyan-300" /><span className="text-sm text-slate-300">{item.score}%</span></div><Button variant="ghost" className="link-button mt-6">Review now <ArrowRight /></Button></article>)}</div></div>;
}

function LibraryView() {
  const sources = [{ name: "Building AI Agents — field notes.pdf", type: "PDF · 84 pages", nodes: "18 knowledge nodes", trust: "Verified" }, { name: "OpenAI API reference", type: "Web source · synced", nodes: "12 knowledge nodes", trust: "Current" }, { name: "Agent systems workshop.md", type: "Markdown · 22 KB", nodes: "7 knowledge nodes", trust: "Private" }];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="SOURCE LIBRARY" title="Learn from your material" detail="Every claim stays connected to its source and version."><Button className="primary-pill"><Upload /> Add source</Button></PageHeading><div className="source-drop"><Upload className="size-7" /><h2>Turn any source into a mastery path</h2><p>Drop PDF, DOCX, PPTX, Markdown, audio, or paste a URL.</p><Button variant="outline" className="secondary-pill mt-4">Choose files</Button></div><div className="grid gap-3">{sources.map((s) => <article key={s.name} className="source-row"><span className="source-icon"><FileText /></span><div className="min-w-0 flex-1"><h2>{s.name}</h2><p>{s.type} · {s.nodes}</p></div><span className="hidden rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-xs text-emerald-300 sm:block">{s.trust}</span><MoreHorizontal className="size-4 text-slate-600" /></article>)}</div></div>;
}

function ProofView() {
  const proofs = [{ title: "Structured output validator", type: "Working project", detail: "Passed 18/18 contract tests" }, { title: "Oral defense: API reliability", type: "Adaptive assessment", detail: "High evaluator agreement" }];
  return <div className="space-y-6 animate-in fade-in duration-500"><PageHeading kicker="MASTERY PASSPORT" title="Capability, backed by evidence" detail="Not a completion badge. A living record of what you can do."><Button variant="outline" className="secondary-pill">Share profile</Button></PageHeading><article className="passport-card"><div className="passport-glow" /><div className="relative z-10"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm text-cyan-300"><ShieldCheck className="size-4" /> VERIFIED CAPABILITY</div><h2 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-white">AI Agent Foundations</h2><p className="mt-2 text-slate-400">Level 3 · Applied independently</p></div><div className="passport-seal"><Orbit /></div></div><div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-4">{[["Evidence","8 artifacts"],["Assessment","91 / 100"],["Retention","Stable"],["Last verified","Sep 11, 2026"]].map(([a,b]) => <div key={a}><span>{a}</span><strong>{b}</strong></div>)}</div></div></article><div className="grid gap-4 md:grid-cols-2">{proofs.map((p) => <article key={p.title} className="surface-card flex items-center gap-4 p-5"><span className="source-icon"><Trophy /></span><div className="flex-1"><h2 className="text-sm font-medium text-white">{p.title}</h2><p className="mt-1 text-xs text-slate-500">{p.type} · {p.detail}</p></div><ChevronRight className="size-4 text-slate-600" /></article>)}</div></div>;
}

function PageHeading({ kicker, title, detail, children }: { kicker: string; title: string; detail: string; children: React.ReactNode }) {
  return <div className="page-heading"><div><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{detail}</p></div>{children}</div>;
}

function NewGoalDialog() {
  const [open, setOpen] = useState(false); const [goal, setGoal] = useState("");
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="w-full justify-start rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:p-0"><Plus /><span className="group-data-[collapsible=icon]:hidden">New learning goal</span></Button></DialogTrigger><DialogContent className="border-white/10 bg-[#0c1422] text-white sm:max-w-xl"><DialogHeader><DialogTitle className="text-xl">What do you want to master?</DialogTitle><DialogDescription className="text-slate-400">Describe the outcome. OneLearn will diagnose your level and build the shortest credible path.</DialogDescription></DialogHeader><Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Build and deploy a production AI agent" className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-600" /><div className="grid gap-2 sm:grid-cols-3">{[[Target,"Learn a goal"],[BookOpen,"Learn a source"],[Trophy,"Prepare for an outcome"]].map(([Icon,label], i) => { const C = Icon as typeof Target; return <button key={label as string} className={cn("goal-kind", i === 0 && "is-active")}><C /><span>{label as string}</span></button>; })}</div><DialogFooter><Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:bg-white/5 hover:text-white">Cancel</Button><Button disabled={!goal.trim()} onClick={() => setOpen(false)} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">Begin diagnosis <ArrowRight /></Button></DialogFooter></DialogContent></Dialog>;
}

export function OneLearnApp() {
  const [view, setView] = useState<View>("dashboard");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<CatalogEntry | null>(null);
  const [activeCourse, setActiveCourse] = useState<CatalogEntry | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("onelearn-view") as View | null;
    const storedCourse = window.localStorage.getItem("onelearn-active-course");
    const hydrationFrame = window.requestAnimationFrame(() => {
      if (saved && navItems.some((item) => item.id === saved)) setView(saved);
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
      description: "Search the complete OneLearn course universe by course, skill, academy, language, or certification.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input: unknown) {
        const query = (input as { query?: string })?.query ?? "";
        const matches = searchCatalog(query);
        return {
          query,
          total: matches.length,
          results: matches.slice(0, 12).map((course) => ({ title: course.title, academy: course.academy, group: course.group, level: course.level })),
        };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    void Promise.resolve(context.registerTool({
      name: "get_learning_status",
      title: "Get learning status",
      description: "Read the current OneLearn demo learner status and available curriculum scale.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute() {
        return {
          activeView: saved ?? "dashboard",
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
  const title = useMemo(() => navItems.find((item) => item.id === view)?.label ?? "Today", [view]);

  return <SidebarProvider defaultOpen>
    <Sidebar collapsible="icon" className="border-r border-white/7 bg-[#08101c]" variant="sidebar">
      <SidebarHeader className="p-4"><Brand /></SidebarHeader>
      <SidebarContent className="px-2"><SidebarGroup><SidebarGroupContent><SidebarMenu>{navItems.map((item) => <SidebarMenuItem key={item.id}><SidebarMenuButton isActive={view === item.id} tooltip={item.label} onClick={() => navigate(item.id)} className="h-10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white data-[active=true]:bg-cyan-300/10 data-[active=true]:text-cyan-200"><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
      <SidebarFooter className="gap-3 border-t border-white/7 p-3"><NewGoalDialog /><div className="flex items-center gap-3 rounded-xl p-2 group-data-[collapsible=icon]:justify-center"><span className="flex size-8 items-center justify-center rounded-lg bg-white/7 text-xs font-semibold text-cyan-200">KM</span><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-medium text-slate-200">King Ma</p><p className="text-[11px] text-slate-600">Pro learner</p></div><Settings className="size-4 text-slate-600 group-data-[collapsible=icon]:hidden" /></div></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[#060b13]">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/7 bg-[#060b13]/90 px-4 backdrop-blur-xl sm:px-7"><SidebarTrigger className="text-slate-400 hover:bg-white/5 hover:text-white" /><div className="h-5 w-px bg-white/8" /><span className="text-sm text-slate-400">{title}</span><div className="ml-auto flex items-center gap-2"><button onClick={() => setCommandOpen(true)} className="command-button"><Search /><span className="hidden sm:inline">Search anything</span><kbd className="hidden lg:inline">⌘ K</kbd></button><Button variant="ghost" size="icon-sm" className="text-slate-500 hover:bg-white/5 hover:text-white"><CircleHelp /></Button><Button variant="ghost" size="icon-sm" className="relative text-slate-500 hover:bg-white/5 hover:text-white"><Bell /><i className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300" /></Button></div></header>
      <main className="min-h-[calc(100svh-4rem)] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
        {view === "dashboard" && <Dashboard onNavigate={navigate} />}
        {view === "catalog" && <CourseUniverse selectedCourse={selectedCourse} onSelectCourse={setSelectedCourse} onStartCourse={startCourse} />}
        {view === "path" && <KnowledgeMap onNavigate={navigate} activeCourse={activeCourse} />}
        {view === "learn" && <LearningRoom />}
        {view === "practice" && <PracticeView />}
        {view === "review" && <ReviewView />}
        {view === "library" && <LibraryView />}
        {view === "proof" && <ProofView />}
      </main>
    </SidebarInset>
    <Dialog open={commandOpen} onOpenChange={(open) => { setCommandOpen(open); if (!open) setCommandQuery(""); }}>
      <DialogContent className="top-[22%] border-white/10 bg-[#0c1422] p-0 text-white sm:max-w-xl">
        <DialogTitle className="sr-only">Search OneLearn</DialogTitle>
        <div className="flex items-center gap-3 border-b border-white/8 px-4"><Search className="size-4 text-slate-500" /><Input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="搜索 1,000+ 课程、知识、资料或功能…" className="h-14 border-0 bg-transparent px-0 text-white shadow-none focus-visible:ring-0" /></div>
        <div className="max-h-[420px] overflow-y-auto p-3">
          {commandQuery.trim() ? <>
            <p className="px-2 pb-2 text-xs uppercase tracking-widest text-slate-600">课程宇宙 · {searchCatalog(commandQuery).length} 个结果</p>
            {commandResults.map((course) => <button key={course.id} onClick={() => { setSelectedCourse(course); navigate("catalog"); setCommandOpen(false); setCommandQuery(""); }} className="command-result"><span><LibraryBig /></span><div><strong>{course.title}</strong><small>{course.academy} · {course.group}</small></div><ChevronRight /></button>)}
            {!commandResults.length && <div className="px-2 py-8 text-center text-sm text-slate-500">没有匹配课程，试试更短的关键词。</div>}
          </> : <>
            <p className="px-2 pb-2 text-xs uppercase tracking-widest text-slate-600">Quick actions</p>
            {navItems.slice(1, 6).map((item) => <button key={item.id} onClick={() => { navigate(item.id); setCommandOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/5"><item.icon className="size-4 text-slate-500" />{item.label}<ChevronRight className="ml-auto size-4 text-slate-700" /></button>)}
          </>}
        </div>
      </DialogContent>
    </Dialog>
  </SidebarProvider>;
}
