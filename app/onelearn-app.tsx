"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, CircleHelp, Gift, LibraryBig, LoaderCircle, Search, TriangleAlert, X } from "lucide-react";
import { identifyLearner, track } from "@/lib/onelearn/analytics";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { academies, type CatalogEntry, courseCatalog, searchCatalog } from "@/lib/onelearn/catalog";
import { academyName, courseTitleEn, formatCatalogNumber, groupName, levelName, type Locale, pick } from "@/lib/onelearn/i18n";
import type { GeneratedCourseBundle } from "@/lib/onelearn/generated-course";
import { AccountMenu } from "@/components/onelearn/account-menu";
import { BillingView } from "@/components/onelearn/billing";
import { generatedCourseKey, navItems, oneLearnFetch } from "@/components/onelearn/client";
import { CourseUniverse } from "@/components/onelearn/course-universe";
import { Dashboard } from "@/components/onelearn/dashboard";
import { FeedbackDialog } from "@/components/onelearn/feedback-dialog";
import { InviteDialog } from "@/components/onelearn/invite-dialog";
import { MobileTabBar } from "@/components/onelearn/mobile-tab-bar";
import { KnowledgeMap } from "@/components/onelearn/knowledge-map";
import { LearningRoom, PracticeView, ReviewView } from "@/components/onelearn/learning";
import { LibraryView } from "@/components/onelearn/library";
import { NewGoalDialog } from "@/components/onelearn/new-goal-dialog";
import { OperationsView } from "@/components/onelearn/operations";
import { courseProgress } from "@/components/onelearn/progress";
import { ProofView } from "@/components/onelearn/proof";
import type { GenerationState, LearnerIdentity, LearnerStats, MasteryOverview, View, WebModelContext } from "@/components/onelearn/types";
import { Brand, LocaleSwitch } from "@/components/onelearn/ui";

