import type { D1Database } from "@cloudflare/workers-types";
import { PLAN_CATALOG, type PlanId } from "./billing";

// Monthly voice allowance, metered in seconds under entitlement_usage metric 'voice_seconds'.
// A session reserves up to MAX_SESSION_SECONDS at start (one conditional upsert, so parallel
// starts cannot overshoot) and returns the unused part on end, using server time.

export const MAX_SESSION_SECONDS = 10 * 60;
export const MIN_SESSION_SECONDS = 30;

export class VoiceLimitError extends Error {
  constructor() { super("voice_minutes_used"); }
}

const monthOf = (now: number) => new Date(now * 1000).toISOString().slice(0, 7);

export function voiceLimitSeconds(planId: PlanId) {
  return PLAN_CATALOG[planId].voiceMinutes * 60;
}

export async function voiceUsage(db: D1Database, userId: string, planId: PlanId, now: number) {
  const row = await db.prepare("SELECT quantity FROM entitlement_usage WHERE user_id = ? AND month = ? AND metric = 'voice_seconds'")
    .bind(userId, monthOf(now)).first<{ quantity: number }>();
  const usedSeconds = Number(row?.quantity ?? 0);
  const limitSeconds = voiceLimitSeconds(planId);
  return { usedSeconds, limitSeconds, remainingSeconds: Math.max(0, limitSeconds - usedSeconds) };
}

export async function startVoiceSession(db: D1Database, args: { userId: string; planId: PlanId; courseVersionId: string | null; lessonId: string | null; now: number }) {
  const { remainingSeconds, limitSeconds } = await voiceUsage(db, args.userId, args.planId, args.now);
  const reserve = Math.min(MAX_SESSION_SECONDS, remainingSeconds);
  if (reserve < MIN_SESSION_SECONDS) throw new VoiceLimitError();
  const month = monthOf(args.now);
  const reserved = await db.prepare(`INSERT INTO entitlement_usage (id, user_id, month, metric, quantity, updated_at)
    VALUES (?, ?, ?, 'voice_seconds', ?, ?)
    ON CONFLICT(user_id, month, metric) DO UPDATE SET
      quantity = entitlement_usage.quantity + excluded.quantity, updated_at = excluded.updated_at
    WHERE entitlement_usage.quantity + excluded.quantity <= ?`)
    .bind(crypto.randomUUID(), args.userId, month, reserve, args.now, limitSeconds).run();
  if (!reserved.meta.changes) throw new VoiceLimitError();
  const sessionId = crypto.randomUUID();
  await db.prepare(`INSERT INTO voice_sessions (id, user_id, course_version_id, lesson_id, month, reserved_seconds, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(sessionId, args.userId, args.courseVersionId, args.lessonId, month, reserve, args.now).run();
  return { sessionId, reservedSeconds: reserve, remainingSeconds: remainingSeconds - reserve };
}

type SessionRow = { reservedSeconds: number; startedAt: number; endedAt: number | null; usedSeconds: number | null; month: string; courseVersionId: string | null; lessonId: string | null };

/** Charges elapsed server time (capped by the reservation) and refunds the rest. Safe to call twice. */
export async function endVoiceSession(db: D1Database, args: { sessionId: string; userId: string; now: number; chargeNothing?: boolean }) {
  const session = await db.prepare(`SELECT reserved_seconds AS reservedSeconds, started_at AS startedAt, ended_at AS endedAt,
      used_seconds AS usedSeconds, month, course_version_id AS courseVersionId, lesson_id AS lessonId
    FROM voice_sessions WHERE id = ? AND user_id = ?`).bind(args.sessionId, args.userId).first<SessionRow>();
  if (!session) return null;
  if (session.endedAt) return { usedSeconds: Number(session.usedSeconds ?? 0), alreadyEnded: true, courseVersionId: session.courseVersionId, lessonId: session.lessonId };
  const used = args.chargeNothing ? 0 : Math.min(session.reservedSeconds, Math.max(0, args.now - session.startedAt));
  const closed = await db.prepare("UPDATE voice_sessions SET ended_at = ?, used_seconds = ? WHERE id = ? AND ended_at IS NULL")
    .bind(args.now, used, args.sessionId).run();
  if (!closed.meta.changes) return { usedSeconds: used, alreadyEnded: true, courseVersionId: session.courseVersionId, lessonId: session.lessonId };
  const refund = session.reservedSeconds - used;
  if (refund > 0) {
    await db.prepare(`UPDATE entitlement_usage SET quantity = MAX(0, quantity - ?), updated_at = ?
      WHERE user_id = ? AND month = ? AND metric = 'voice_seconds'`).bind(refund, args.now, args.userId, session.month).run();
  }
  return { usedSeconds: used, alreadyEnded: false, courseVersionId: session.courseVersionId, lessonId: session.lessonId };
}
