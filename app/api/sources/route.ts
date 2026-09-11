import { NextRequest, NextResponse } from "next/server";
import { getSourceBucket } from "@/db";
import {
  addFileToVectorStore,
  createVectorStore,
  isOpenAIConfigured,
  OpenAIConfigurationError,
  OpenAIResponseError,
  uploadOpenAIFile,
  waitForVectorStoreFile,
} from "@/lib/onelearn/openai";
import {
  getLearnerVectorStore,
  listSources,
  recordAiRun,
  reserveAiUsage,
  reserveSourceCapacity,
  resolveLearner,
  saveSourceRecord,
  UsageLimitError,
} from "@/lib/onelearn/persistence";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const supportedExtensions = new Set(["c", "cpp", "cs", "css", "doc", "docx", "go", "html", "java", "js", "json", "md", "pdf", "php", "pptx", "py", "rb", "sh", "tex", "ts", "txt"]);

function localeFrom(request: NextRequest) {
  return request.nextUrl.searchParams.get("locale") === "en" ? "en" as const : "zh" as const;
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-160) || "source.txt";
}

export async function GET(request: NextRequest) {
  const locale = localeFrom(request);
  const learner = await resolveLearner(request, locale);
  return NextResponse.json(await listSources(learner));
}

export async function POST(request: NextRequest) {
  const locale = localeFrom(request);
  const learner = await resolveLearner(request, locale);
  const startedAt = Date.now();
  let reserved = false;
  try {
    if (!isOpenAIConfigured()) throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured");
    const contentType = request.headers.get("content-type") ?? "";
    let upload: File;
    let sourceKind: "file" | "text" | "web" = "file";
    let sourceUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const candidate = form.get("file");
      if (!(candidate instanceof File)) throw new Error("missing_file");
      upload = candidate;
      sourceUrl = typeof form.get("sourceUrl") === "string" ? String(form.get("sourceUrl")).slice(0, 2_000) : null;
    } else {
      const body = await request.json().catch(() => null) as { name?: string; text?: string; sourceUrl?: string } | null;
      const text = body?.text?.trim();
      if (!text) throw new Error("missing_text");
      if (new TextEncoder().encode(text).byteLength > MAX_SOURCE_BYTES) throw new Error("source_too_large");
      const name = safeFilename(body?.name?.trim() || "learning-source.txt");
      upload = new File([text], name.endsWith(".txt") || name.endsWith(".md") ? name : `${name}.txt`, { type: "text/plain;charset=utf-8" });
      sourceKind = body?.sourceUrl ? "web" : "text";
      sourceUrl = body?.sourceUrl?.slice(0, 2_000) ?? null;
    }

    if (upload.size <= 0 || upload.size > MAX_SOURCE_BYTES) throw new Error("source_too_large");
    const extension = upload.name.split(".").pop()?.toLowerCase() ?? "";
    if (!supportedExtensions.has(extension)) throw new Error("unsupported_file");
    await reserveSourceCapacity(learner, upload.size);
    await reserveAiUsage(learner, 0, "source_index");
    reserved = true;

    const sourceId = crypto.randomUUID();
    const vectorStoreId = await getLearnerVectorStore(learner)
      ?? (await createVectorStore(`OneLearn · ${learner.userId.slice(0, 40)}`)).id;
    const openaiFile = await uploadOpenAIFile(upload);
    await addFileToVectorStore(vectorStoreId, openaiFile.id);
    const vectorStatus = await waitForVectorStoreFile(vectorStoreId, openaiFile.id);
    const status = vectorStatus === "completed" ? "ready" as const : vectorStatus === "failed" || vectorStatus === "cancelled" ? "failed" as const : "processing" as const;
    const bucket = await getSourceBucket();
    const objectKey = `${learner.userId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${sourceId}/${safeFilename(upload.name)}`;
    if (bucket) await bucket.put(objectKey, await upload.arrayBuffer(), { httpMetadata: { contentType: upload.type || "application/octet-stream" } });
    const record = {
      id: sourceId,
      name: upload.name,
      sourceKind,
      mimeType: upload.type || "application/octet-stream",
      sizeBytes: upload.size,
      sourceUrl,
      objectKey: bucket ? objectKey : null,
      openaiFileId: openaiFile.id,
      vectorStoreId,
      status,
      createdAt: Math.floor(Date.now() / 1000),
    };
    const storage = await saveSourceRecord(learner, record);
    await recordAiRun({ learner, purpose: "source_index", promptVersion: "source-index-v1", model: "openai-file-search", latencyMs: Date.now() - startedAt, status: status === "failed" ? "failed" : "success", responseId: openaiFile.id });
    return NextResponse.json({ source: record, storage }, { status: 201 });
  } catch (error) {
    if (reserved) await recordAiRun({ learner, purpose: "source_index", promptVersion: "source-index-v1", model: "openai-file-search", latencyMs: Date.now() - startedAt, status: "failed", errorCode: error instanceof Error ? error.message.slice(0, 100) : "unknown" });
    if (error instanceof UsageLimitError) {
      const limits: Record<string, { zh: string; en: string }> = {
        monthly_credit_limit: { zh: "本月 AI 点数已用完，请升级套餐或等待下月重置", en: "Your monthly AI credits are used up. Upgrade or wait for the monthly reset" },
        source_limit: { zh: "当前套餐的资料数量已达上限", en: "Your plan's source count limit has been reached" },
        source_storage_limit: { zh: "当前套餐的资料容量已达上限", en: "Your plan's source storage limit has been reached" },
      };
      return NextResponse.json({ error: limits[error.code]?.[locale] ?? (locale === "zh" ? "AI 用量已达上限" : "AI usage limit has been reached"), code: error.code }, { status: 429 });
    }
    if (error instanceof OpenAIConfigurationError) return NextResponse.json({ error: locale === "zh" ? "尚未配置 OpenAI API 密钥" : "The OpenAI API key is not configured", code: "configuration_required" }, { status: 503 });
    if (error instanceof OpenAIResponseError) {
      console.error("Source indexing failed:", error.message);
      return NextResponse.json({ error: locale === "zh" ? "OpenAI 暂时无法索引资料" : "OpenAI could not index the source", code: "provider_error" }, { status: 502 });
    }
    const code = error instanceof Error ? error.message : "source_failed";
    const messages: Record<string, { zh: string; en: string }> = {
      missing_file: { zh: "请选择资料文件", en: "Choose a source file" },
      missing_text: { zh: "请粘贴资料正文", en: "Paste the source text" },
      source_too_large: { zh: "资料不能为空且不能超过 15 MB", en: "The source must be under 15 MB" },
      unsupported_file: { zh: "当前文件格式不支持检索", en: "This file type is not supported for retrieval" },
    };
    return NextResponse.json({ error: messages[code]?.[locale] ?? (locale === "zh" ? "资料索引失败，请稍后重试" : "Source indexing failed. Please try again."), code }, { status: 400 });
  }
}