export function OneLearnApp() {
  const [view, setView] = useState<View>("dashboard");
  const [locale, setLocale] = useState<Locale>("zh");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
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
    if (view === "dashboard" || view === "path" || view === "learn" || view === "practice" || view === "review" || view === "proof") refreshMastery();
  }, [view, refreshMastery]);
  const [storage, setStorage] = useState<"durable" | "ephemeral">("ephemeral");
  // The lesson being studied. Without an explicit choice, the recommended next lesson is used.
  const [lessonSelection, setLessonSelection] = useState<{ course: string; id: string } | null>(null);
  const [emailReminders, setEmailReminders] = useState<boolean | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [referralNotice, setReferralNotice] = useState<string | null>(null);
  const toggleReminders = (enabled: boolean) => {
    setEmailReminders(enabled);
    void oneLearnFetch("/api/workspace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, emailReminders: enabled }) })
      .then((response) => { if (!response.ok) setEmailReminders(!enabled); })
      .catch(() => setEmailReminders(!enabled));
  };
  const lessonProgress = useMemo(() => generatedCourse ? courseProgress(generatedCourse, mastery) : null, [generatedCourse, mastery]);
  const currentLessonId = generatedCourse && lessonSelection?.course === generatedCourse.generation.responseId
    ? lessonSelection.id
    : lessonProgress?.recommendedId ?? null;
  const openLesson = (lessonId: string) => {
    if (generatedCourse) setLessonSelection({ course: generatedCourse.generation.responseId, id: lessonId });
    track("lesson_opened");
    setView("learn");
    window.localStorage.setItem("onelearn-view", "learn");
  };
  const l = (zh: string, en: string) => pick(locale, zh, en);

  useEffect(() => {
    const saved = window.localStorage.getItem("onelearn-view") as View | null;
    const savedLocale = window.localStorage.getItem("onelearn-locale") as Locale | null;
    const storedCourse = window.localStorage.getItem("onelearn-active-course");
    const hydrationFrame = window.requestAnimationFrame(() => {
      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
      const referralCode = new URLSearchParams(window.location.search).get("ref");
      if (referralCode) window.localStorage.setItem("onelearn-ref", referralCode.slice(0, 32));
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
          preferences?: { emailReminders?: boolean | null };
          workspace?: { storage?: "durable" | "ephemeral"; locale?: Locale; course?: Partial<CatalogEntry> | null; bundle?: GeneratedCourseBundle | null; stats?: LearnerStats };
        };
        if (payload.identity) setIdentity(payload.identity);
        if (typeof payload.preferences?.emailReminders === "boolean") setEmailReminders(payload.preferences.emailReminders);
        if (payload.identity && payload.identity.mode !== "device") {
          void identifyLearner(payload.identity.email);
          // Claim a pending invite once the learner is signed in.
          const pendingReferral = window.localStorage.getItem("onelearn-ref");
          if (pendingReferral) void oneLearnFetch("/api/referral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: requestedLocale, code: pendingReferral }) })
            .then(async (response) => {
              const result = await response.json() as { claimed?: boolean; credits?: number; error?: string };
              window.localStorage.removeItem("onelearn-ref");
              if (result.claimed) track("referral_claimed");
              setReferralNotice(result.claimed
                ? (requestedLocale === "zh" ? `邀请奖励已到账：+${result.credits} AI 点数` : `Invite reward added: +${result.credits} AI credits`)
                : result.error ?? null);
            }).catch(() => undefined);
        }
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
    // Pin the recommended lesson on entry so a later recommendation change does not swap the page mid-study.
    if ((next === "learn" || next === "practice") && generatedCourse && lessonSelection?.course !== generatedCourse.generation.responseId && lessonProgress) {
      setLessonSelection({ course: generatedCourse.generation.responseId, id: lessonProgress.recommendedId });
    }
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
      track("course_generated", { locale, quality: payload.quality?.overallScore ?? null });
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
      <SidebarFooter className="gap-3 border-t border-white/7 p-3"><NewGoalDialog locale={locale} onStartGoal={startGoal} isGenerating={generationState.status === "loading"} /><AccountMenu locale={locale} identity={identity} emailReminders={emailReminders} onToggleReminders={toggleReminders} onNavigate={navigate} onFeedback={() => setFeedbackOpen(true)} onInvite={() => setInviteOpen(true)} /><a href="https://www.oneailabs.ai/" target="_blank" rel="noopener" className="px-2 text-[11px] text-slate-600 transition-colors hover:text-slate-400 group-data-[collapsible=icon]:hidden">Powered by OneAI Labs</a></SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-w-0 bg-[#060b13]">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/7 bg-[#060b13]/90 px-4 backdrop-blur-xl sm:px-7"><SidebarTrigger aria-label={l("切换侧边栏", "Toggle sidebar")} className="size-10 text-slate-400 hover:bg-white/5 hover:text-white md:size-7" /><div className="h-5 w-px bg-white/8" /><span className="min-w-0 truncate text-sm text-slate-400">{title}</span><div className="ml-auto flex items-center gap-2"><LocaleSwitch locale={locale} onChange={changeLocale} /><button onClick={() => setCommandOpen(true)} className="command-button"><Search /><span className="hidden sm:inline">{l("全局搜索", "Search anything")}</span><kbd className="hidden lg:inline">⌘ K</kbd></button><Button variant="ghost" size="icon-sm" aria-label={l("帮助与反馈", "Help & feedback")} onClick={() => setFeedbackOpen(true)} className="size-10 text-slate-500 hover:bg-white/5 hover:text-white md:size-8"><CircleHelp /></Button></div></header>
      <main className="min-h-[calc(100svh-4rem)] px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-7 md:pb-8 lg:px-9 lg:py-8">
        {generationState.status === "loading" && <div className="ai-generation-toast" role="status"><LoaderCircle className="animate-spin" /><div><strong>{l("OpenAI 正在创建课程", "OpenAI is creating your course")}</strong><span>{l("正在生成知识地图、课节、首课内容与练习…", "Generating the knowledge map, lessons, first lesson, and practice…")}</span></div></div>}
        {generationState.status === "error" && <div className="ai-error-banner" role="alert"><TriangleAlert /><div><strong>{l("课程生成未完成", "Course generation did not complete")}</strong><span>{generationState.message}</span></div><button onClick={() => setGenerationState({ status: "idle" })} aria-label={l("关闭错误提示", "Dismiss error")}><X /></button></div>}
        {referralNotice && <div className="billing-notice mb-4"><Gift />{referralNotice}<button onClick={() => setReferralNotice(null)} aria-label={l("关闭", "Dismiss")} className="ml-auto"><X className="size-4" /></button></div>}
        {view === "dashboard" && <Dashboard onNavigate={navigate} locale={locale} identity={identity} stats={learnerStats} storage={storage} mastery={mastery} />}
        {view === "catalog" && <CourseUniverse selectedCourse={selectedCourse} onSelectCourse={setSelectedCourse} onStartCourse={(course, goal) => void startCourse(course, goal)} locale={locale} generationState={generationState} />}
        {view === "path" && <KnowledgeMap onNavigate={navigate} onOpenLesson={openLesson} onMasteryChange={refreshMastery} activeCourse={activeCourse} bundle={generatedCourse} locale={locale} onRegenerate={regenerateCourse} mastery={mastery} />}
        {view === "learn" && <LearningRoom key={`${locale}-${generatedCourse?.generation.responseId ?? "demo"}-${currentLessonId ?? "first"}`} locale={locale} bundle={generatedCourse} lessonId={currentLessonId} mastery={mastery} onOpenLesson={openLesson} onNavigate={navigate} />}
        {view === "practice" && <PracticeView key={`${locale}-${generatedCourse?.generation.responseId ?? "demo"}-${currentLessonId ?? "first"}`} locale={locale} bundle={generatedCourse} lessonId={currentLessonId} onAnswered={refreshMastery} onNavigate={navigate} />}
        {view === "review" && <ReviewView locale={locale} bundle={generatedCourse} mastery={mastery} onAnswered={refreshMastery} onNavigate={navigate} onOpenLesson={openLesson} />}
        {view === "library" && <LibraryView locale={locale} />}
        {view === "proof" && <ProofView locale={locale} mastery={mastery} signedIn={Boolean(identity && identity.mode !== "device")} />}
        {view === "billing" && <BillingView locale={locale} />}
        {view === "operations" && <OperationsView locale={locale} />}
      </main>
      <MobileTabBar view={view} locale={locale} dueReviews={mastery?.summary.due ?? 0} onNavigate={navigate} />
    </SidebarInset>
    <FeedbackDialog locale={locale} open={feedbackOpen} onOpenChange={setFeedbackOpen} page={view} />
    <InviteDialog locale={locale} open={inviteOpen} onOpenChange={setInviteOpen} />
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
