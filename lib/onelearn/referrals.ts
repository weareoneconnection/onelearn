import type { D1Database } from "@cloudflare/workers-types";
import { grantCredits } from "./billing";

// Invite rewards: both sides get REFERRAL_CREDITS this month. Only new, signed-in
// accounts can claim; each account is referred at most once; a referrer earns at
// most MONTHLY_REFERRER_CAP rewards per month.

export const REFERRAL_CREDITS = 50;
export const MONTHLY_REFERRER_CAP = 10;
const INVITEE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export class ReferralError extends Error {
  readonly code: "invalid_code" | "self_referral" | "already_referred" | "account_too_old" | "not_eligible";
  constructor(code: ReferralError["code"]) {
    super(code);
    this.code = code;
  }
}

function randomCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 16);
}

export async function getOrCreateReferralCode(db: D1Database, userId: string, now: number) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing = await db.prepare("SELECT code FROM referral_codes WHERE user_id = ?").bind(userId).first<{ code: string }>();
    if (existing) return existing.code;
    await db.prepare("INSERT INTO referral_codes (user_id, code, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
      .bind(userId, randomCode(), now).run();
  }
  throw new Error("referral_code_unavailable");
}

export async function referralStats(db: D1Database, userId: string) {
  const [invited, earned] = await db.batch([
    db.prepare("SELECT COUNT(*) AS count FROM referrals WHERE referrer_user_id = ?").bind(userId),
    db.prepare("SELECT COALESCE(SUM(credits), 0) AS credits FROM credit_grants WHERE user_id = ? AND reason IN ('referral_referrer', 'referral_invitee')").bind(userId),
  ]);
  return {
    invited: Number((invited.results?.[0] as { count?: number } | undefined)?.count ?? 0),
    creditsEarned: Number((earned.results?.[0] as { credits?: number } | undefined)?.credits ?? 0),
  };
}

export async function claimReferral(db: D1Database, invitee: { userId: string; mode: string }, rawCode: string, now: number) {
  if (invitee.mode === "device") throw new ReferralError("not_eligible");
  const code = normalizeCode(rawCode);
  const referrer = code ? await db.prepare("SELECT user_id AS userId FROM referral_codes WHERE code = ?").bind(code).first<{ userId: string }>() : null;
  if (!referrer) throw new ReferralError("invalid_code");
  if (referrer.userId === invitee.userId) throw new ReferralError("self_referral");
  const account = await db.prepare("SELECT created_at AS createdAt FROM users WHERE id = ?").bind(invitee.userId).first<{ createdAt: number }>();
  if (!account || now - Number(account.createdAt) > INVITEE_MAX_AGE_SECONDS) throw new ReferralError("account_too_old");

  const referralId = crypto.randomUUID();
  const inserted = await db.prepare(`INSERT INTO referrals (id, referrer_user_id, invitee_user_id, code, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(invitee_user_id) DO NOTHING`).bind(referralId, referrer.userId, invitee.userId, code, now).run();
  if (!inserted.meta.changes) throw new ReferralError("already_referred");

  await grantCredits(db, { userId: invitee.userId, credits: REFERRAL_CREDITS, reason: "referral_invitee", reference: referralId, now });
  const month = new Date(now * 1000).toISOString().slice(0, 7);
  const rewardedThisMonth = await db.prepare("SELECT COUNT(*) AS count FROM credit_grants WHERE user_id = ? AND reason = 'referral_referrer' AND month = ?")
    .bind(referrer.userId, month).first<{ count: number }>();
  const referrerRewarded = Number(rewardedThisMonth?.count ?? 0) < MONTHLY_REFERRER_CAP
    && await grantCredits(db, { userId: referrer.userId, credits: REFERRAL_CREDITS, reason: "referral_referrer", reference: referralId, now });
  return { credits: REFERRAL_CREDITS, referrerRewarded };
}
