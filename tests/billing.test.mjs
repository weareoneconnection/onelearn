import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

// Real SQL against an in-memory SQLite migrated with drizzle/*.sql.
const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { consumeAiCredits, refundAiCredits, beginBillingEvent, completeBillingEvent, getEffectivePlanId } = await import("../lib/onelearn/billing.ts");
const { reserveAiUsage, recordLearningEvent, UsageLimitError } = await import("../lib/onelearn/persistence.ts");

const now = () => Math.floor(Date.now() / 1000);
const month = () => new Date().toISOString().slice(0, 7);
let db;

function learner(id, extra = {}) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)")
    .run(id, `${id}@test.invalid`, id, now(), now());
  return { userId: id, email: `${id}@test.invalid`, displayName: id, mode: "clerk", ...extra };
}

const credits = (userId) => db.raw.prepare("SELECT quantity FROM entitlement_usage WHERE user_id = ? AND month = ?").get(userId, month())?.quantity ?? 0;
const dailyRequests = (userId) => db.raw.prepare("SELECT requests FROM usage_daily WHERE user_id = ?").get(userId)?.requests ?? 0;

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
  delete process.env.ONELEARN_DAILY_AI_REQUESTS;
  delete process.env.ONELEARN_ANONYMOUS_DAILY_AI_REQUESTS_PER_IP;
});

test("free plan: credits are consumed up to the monthly limit and never beyond", async () => {
  const user = learner("u-free");
  for (let i = 0; i < 3; i += 1) await consumeAiCredits(user, "course_generation");
  assert.equal(credits(user.userId), 90);
  await assert.rejects(consumeAiCredits(user, "course_generation"), { code: "monthly_credit_limit" });
  assert.equal(credits(user.userId), 90);
  await consumeAiCredits(user, "lesson_generation");
  assert.equal(credits(user.userId), 96);
});

test("refunds return credits but never go below zero", async () => {
  const user = learner("u-refund");
  await consumeAiCredits(user, "tutor_turn");
  await refundAiCredits(user, "course_generation");
  assert.equal(credits(user.userId), 0);
});

test("an active paid subscription raises the credit limit; cancelled ones do not", async () => {
  const user = learner("u-pro");
  const insert = (id, status) => db.raw.prepare(`INSERT INTO subscriptions (id, user_id, provider, provider_subscription_id, provider_customer_id, plan_id, billing_interval, status, cancel_at_period_end, created_at, updated_at)
    VALUES (?, ?, 'stripe', ?, 'cus_1', 'pro', 'month', ?, 0, ?, ?)`).run(id, user.userId, id, status, now(), now());
  insert("sub_old", "canceled");
  assert.equal(await getEffectivePlanId(user), "free");
  insert("sub_new", "active");
  assert.equal(await getEffectivePlanId(user), "pro");
  for (let i = 0; i < 4; i += 1) await consumeAiCredits(user, "course_generation");
  assert.equal(credits(user.userId), 120);
});

test("daily request limit blocks and does not charge credits", async () => {
  process.env.ONELEARN_DAILY_AI_REQUESTS = "2";
  const user = learner("u-daily");
  await reserveAiUsage(user, 100, "tutor_turn");
  await reserveAiUsage(user, 100, "tutor_turn");
  await assert.rejects(reserveAiUsage(user, 100, "tutor_turn"), (error) => error instanceof UsageLimitError && error.code === "daily_request_limit");
  assert.equal(dailyRequests(user.userId), 2);
  assert.equal(credits(user.userId), 2);
});

test("concurrent reservations cannot overshoot the daily limit", async () => {
  process.env.ONELEARN_DAILY_AI_REQUESTS = "3";
  const user = learner("u-race");
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => reserveAiUsage(user, 100, "tutor_turn")));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 3);
  assert.equal(dailyRequests(user.userId), 3);
  assert.equal(credits(user.userId), 3);
});

test("a credit failure rolls back the daily counter", async () => {
  const user = learner("u-rollback");
  db.raw.prepare("INSERT INTO entitlement_usage (id, user_id, month, metric, quantity, updated_at) VALUES ('e1', ?, ?, 'ai_credits', 100, ?)").run(user.userId, month(), now());
  await assert.rejects(reserveAiUsage(user, 100, "tutor_turn"), { code: "monthly_credit_limit" });
  assert.equal(dailyRequests(user.userId), 0);
});

test("anonymous devices behind one IP share a daily cap", async () => {
  process.env.ONELEARN_ANONYMOUS_DAILY_AI_REQUESTS_PER_IP = "1";
  const first = learner("device:a", { mode: "device", clientKey: "ip-hash-1" });
  const second = learner("device:b", { mode: "device", clientKey: "ip-hash-1" });
  const elsewhere = learner("device:c", { mode: "device", clientKey: "ip-hash-2" });
  await reserveAiUsage(first, 0, "tutor_turn");
  await assert.rejects(reserveAiUsage(second, 0, "tutor_turn"), { code: "daily_request_limit" });
  assert.equal(dailyRequests(second.userId), 0, "rejected request must not count against the device");
  await reserveAiUsage(elsewhere, 0, "tutor_turn");
});

test("learning events cannot be attached to another learner's course", async () => {
  const owner = learner("u-owner");
  const intruder = learner("u-intruder");
  db.raw.prepare(`INSERT INTO course_versions (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding, response_id, model, quality_status, created_at)
    VALUES ('cv1', ?, 'c', 'zh', 1, 't', '{}', '{}', 'none', 'r', 'm', 'passed', ?)`).run(owner.userId, now());
  await recordLearningEvent(intruder, "practice_answered", {}, "cv1");
  await recordLearningEvent(owner, "practice_answered", {}, "cv1");
  const rows = db.raw.prepare("SELECT user_id, course_version_id FROM learning_events ORDER BY user_id").all();
  assert.deepEqual(rows.map((row) => [row.user_id, row.course_version_id]), [["u-intruder", null], ["u-owner", "cv1"]]);
});

test("webhook events are processed once, but retried if processing never completed", async () => {
  assert.equal(await beginBillingEvent("evt_1", "invoice.paid", false), true);
  assert.equal(await beginBillingEvent("evt_1", "invoice.paid", false), true, "unfinished event may be retried");
  await completeBillingEvent("evt_1");
  assert.equal(await beginBillingEvent("evt_1", "invoice.paid", false), false);
});
