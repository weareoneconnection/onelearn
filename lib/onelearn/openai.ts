type ResponseContent =
  | { type: "output_text"; text: string }
  | { type: "refusal"; refusal: string }
  | { type: string; [key: string]: unknown };

type OpenAIResponse = {
  id?: string;
  model?: string;
  status?: string;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output?: Array<{ type?: string; content?: ResponseContent[] }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
};

export class OpenAIConfigurationError extends Error {}
export class OpenAIResponseError extends Error {
  constructor(message: string, public readonly statusCode = 502, public readonly requestId: string | null = null) {
    super(message);
  }
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function outputText(response: OpenAIResponse) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "refusal") {
        throw new OpenAIResponseError(typeof content.refusal === "string" ? content.refusal : "The request was refused.");
      }
      if (content.type === "output_text" && typeof content.text === "string" && content.text) return content.text;
    }
  }
  return null;
}

const OPENAI_API_BASE = "https://api.openai.com/v1";
const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

function apiKey() {
  const value = process.env.OPENAI_API_KEY?.trim();
  if (!value) throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured");
  return value;
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function openAIRequest<T>(path: string, init: RequestInit, timeoutMs = 90_000): Promise<{ data: T; requestId: string | null }> {
  let lastError: OpenAIResponseError | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${OPENAI_API_BASE}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          ...init.headers,
        },
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null) as T & { error?: { message?: string } } | null;
      const requestId = response.headers.get("x-request-id");
      if (response.ok && data) return { data, requestId };
      const error = new OpenAIResponseError(data?.error?.message || `OpenAI returned HTTP ${response.status}`, response.status, requestId);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === 2) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof OpenAIConfigurationError || error instanceof OpenAIResponseError && !RETRYABLE_STATUS.has(error.statusCode)) throw error;
      lastError = error instanceof OpenAIResponseError
        ? error
        : new OpenAIResponseError(error instanceof Error && error.name === "AbortError" ? "OpenAI request timed out" : "OpenAI request failed");
      if (attempt === 2) throw lastError;
    } finally {
      clearTimeout(timeout);
    }
    await delay(300 * (2 ** attempt));
  }
  throw lastError ?? new OpenAIResponseError("OpenAI request failed");
}

export async function createStructuredResponse<T>({
  name,
  schema,
  instructions,
  input,
  maxOutputTokens,
  promptCacheKey,
}: {
  name: string;
  schema: Record<string, unknown>;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  promptCacheKey: string;
}) {
  const startedAt = Date.now();
  const { data: payload, requestId } = await openAIRequest<OpenAIResponse>("/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        store: false,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
        prompt_cache_key: promptCacheKey,
        text: {
          format: {
            type: "json_schema",
            name,
            strict: true,
            schema,
          },
        },
      }),
    });
  if (payload.status === "incomplete") {
    throw new OpenAIResponseError(`OpenAI response was incomplete: ${payload.incomplete_details?.reason ?? "unknown"}`);
  }

  const text = outputText(payload);
  if (!text) throw new OpenAIResponseError("OpenAI returned no structured output");
  try {
    return {
      data: JSON.parse(text) as T,
      responseId: payload.id ?? "unknown",
      model: payload.model ?? getOpenAIModel(),
      requestId,
      latencyMs: Date.now() - startedAt,
      usage: {
        inputTokens: payload.usage?.input_tokens ?? 0,
        outputTokens: payload.usage?.output_tokens ?? 0,
        totalTokens: payload.usage?.total_tokens ?? 0,
      },
    };
  } catch {
    throw new OpenAIResponseError("OpenAI returned invalid JSON");
  }
}

type OpenAIFile = { id: string; filename?: string; bytes?: number };
type VectorStore = { id: string };
type VectorStoreFile = { id?: string; status?: "in_progress" | "completed" | "cancelled" | "failed" };
type VectorSearchResponse = {
  data?: Array<{
    file_id?: string;
    filename?: string;
    score?: number;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

export async function uploadOpenAIFile(file: File) {
  const form = new FormData();
  form.set("purpose", "assistants");
  form.set("file", file, file.name);
  return (await openAIRequest<OpenAIFile>("/files", { method: "POST", body: form }, 120_000)).data;
}

export async function createVectorStore(name: string) {
  return (await openAIRequest<VectorStore>("/vector_stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })).data;
}

export async function addFileToVectorStore(vectorStoreId: string, fileId: string) {
  return (await openAIRequest<VectorStoreFile>(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  })).data;
}

export async function getVectorStoreFile(vectorStoreId: string, fileId: string) {
  return (await openAIRequest<VectorStoreFile>(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(fileId)}`, {
    method: "GET",
  }, 30_000)).data;
}

export async function waitForVectorStoreFile(vectorStoreId: string, fileId: string, maxWaitMs = 8_000) {
  const deadline = Date.now() + maxWaitMs;
  let status: VectorStoreFile["status"] = "in_progress";
  while (Date.now() < deadline) {
    const item = await getVectorStoreFile(vectorStoreId, fileId);
    status = item.status;
    if (status === "completed" || status === "failed" || status === "cancelled") break;
    await delay(750);
  }
  return status;
}

export async function searchVectorStore(vectorStoreId: string, query: string, maxResults = 6) {
  const response = (await openAIRequest<VectorSearchResponse>(`/vector_stores/${encodeURIComponent(vectorStoreId)}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_num_results: maxResults, rewrite_query: true }),
  })).data;
  return (response.data ?? []).map((result) => ({
    fileId: result.file_id ?? "unknown",
    filename: result.filename ?? "Untitled source",
    score: result.score ?? 0,
    excerpt: (result.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").slice(0, 6_000),
  })).filter((result) => result.excerpt);
}

export function getRealtimeModel() {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1";
}

/** Short-lived client secret the browser uses to open a Realtime (WebRTC) session; the API key never leaves the server. */
export async function createRealtimeClientSecret(session: Record<string, unknown>, expiresSeconds = 60) {
  const { data } = await openAIRequest<{ value?: string; expires_at?: number }>("/realtime/client_secrets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: expiresSeconds }, session }),
  }, 20_000);
  if (!data.value) throw new OpenAIResponseError("OpenAI did not return a realtime client secret");
  return { value: data.value, expiresAt: data.expires_at ?? null };
}
