"use client";

import { useState } from "react";
import { BookOpen, LoaderCircle, Plus, Sparkles, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";

export function NewGoalDialog({ locale, onStartGoal, isGenerating }: { locale: Locale; onStartGoal: (goal: string) => void; isGenerating: boolean }) {
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
