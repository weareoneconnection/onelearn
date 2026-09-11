"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, FileText, LoaderCircle, Search, ShieldCheck, Sparkles, Target, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { academies, type Academy, academyEntryCount, type CatalogEntry, catalogScale, courseCatalog, dynamicCourseModes, futureCatalogScale, launchSequence, searchCatalog } from "@/lib/onelearn/catalog";
import { academyName, academyNotesEn, courseTitleEn, formatCatalogNumber, groupName, levelName, type Locale, pick } from "@/lib/onelearn/i18n";
import type { GenerationState } from "./types";

export const dynamicCopyEn: Record<string, { title: string; description: string; example: string; outputs: string[] }> = {
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

export const futureScaleEn = ["Academies", "Primary disciplines", "Standard learning paths", "Standalone courses", "Knowledge nodes", "Dynamic personalized courses"];

export const launchSequenceEn = [
  "AI & AI agents", "Programming & digital skills", "Construction AI & engineering management",
  "English & professional communication", "Project management & certification exams",
  "Enterprise knowledge learning", "Open uploads for any source", "Open course creation for experts and institutions",
];

export function courseKindLabel(course: CatalogEntry, locale: Locale) {
  if (course.kind === "language_path") return pick(locale, "语言专属路径", "Language path");
  if (course.kind === "exam_path") return pick(locale, "考试学习模块", "Exam module");
  return pick(locale, "标准课程", "Standard course");
}

export function AcademyCard({ academy, onOpen, locale }: { academy: Academy; onOpen: () => void; locale: Locale }) {
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

export function CourseUniverse({ selectedCourse, onSelectCourse, onStartCourse, locale, generationState }: {
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
