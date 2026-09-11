import type { D1Database, D1Result } from "@cloudflare/workers-types";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import { assertSourceCapacity, BillingLimitError, consumeAiCredits, getBillingAdminMetrics, refundAiCredits, type BillableAction } from "./billing";
import type { GeneratedCourseBundle } from "./generated-course";
import { clientIpFromHeaders, hashClientKey } from "./identity";
import { getClerkLearner } from "./clerk-auth";
import { listFeedback } from "./feedback";

export type LearnerIdentity = {
  userId: string;
  email: string;
  displayName: string;
  mode: "chatgpt" | "clerk" | "device";
  /** Hashed client IP; set for device learners to enforce the per-IP anonymous cap. */
  clientKey?: string;
};

export type SourceRecord = {
  id: string;
  name: string;
  sourceKind: "file" | "text" | "web";
  mimeType: string;
  sizeBytes: number;
  sourceUrl: string | null;
  openaiFileId: string | null;
  vectorStoreId: string | null;
  status: "processing" | "ready" | "failed";
  createdAt: number;
};

export class UsageLimitError extends Error {
  readonly code: "daily_request_limit" | "daily_token_limit" | "monthly_credit_limit" | "source_limit" | "source_storage_limit";
  constructor(code: UsageLimitError["code"]) {
    super(code);
    this.code = code;
  }
}

const memory = globalThis as typeof globalThis & {
  __onelearnMemory?: {
    workspaces: Map<string, { locale: "zh" | "en"; course: unknown; bundle: GeneratedCourseBundle; version: number }>;
    sources: Map<string, SourceRecord[]>;
    usage: Map<string, { requests: number; inputTokens: number; outputTokens: number; failures: number }>;
  };
};

const memoryStore = memory.__onelearnMemory ??= {
  workspaces: new Map(),
  sources: new Map(),
  usage: new Map(),
};

const anonymousMemoryUsage = new Map<string, number>();

const nowSeconds = () => Math.floor(Date.now() / 1000);
const today = () => new Date().toISOString().slice(0, 10);
const safeJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
};

export async function resolveLearner(request: Request, locale: "zh" | "en" = "zh"): Promise<LearnerIdentity> {
  const chatgptUser = await getChatGPTUser();
  const clerkUser = chatgptUser ? null : await getClerkLearner(request);
  if (clerkUser) {
    const learner: LearnerIdentity = { ...clerkUser, mode: "clerk" };
    await ensureUser(learner, locale);
    return learner;
  }
  const deviceId = request.headers.get("x-onelearn-device-id")?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
  const learner: LearnerIdentity = chatgptUser ? {
    userId: chatgptUser.userId,
    email: chatgptUser.email,
    displayName: chatgptUser.displayName,
    mode: "chatgpt",
  } : {
    userId: `device:${deviceId}`,
    email: `device-${deviceId}@local.invalid`,
    displayName: locale === "zh" ? "设备学习者" : "Device learner",
    mode: "device",
    clientKey: await hashClientKey(clientIpFromHeaders(request.headers)),
  };
  await ensureUser(learner, locale);
  return learner;
}

async function ensureUser(learner: LearnerIdentity, locale: "zh" | "en") {
  const db = await getD1();
  if (!db) return;
  const now = nowSeconds();
  await db.prepare(`INSERT INTO users (id, email, display_name, locale, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      locale = excluded.locale, last_seen_at = excluded.last_seen_at`)
    .bind(learner.userId, learner.email, learner.displayName, locale, now, now).run();
}

