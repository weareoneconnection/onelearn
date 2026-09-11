import type { D1Database } from "@cloudflare/workers-types";
import { getD1 } from "@/db";
import type { LearnerIdentity } from "./persistence";

export const FEEDBACK_CATEGORIES = ["bug", "billing", "content", "suggestion", "other"] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];
export type FeedbackItem = {
  id: string;
  email: string;
  category: FeedbackCategory;
  message: string;
  page: string | null;
  status: "open" | "resolved";
  createdAt: number;
  resolvedAt: number | null;
};

export class FeedbackLimitError extends Error {
  constructor() { super("feedback_limit"); }
}

const DAILY_LIMIT = 5;
const nowSeconds = () => Math.floor(Date.now() / 1000);
const memory = globalThis as typeof globalThis & { __onelearnFeedback?: Array<FeedbackItem & { userId: string }> };
const memoryFeedback = memory.__onelearnFeedback ??= [];

export async function submitFeedback(learner: LearnerIdentity, input: { category: FeedbackCategory; message: string; page?: string | null; now?: number }) {
  const now = input.now ?? nowSeconds();
  const item: FeedbackItem = {
    id: crypto.randomUUID(), email: learner.email, category: input.category, message: input.message.trim(),
    page: input.page ?? null, status: "open", createdAt: now, resolvedAt: null,
  };
  const db = await getD1();
  if (!db) {
    const recent = memoryFeedback.filter((entry) => entry.userId === learner.userId && entry.createdAt > now - 86_400).length;
    if (recent >= DAILY_LIMIT) throw new FeedbackLimitError();
    memoryFeedback.unshift({ ...item, userId: learner.userId });
    return item;
  }
  // Single conditional insert so parallel submissions cannot exceed the daily limit.
  const result = await db.prepare(`INSERT INTO feedback (id, user_id, email, category, message, page, status, created_at)
    SELECT ?, ?, ?, ?, ?, ?, 'open', ?
    WHERE (SELECT COUNT(*) FROM feedback WHERE user_id = ? AND created_at > ?) < ?`)
    .bind(item.id, learner.userId, item.email, item.category, item.message, item.page, now, learner.userId, now - 86_400, DAILY_LIMIT).run();
  if (!result.meta.changes) throw new FeedbackLimitError();
  return item;
}

export async function listFeedback(db: D1Database | null, limit = 30): Promise<{ open: number; items: FeedbackItem[] }> {
  if (!db) return { open: memoryFeedback.filter((item) => item.status === "open").length, items: memoryFeedback.slice(0, limit) };
  const [open, items] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM feedback WHERE status = 'open'"),
    db.prepare(`SELECT id, email, category, message, page, status, created_at AS createdAt, resolved_at AS resolvedAt
      FROM feedback ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT ?`).bind(limit),
  ]);
  return {
    open: Number((open.results?.[0] as { count?: number } | undefined)?.count ?? 0),
    items: (items.results ?? []) as FeedbackItem[],
  };
}

export async function setFeedbackStatus(id: string, status: "open" | "resolved", now = nowSeconds()) {
  const db = await getD1();
  if (!db) {
    const item = memoryFeedback.find((entry) => entry.id === id);
    if (!item) return false;
    item.status = status;
    item.resolvedAt = status === "resolved" ? now : null;
    return true;
  }
  const result = await db.prepare("UPDATE feedback SET status = ?, resolved_at = ? WHERE id = ?")
    .bind(status, status === "resolved" ? now : null, id).run();
  return Boolean(result.meta.changes);
}
