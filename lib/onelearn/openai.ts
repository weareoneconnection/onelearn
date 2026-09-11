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
};

export class OpenAIConfigurationError extends Error {}
export class OpenAIResponseError extends Error {}

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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new OpenAIConfigurationError("OPENAI_API_KEY is not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new OpenAIResponseError("OpenAI request timed out");
    throw new OpenAIResponseError("OpenAI request failed");
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => null) as OpenAIResponse | null;
  if (!response.ok) throw new OpenAIResponseError(payload?.error?.message || `OpenAI returned HTTP ${response.status}`);
  if (!payload) throw new OpenAIResponseError("OpenAI returned an unreadable response");
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
    };
  } catch {
    throw new OpenAIResponseError("OpenAI returned invalid JSON");
  }
}