export async function loadWorkspace(learner: LearnerIdentity) {
  const db = await getD1();
  if (!db) {
    const workspace = memoryStore.workspaces.get(learner.userId);
    return {
      storage: "ephemeral" as const,
      locale: workspace?.locale ?? "zh",
      ...workspace,
      stats: { courseVersions: workspace ? 1 : 0, learningEvents: 0, sources: memoryStore.sources.get(learner.userId)?.length ?? 0, averageQuality: workspace?.bundle.quality?.overallScore ?? 0, dueReviews: 0 },
    };
  }
  const preference = await db.prepare("SELECT locale, active_course_version_id AS activeCourseVersionId FROM user_preferences WHERE user_id = ?")
    .bind(learner.userId).first<{ locale: "zh" | "en"; activeCourseVersionId: string | null }>();
  const course = preference?.activeCourseVersionId
    ? await db.prepare(`SELECT id, version, course_json AS courseJson, bundle_json AS bundleJson
        FROM course_versions WHERE id = ? AND user_id = ?`).bind(preference.activeCourseVersionId, learner.userId).first<{ id: string; version: number; courseJson: string; bundleJson: string }>()
    : await db.prepare(`SELECT id, version, course_json AS courseJson, bundle_json AS bundleJson
        FROM course_versions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`).bind(learner.userId).first<{ id: string; version: number; courseJson: string; bundleJson: string }>();
  const [courses, events, sources, quality, reviews] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM course_versions WHERE user_id = ?").bind(learner.userId),
    db.prepare("SELECT COUNT(*) AS count FROM learning_events WHERE user_id = ?").bind(learner.userId),
    db.prepare("SELECT COUNT(*) AS count FROM source_documents WHERE user_id = ? AND status = 'ready'").bind(learner.userId),
    db.prepare("SELECT AVG(quality_score) AS average FROM course_versions WHERE user_id = ? AND quality_score IS NOT NULL").bind(learner.userId),
    db.prepare("SELECT COUNT(*) AS count FROM mastery_records WHERE user_id = ? AND next_review_at <= ?").bind(learner.userId, nowSeconds()),
  ]);
  return {
    storage: "durable" as const,
    locale: preference?.locale ?? "zh",
    courseVersionId: course?.id ?? null,
    version: course?.version ?? null,
    course: safeJson(course?.courseJson),
    bundle: safeJson<GeneratedCourseBundle>(course?.bundleJson),
    stats: {
      courseVersions: Number((courses.results?.[0] as CountRow | undefined)?.count ?? 0),
      learningEvents: Number((events.results?.[0] as CountRow | undefined)?.count ?? 0),
      sources: Number((sources.results?.[0] as CountRow | undefined)?.count ?? 0),
      averageQuality: Number((quality.results?.[0] as AverageRow | undefined)?.average ?? 0),
      dueReviews: Number((reviews.results?.[0] as CountRow | undefined)?.count ?? 0),
    },
  };
}

/** The stored bundle of a course version owned by this learner, or null. */
export async function getOwnedCourseBundle(learner: LearnerIdentity, courseVersionId: string): Promise<GeneratedCourseBundle | null> {
  const db = await getD1();
  if (!db) {
    const workspace = memoryStore.workspaces.get(learner.userId);
    return workspace?.bundle.generation.courseVersionId === courseVersionId ? workspace.bundle : null;
  }
  const row = await db.prepare("SELECT bundle_json AS bundleJson FROM course_versions WHERE id = ? AND user_id = ?")
    .bind(courseVersionId, learner.userId).first<{ bundleJson: string }>();
  return safeJson<GeneratedCourseBundle>(row?.bundleJson);
}

export async function savePreference(learner: LearnerIdentity, locale: "zh" | "en", activeCourseVersionId?: string | null) {
  const db = await getD1();
  if (!db) {
    const current = memoryStore.workspaces.get(learner.userId);
    if (current) current.locale = locale;
    return "ephemeral" as const;
  }
  await db.prepare(`INSERT INTO user_preferences (user_id, locale, active_course_version_id, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET locale = excluded.locale,
      active_course_version_id = COALESCE(excluded.active_course_version_id, user_preferences.active_course_version_id),
      updated_at = excluded.updated_at`)
    .bind(learner.userId, locale, activeCourseVersionId ?? null, nowSeconds()).run();
  return "durable" as const;
}

