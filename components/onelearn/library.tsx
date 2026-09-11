"use client";

import { useEffect, useState } from "react";
import { Database, FileText, FolderOpen, LoaderCircle, TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type Locale, pick } from "@/lib/onelearn/i18n";
import { oneLearnFetch } from "./client";
import type { SourceItem } from "./types";
import { PageHeading } from "./ui";

export function LibraryView({ locale }: { locale: Locale }) {
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
