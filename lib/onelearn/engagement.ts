import type { D1Database } from "@cloudflare/workers-types";

const DAY = 86_400;
const ACTIVE_EVENTS = "'lesson_started', 'practice_answered', 'review_completed', 'tutor_turn'";

/** Consecutive active days ending today (or yesterday, so a streak survives until the day is over). Days are UTC day numbers. */
export function computeStreak(activeDays: number[], today: number) {
  const days = new Set(activeDays);
  const activeToday = days.has(today);
  let cursor = activeToday ? today : today - 1;
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor -= 1;
  }
  return { current, activeToday };
}

export type Engagement = { streak: { current: number; activeToday: boolean }; week: { answers: number; correct: number } };

export async function getEngagement(db: D1Database | null, userId: string, now: number): Promise<Engagement> {
  if (!db) return { streak: { current: 0, activeToday: false }, week: { answers: 0, correct: 0 } };
  const [days, week] = await db.batch([
    db.prepare(`SELECT DISTINCT CAST(created_at / ${DAY} AS INTEGER) AS day FROM learning_events
      WHERE user_id = ? AND created_at >= ? AND event_type IN (${ACTIVE_EVENTS})`).bind(userId, now - 120 * DAY),
    db.prepare(`SELECT COUNT(*) AS answers,
        COALESCE(SUM(CASE WHEN json_extract(payload_json, '$.correct') = 1 THEN 1 ELSE 0 END), 0) AS correct
      FROM learning_events WHERE user_id = ? AND created_at >= ? AND event_type IN ('practice_answered', 'review_completed')`).bind(userId, now - 7 * DAY),
  ]);
  const activeDays = ((days.results ?? []) as Array<{ day: number }>).map((row) => Number(row.day));
  const weekRow = (week.results?.[0] ?? {}) as { answers?: number; correct?: number };
  return {
    streak: computeStreak(activeDays, Math.floor(now / DAY)),
    week: { answers: Number(weekRow.answers ?? 0), correct: Number(weekRow.correct ?? 0) },
  };
}
