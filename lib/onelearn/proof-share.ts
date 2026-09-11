import type { D1Database } from "@cloudflare/workers-types";
import { evaluateMastery, type MasteryState } from "./mastery";

// Public, revocable mastery passport. It shows only a display name and verified
// (mastered) lessons — never an email address or unverified progress.

const TOKEN_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

function newToken(length = 20) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
}

export async function getShareToken(db: D1Database, userId: string) {
  const row = await db.prepare("SELECT token FROM proof_shares WHERE user_id = ? AND revoked_at IS NULL").bind(userId).first<{ token: string }>();
  return row?.token ?? null;
}

/** Returns the active token, creating one (or a fresh one after revocation). Old links stay dead. */
export async function createShare(db: D1Database, userId: string, now: number) {
  const active = await getShareToken(db, userId);
  if (active) return active;
  const token = newToken();
  await db.prepare(`INSERT INTO proof_shares (token, user_id, created_at, revoked_at) VALUES (?, ?, ?, NULL)
    ON CONFLICT(user_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at, revoked_at = NULL`)
    .bind(token, userId, now).run();
  return (await getShareToken(db, userId)) ?? token;
}

export async function revokeShare(db: D1Database, userId: string, now: number) {
  await db.prepare("UPDATE proof_shares SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, userId).run();
}

/** A display name that never exposes an email address. */
export function publicDisplayName(displayName: string | null) {
  const name = displayName?.trim();
  return name && !name.includes("@") ? name.slice(0, 60) : null;
}

type RecordRow = MasteryState & { nodeTitle: string; courseTitle: string | null };

export async function getPublicProof(db: D1Database, token: string, now = Math.floor(Date.now() / 1000)) {
  if (!/^[a-z0-9]{10,40}$/.test(token)) return null;
  const owner = await db.prepare(`SELECT s.user_id AS userId, u.display_name AS displayName FROM proof_shares s
    JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.revoked_at IS NULL`).bind(token).first<{ userId: string; displayName: string | null }>();
  if (!owner) return null;
  const rows = (await db.prepare(`SELECT m.node_title AS nodeTitle, c.title AS courseTitle,
      m.understanding, m.recall, m.application, m.transfer, m.attempts, m.correct_attempts AS correctAttempts,
      m.unassisted_passes AS unassistedPasses, m.review_passes AS reviewPasses, m.stability_days AS stabilityDays,
      m.first_pass_at AS firstPassAt, m.last_evidence_at AS lastEvidenceAt, m.next_review_at AS nextReviewAt
    FROM mastery_records m LEFT JOIN course_versions c ON c.id = m.course_version_id
    WHERE m.user_id = ? AND m.unassisted_passes >= 1 AND m.review_passes >= 1
    ORDER BY m.last_evidence_at DESC LIMIT 200`).bind(owner.userId).all<RecordRow>()).results ?? [];
  const mastered = rows
    .map((row) => ({ row, evaluation: evaluateMastery(row, now) }))
    .filter(({ evaluation }) => evaluation.mastered)
    .map(({ row, evaluation }) => ({ title: row.nodeTitle, course: row.courseTitle, score: evaluation.score, verifiedAt: row.lastEvidenceAt }));
  return { displayName: publicDisplayName(owner.displayName), mastered };
}