export async function saveCourseVersion(args: {
  learner: LearnerIdentity;
  catalogCourseId: string;
  locale: "zh" | "en";
  title: string;
  course: unknown;
  bundle: GeneratedCourseBundle;
  grounding: string;
  vectorStoreId?: string | null;
  qualityScore?: number | null;
  qualityStatus?: "passed" | "review" | "blocked";
  activate?: boolean;
}) {
  const db = await getD1();
  const id = crypto.randomUUID();
  if (!db) {
    const version = (memoryStore.workspaces.get(args.learner.userId)?.version ?? 0) + 1;
    const bundle: GeneratedCourseBundle = { ...args.bundle, generation: { ...args.bundle.generation, courseVersionId: id, version, storage: "ephemeral" } };
    if (args.activate !== false) memoryStore.workspaces.set(args.learner.userId, { locale: args.locale, course: args.course, bundle, version });
    return { id, version, storage: "ephemeral" as const, bundle };
  }
  const row = await db.prepare(`SELECT COALESCE(MAX(version), 0) AS version FROM course_versions
    WHERE user_id = ? AND catalog_course_id = ? AND locale = ?`)
    .bind(args.learner.userId, args.catalogCourseId, args.locale).first<{ version: number }>();
  const version = Number(row?.version ?? 0) + 1;
  const now = nowSeconds();
  const bundle: GeneratedCourseBundle = { ...args.bundle, generation: { ...args.bundle.generation, courseVersionId: id, version, storage: "durable" } };
  const writes = [db.prepare(`INSERT INTO course_versions
      (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding,
       vector_store_id, response_id, model, quality_score, quality_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, args.learner.userId, args.catalogCourseId, args.locale, version, args.title,
        JSON.stringify(args.course), JSON.stringify(bundle), args.grounding, args.vectorStoreId ?? null,
        bundle.generation.responseId, bundle.generation.model, args.qualityScore ?? null,
        args.qualityStatus ?? "review", now)];
  if (args.activate !== false) writes.push(db.prepare(`INSERT INTO user_preferences (user_id, locale, active_course_version_id, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET locale = excluded.locale,
        active_course_version_id = excluded.active_course_version_id, updated_at = excluded.updated_at`)
      .bind(args.learner.userId, args.locale, id, now));
  await db.batch(writes);
  return { id, version, storage: "durable" as const, bundle };
}

export async function saveQualityReport(courseVersionId: string, evaluatorModel: string, report: { overallScore: number; status: "passed" | "review" | "blocked" }) {
  const db = await getD1();
  if (!db) return;
  await db.prepare(`INSERT INTO quality_reports
    (id, course_version_id, evaluator_model, overall_score, report_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), courseVersionId, evaluatorModel, report.overallScore, JSON.stringify(report), report.status, nowSeconds()).run();
}

export async function recordLearningEvent(learner: LearnerIdentity, eventType: string, payload: unknown, courseVersionId?: string | null) {
  const db = await getD1();
  if (!db) return;
  const ownedId = await ownedCourseVersionId(db, learner, courseVersionId);
  await db.prepare(`INSERT INTO learning_events (id, user_id, course_version_id, event_type, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), learner.userId, ownedId, eventType, JSON.stringify(payload), nowSeconds()).run();
}

export async function saveSourceRecord(learner: LearnerIdentity, source: SourceRecord & { objectKey?: string | null }) {
  const db = await getD1();
  if (!db) {
    memoryStore.sources.set(learner.userId, [source, ...(memoryStore.sources.get(learner.userId) ?? [])]);
    return "ephemeral" as const;
  }
  await db.prepare(`INSERT INTO source_documents
    (id, user_id, name, source_kind, mime_type, size_bytes, source_url, object_key,
     openai_file_id, vector_store_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(source.id, learner.userId, source.name, source.sourceKind, source.mimeType, source.sizeBytes,
      source.sourceUrl, source.objectKey ?? null, source.openaiFileId, source.vectorStoreId, source.status, source.createdAt).run();
  return "durable" as const;
}

export async function listSources(learner: LearnerIdentity) {
  const db = await getD1();
  if (!db) return { storage: "ephemeral" as const, sources: memoryStore.sources.get(learner.userId) ?? [] };
  const result = await db.prepare(`SELECT id, name, source_kind AS sourceKind, mime_type AS mimeType,
      size_bytes AS sizeBytes, source_url AS sourceUrl, openai_file_id AS openaiFileId,
      vector_store_id AS vectorStoreId, status, created_at AS createdAt
    FROM source_documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`)
    .bind(learner.userId).all<SourceRecord>();
  return { storage: "durable" as const, sources: result.results ?? [] };
}

export async function getLearnerVectorStore(learner: LearnerIdentity) {
  const db = await getD1();
  if (!db) return memoryStore.sources.get(learner.userId)?.find((source: SourceRecord) => source.vectorStoreId)?.vectorStoreId ?? null;
  const row = await db.prepare(`SELECT vector_store_id AS vectorStoreId FROM source_documents
    WHERE user_id = ? AND vector_store_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(learner.userId).first<{ vectorStoreId: string }>();
  return row?.vectorStoreId ?? null;
}

function numericEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function reserveAiUsage(learner: LearnerIdentity, plannedTokens = 0, action?: BillableAction) {
  const requestLimit = numericEnv("ONELEARN_DAILY_AI_REQUESTS", 40);
  const tokenLimit = numericEnv("ONELEARN_DAILY_TOKEN_BUDGET", 250_000);
  const anonymousLimit = numericEnv("ONELEARN_ANONYMOUS_DAILY_AI_REQUESTS_PER_IP", 15);
  const anonymousKey = learner.mode === "device" ? learner.clientKey ?? "unknown" : null;
  const day = today();
  if (plannedTokens > tokenLimit) throw new UsageLimitError("daily_token_limit");
  const toUsageLimit = (error: unknown) => error instanceof BillingLimitError ? new UsageLimitError(error.code) : error;

  const db = await getD1();
  if (!db) {
    // Single-threaded in-memory checks: check everything first, then commit.
    const key = `${learner.userId}:${day}`;
    const usage = memoryStore.usage.get(key) ?? { requests: 0, inputTokens: 0, outputTokens: 0, failures: 0 };
    if (usage.requests >= requestLimit) throw new UsageLimitError("daily_request_limit");
    if (usage.inputTokens + usage.outputTokens + plannedTokens > tokenLimit) throw new UsageLimitError("daily_token_limit");
    const anonymousCount = anonymousKey ? anonymousMemoryUsage.get(`${anonymousKey}:${day}`) ?? 0 : 0;
    if (anonymousKey && anonymousCount >= anonymousLimit) throw new UsageLimitError("daily_request_limit");
    try { await consumeAiCredits(learner, action); } catch (error) { throw toUsageLimit(error); }
    usage.requests += 1;
    memoryStore.usage.set(key, usage);
    if (anonymousKey) anonymousMemoryUsage.set(`${anonymousKey}:${day}`, anonymousCount + 1);
    return { ...usage, requestLimit, tokenLimit, storage: "ephemeral" as const };
  }

  // Each counter is incremented by one conditional upsert, so concurrent requests cannot
  // overshoot a limit. Later failures roll back the counters already taken.
  const now = nowSeconds();
  const reserved = await db.prepare(`INSERT INTO usage_daily (id, user_id, day, requests, input_tokens, output_tokens, failures, updated_at)
    VALUES (?, ?, ?, 1, 0, 0, 0, ?)
    ON CONFLICT(user_id, day) DO UPDATE SET requests = usage_daily.requests + 1, updated_at = excluded.updated_at
    WHERE usage_daily.requests < ? AND usage_daily.input_tokens + usage_daily.output_tokens + ? <= ?`)
    .bind(crypto.randomUUID(), learner.userId, day, now, requestLimit, plannedTokens, tokenLimit).run();
  if (!reserved.meta.changes) {
    const usage = await db.prepare("SELECT requests FROM usage_daily WHERE user_id = ? AND day = ?")
      .bind(learner.userId, day).first<{ requests: number }>();
    throw new UsageLimitError((usage?.requests ?? 0) >= requestLimit ? "daily_request_limit" : "daily_token_limit");
  }
  const releaseDaily = () => db.prepare(`UPDATE usage_daily SET requests = MAX(0, requests - 1), updated_at = ?
    WHERE user_id = ? AND day = ?`).bind(nowSeconds(), learner.userId, day).run();
  const releaseAnonymous = () => anonymousKey ? db.prepare(`UPDATE anonymous_usage_daily SET requests = MAX(0, requests - 1), updated_at = ?
    WHERE client_key = ? AND day = ?`).bind(nowSeconds(), anonymousKey, day).run() : Promise.resolve();

  if (anonymousKey) {
    const anonymous = await db.prepare(`INSERT INTO anonymous_usage_daily (client_key, day, requests, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(client_key, day) DO UPDATE SET requests = anonymous_usage_daily.requests + 1, updated_at = excluded.updated_at
      WHERE anonymous_usage_daily.requests < ?`)
      .bind(anonymousKey, day, now, anonymousLimit).run();
    if (!anonymous.meta.changes) {
      await releaseDaily();
      throw new UsageLimitError("daily_request_limit");
    }
  }

  try {
    await consumeAiCredits(learner, action);
  } catch (error) {
    await Promise.all([releaseDaily(), releaseAnonymous()]).catch(() => undefined);
    throw toUsageLimit(error);
  }
  const usage = await db.prepare("SELECT requests FROM usage_daily WHERE user_id = ? AND day = ?")
    .bind(learner.userId, day).first<{ requests: number }>();
  return { requests: Number(usage?.requests ?? 1), requestLimit, tokenLimit, storage: "durable" as const };
}

/** Returns the id only if that course version belongs to the learner, so clients cannot attach data to other users' courses. */
async function ownedCourseVersionId(db: D1Database, learner: LearnerIdentity, courseVersionId?: string | null) {
  if (!courseVersionId) return null;
  const row = await db.prepare("SELECT id FROM course_versions WHERE id = ? AND user_id = ?")
    .bind(courseVersionId, learner.userId).first<{ id: string }>();
  return row?.id ?? null;
}

export async function reserveSourceCapacity(learner: LearnerIdentity, incomingBytes: number) {
  try { return await assertSourceCapacity(learner, incomingBytes); }
  catch (error) { if (error instanceof BillingLimitError) throw new UsageLimitError(error.code); throw error; }
}

export async function recordAiRun(args: {
  learner: LearnerIdentity;
  purpose: string;
  promptVersion: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  status: "success" | "failed" | "blocked";
  responseId?: string | null;
  errorCode?: string | null;
  courseVersionId?: string | null;
}) {
  const billableAction: BillableAction | undefined = args.purpose === "curriculum" ? "course_generation"
    : args.purpose === "lesson" ? "lesson_generation"
    : args.purpose === "tutor" ? "tutor_turn"
    : args.purpose === "source_index" ? "source_index"
    : undefined;
  if (args.status !== "success" && billableAction) await refundAiCredits(args.learner, billableAction).catch(() => undefined);
  const key = `${args.learner.userId}:${today()}`;
  const db = await getD1();
  if (!db) {
    const usage = memoryStore.usage.get(key) ?? { requests: 0, inputTokens: 0, outputTokens: 0, failures: 0 };
    usage.inputTokens += args.inputTokens ?? 0;
    usage.outputTokens += args.outputTokens ?? 0;
    if (args.status !== "success") usage.failures += 1;
    memoryStore.usage.set(key, usage);
    return;
  }
  const ownedId = await ownedCourseVersionId(db, args.learner, args.courseVersionId);
  await db.batch([
    db.prepare(`INSERT INTO ai_runs
      (id, user_id, purpose, model, prompt_version, input_tokens, output_tokens, latency_ms,
       status, response_id, error_code, course_version_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), args.learner.userId, args.purpose, args.model, args.promptVersion,
        args.inputTokens ?? 0, args.outputTokens ?? 0, args.latencyMs, args.status,
        args.responseId ?? null, args.errorCode ?? null, ownedId, nowSeconds()),
    db.prepare(`UPDATE usage_daily SET input_tokens = input_tokens + ?, output_tokens = output_tokens + ?,
      failures = failures + ?, updated_at = ? WHERE user_id = ? AND day = ?`)
      .bind(args.inputTokens ?? 0, args.outputTokens ?? 0, args.status === "success" ? 0 : 1,
        nowSeconds(), args.learner.userId, today()),
  ]);
}

export function isAdmin(learner: LearnerIdentity) {
  const allowed = (process.env.ONELEARN_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(learner.email.toLowerCase());
}

type CountRow = { count: number };
type AverageRow = { average: number | null };

async function firstCount(result: D1Result<unknown>) {
  return Number((result.results?.[0] as CountRow | undefined)?.count ?? 0);
}

export async function getAdminSnapshot(db: D1Database) {
  const since = nowSeconds() - 7 * 24 * 60 * 60;
  const [users, courses, sources, runs, failures, tokens, quality, active, queue] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM users"),
    db.prepare("SELECT COUNT(*) AS count FROM course_versions"),
    db.prepare("SELECT COUNT(*) AS count FROM source_documents WHERE status = 'ready'"),
    db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE created_at >= ?").bind(since),
    db.prepare("SELECT COUNT(*) AS count FROM ai_runs WHERE created_at >= ? AND status != 'success'").bind(since),
    db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS count FROM ai_runs WHERE created_at >= ?").bind(since),
    db.prepare("SELECT AVG(overall_score) AS average FROM quality_reports WHERE created_at >= ?").bind(since),
    db.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM learning_events WHERE created_at >= ?").bind(since),
    db.prepare(`SELECT cv.id, cv.title, cv.version, cv.locale, cv.quality_score AS qualityScore,
        cv.quality_status AS qualityStatus, cv.created_at AS createdAt, u.email
      FROM course_versions cv JOIN users u ON u.id = cv.user_id
      WHERE cv.quality_status != 'passed' ORDER BY cv.created_at DESC LIMIT 12`),
  ]);
  const [verifiedNodes, answers] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM mastery_records WHERE unassisted_passes >= 1 AND review_passes >= 1"),
    db.prepare("SELECT COUNT(*) AS count FROM learning_events WHERE created_at >= ? AND event_type IN ('practice_answered', 'review_completed')").bind(since),
  ]);
  const feedback = await listFeedback(db);
  const billing = await getBillingAdminMetrics();
  return {
    storage: "durable" as const,
    metrics: {
      users: await firstCount(users), courses: await firstCount(courses), sources: await firstCount(sources),
      aiRuns7d: await firstCount(runs), failedRuns7d: await firstCount(failures), tokens7d: await firstCount(tokens),
      activeLearners7d: await firstCount(active),
      averageQuality: Number((quality.results?.[0] as AverageRow | undefined)?.average ?? 0),
      verifiedNodes: await firstCount(verifiedNodes),
      answers7d: await firstCount(answers),
      openFeedback: feedback.open,
      ...billing,
    },
    feedback: feedback.items,
    qualityQueue: queue.results ?? [],
  };
}
