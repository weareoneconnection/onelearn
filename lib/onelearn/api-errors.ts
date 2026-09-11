import { NextResponse } from "next/server";

// Uniform failure handling for API routes: unexpected errors become a JSON body
// with a stable code (instead of an empty 500), are logged as structured JSON,
// and are forwarded to Sentry when SENTRY_DSN is configured.

type ErrorContext = { route: string; method?: string; code: string };

function errorName(error: unknown) {
  return error instanceof Error ? `${error.name} ${error.constructor?.name ?? ""}` : "";
}

export function isStorageError(error: unknown) {
  const text = `${errorName(error)} ${error instanceof Error ? error.message : String(error)}`;
  return /libsql|D1_|SQLITE|no such table|SERVER_ERROR|storage_unavailable/i.test(text);
}

function parseDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return { key: url.username, endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/` };
  } catch {
    return null;
  }
}

export async function reportError(error: unknown, context: ErrorContext) {
  const dsn = process.env.SENTRY_DSN?.trim();
  const target = dsn ? parseDsn(dsn) : null;
  if (!target) return;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  const event = {
    event_id: eventId,
    timestamp: now,
    level: "error",
    platform: "javascript",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    tags: { route: context.route, method: context.method ?? "", code: context.code },
    exception: { values: [{
      type: error instanceof Error ? error.name : "Error",
      value: error instanceof Error ? error.message : String(error),
      stacktrace: error instanceof Error && error.stack ? { frames: error.stack.split("\n").slice(1, 30).reverse().map((line) => ({ function: line.trim() })) } : undefined,
    }] },
  };
  const body = [JSON.stringify({ event_id: eventId, sent_at: now, dsn }), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
  await fetch(target.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${target.key}, sentry_client=onelearn/1.0` },
    body,
    signal: AbortSignal.timeout(2_000),
  }).catch(() => undefined);
}

export function withApiErrors<R extends Request, C>(route: string, handler: (request: R, context: C) => Promise<Response>) {
  return async (request: R, context: C) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const storage = isStorageError(error);
      const code = storage ? "storage_unavailable" : "internal_error";
      console.error(JSON.stringify({ level: "error", route, method: request.method, code, message: error instanceof Error ? error.message : String(error) }));
      await reportError(error, { route, method: request.method, code });
      return NextResponse.json({
        error: storage ? "数据存储暂时不可用，请稍后再试 / Storage is temporarily unavailable" : "服务器内部错误，请稍后再试 / Internal server error",
        code,
      }, { status: storage ? 503 : 500 });
    }
  };
}
