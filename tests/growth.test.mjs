import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { consumeAiCredits, getBillingSummary, grantCredits, trialDays } = await import("../lib/onelearn/billing.ts");
const { claimReferral, getOrCreateReferralCode, normalizeCode, referralStats, ReferralError, MONTHLY_REFERRER_CAP } = await import("../lib/onelearn/referrals.ts");
const { createShare, getPublicProof, getShareToken, publicDisplayName, revokeShare } = await import("../lib/onelearn/proof-share.ts");

const now = () => Math.floor(Date.now() / 1000);
let db;

function user(id, { createdAt = now(), displayName = id } = {}) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, `${id}@example.com`, displayName, createdAt, createdAt);
  return { userId: id, email: `${id}@example.com`, displayName, mode: id.startsWith("device:") ? "device" : "clerk" };
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
  delete process.env.ONELEARN_TRIAL_DAYS;
});

test("credit grants raise the monthly limit once per reference", async () => {
  const learner = user("clerk:granted");
  for (let i = 0; i < 3; i += 1) await consumeAiCredits(learner, "course_generation");
  await assert.rejects(consumeAiCredits(learner, "course_generation"), { code: "monthly_credit_limit" });
  assert.equal(await grantCredits(db, { userId: learner.userId, credits: 50, reason: "goodwill", reference: "r1" }), true);
  assert.equal(await grantCredits(db, { userId: learner.userId, credits: 50, reason: "goodwill", reference: "r1" }), false);
  await consumeAiCredits(learner, "course_generation");
  const summary = await getBillingSummary(learner);
  assert.equal(summary.usage.bonusCredits, 50);
  assert.equal(summary.usage.aiCreditsRemaining, 30);
});

test("the free trial is offered only to signed-in learners who never subscribed", async () => {
  assert.equal(trialDays(), 7);
  process.env.ONELEARN_TRIAL_DAYS = "0";
  assert.equal(trialDays(), 0);
  delete process.env.ONELEARN_TRIAL_DAYS;
  const fresh = user("clerk:fresh");
  const returning = user("clerk:returning");
  db.raw.prepare(`INSERT INTO subscriptions (id, user_id, provider, provider_subscription_id, provider_customer_id, plan_id, billing_interval, status, cancel_at_period_end, created_at, updated_at)
    VALUES ('s1', ?, 'stripe', 'sub_1', 'cus_1', 'personal', 'month', 'canceled', 0, ?, ?)`).run(returning.userId, now(), now());
  assert.equal((await getBillingSummary(fresh)).trialDays, 7);
  assert.equal((await getBillingSummary(returning)).trialDays, 0);
  assert.equal((await getBillingSummary(user("device:x"))).trialDays, 0);
});

test("referral codes are stable per user and normalized", async () => {
  const referrer = user("clerk:referrer");
  const code = await getOrCreateReferralCode(db, referrer.userId, now());
  assert.equal(await getOrCreateReferralCode(db, referrer.userId, now()), code);
  assert.match(code, /^[2-9A-Z]{8}$/);
  assert.equal(normalizeCode(` ${code.toLowerCase()}-`), code);
});

test("claiming rewards both sides once, and rejects abuse", async () => {
  const referrer = user("clerk:ref");
  const code = await getOrCreateReferralCode(db, referrer.userId, now());
  const invitee = user("clerk:new");
  const result = await claimReferral(db, invitee, code, now());
  assert.deepEqual(result, { credits: 50, referrerRewarded: true });
  assert.deepEqual(await referralStats(db, referrer.userId), { invited: 1, creditsEarned: 50 });
  const reject = (learner, value, expected) => assert.rejects(claimReferral(db, learner, value, now()), (error) => error instanceof ReferralError && error.code === expected);
  await reject(invitee, code, "already_referred");
  await reject(referrer, code, "self_referral");
  await reject(user("clerk:other"), "NOPE2345", "invalid_code");
  await reject(user("clerk:old", { createdAt: now() - 30 * 86_400 }), code, "account_too_old");
  await reject(user("device:anon"), code, "not_eligible");
});

test("a referrer is rewarded at most the monthly cap, invitees always are", async () => {
  const referrer = user("clerk:popular");
  const code = await getOrCreateReferralCode(db, referrer.userId, now());
  for (let i = 0; i < MONTHLY_REFERRER_CAP + 2; i += 1) {
    const result = await claimReferral(db, user(`clerk:invitee-${i}`), code, now());
    assert.equal(result.referrerRewarded, i < MONTHLY_REFERRER_CAP);
  }
  assert.equal((await referralStats(db, referrer.userId)).creditsEarned, 50 * MONTHLY_REFERRER_CAP);
});

test("public proof shows only mastered lessons and never an email", async () => {
  const learner = user("clerk:proof", { displayName: "proof@example.com" });
  db.raw.prepare(`INSERT INTO course_versions (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding, response_id, model, quality_status, created_at)
    VALUES ('cvp', ?, 'c', 'zh', 1, 'Course P', '{}', '{}', 'none', 'r', 'm', 'passed', ?)`).run(learner.userId, now());
  const insert = (key, title, fields) => db.raw.prepare(`INSERT INTO mastery_records (id, user_id, course_version_id, node_key, node_title, understanding, recall, application, transfer,
    attempts, correct_attempts, unassisted_passes, review_passes, stability_days, first_pass_at, last_evidence_at, next_review_at, updated_at)
    VALUES (?, ?, 'cvp', ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 5, ?, ?, ?, ?)`).run(crypto.randomUUID(), learner.userId, key, title, ...fields);
  const t = now();
  insert("l1", "Mastered lesson", [0.6, 0.9, 0.9, 5, 5, 4, 1, t - 3 * 86_400, t, t + 86_400, t]);
  insert("l2", "Practiced only", [0.3, 0.5, 0.5, 2, 1, 1, 0, t - 86_400, t, t + 86_400, t]);
  assert.equal(await getShareToken(db, learner.userId), null);
  const token = await createShare(db, learner.userId, t);
  assert.equal(await createShare(db, learner.userId, t), token);
  const proof = await getPublicProof(db, token, t);
  assert.equal(proof.displayName, null);
  assert.deepEqual(proof.mastered.map((item) => item.title), ["Mastered lesson"]);
  assert.equal(proof.mastered[0].course, "Course P");
  await revokeShare(db, learner.userId, t);
  assert.equal(await getPublicProof(db, token, t), null);
  const fresh = await createShare(db, learner.userId, t);
  assert.notEqual(fresh, token, "re-sharing issues a new link; the revoked one stays dead");
  assert.equal(publicDisplayName("Ma Qing"), "Ma Qing");
  assert.equal(await getPublicProof(db, "../etc", t), null);
});
