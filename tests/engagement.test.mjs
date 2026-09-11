import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";
process.env.ONELEARN_EMAIL_SECRET = "test-email-secret";

const { computeStreak, getEngagement } = await import("../lib/onelearn/engagement.ts");
const { completeDiagnostic, getDiagnostic, getPlacements, gradeDiagnostic, publicQuestions, sanitizeQuestions, saveDiagnostic } = await import("../lib/onelearn/diagnostic.ts");
const { buildReminderEmail, findReminderRecipients, markReminded, setEmailReminders, getEmailReminders } = await import("../lib/onelearn/reminders.ts");
const { unsubscribeToken, verifyUnsubscribeToken } = await import("../lib/onelearn/email.ts");

const DAY = 86_400;
const NOW = 1_800_000_000;
let db;

function user(id, email = `${id}@example.com`) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, email, id, NOW, NOW);
  return id;
}
function event(userId, type, at, payload = {}) {
  db.raw.prepare("INSERT INTO learning_events (id, user_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), userId, type, JSON.stringify(payload), at);
}
function course(userId, id = "cv1") {
  db.raw.prepare(`INSERT OR IGNORE INTO course_versions (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding, response_id, model, quality_status, created_at)
    VALUES (?, ?, 'c', 'zh', 1, 'Course', '{}', '{}', 'none', 'r', 'm', 'passed', ?)`).run(id, userId, NOW);
}
function dueRecord(userId, title, nextReviewAt) {
  db.raw.prepare(`INSERT INTO mastery_records (id, user_id, course_version_id, node_key, node_title, updated_at, next_review_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(crypto.randomUUID(), userId, `cv-${userId}`, crypto.randomUUID(), title, NOW, nextReviewAt);
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
});

test("streak counts consecutive days ending today or yesterday", () => {
  assert.deepEqual(computeStreak([10, 9, 8], 10), { current: 3, activeToday: true });
  assert.deepEqual(computeStreak([9, 8, 6], 10), { current: 2, activeToday: false });
  assert.deepEqual(computeStreak([7], 10), { current: 0, activeToday: false });
});

test("engagement reads streak and weekly answers from learning events", async () => {
  const id = user("u1");
  event(id, "practice_answered", NOW, { correct: true });
  event(id, "review_completed", NOW - DAY, { correct: false });
  event(id, "tutor_turn", NOW - 2 * DAY);
  event(id, "course_opened", NOW - 3 * DAY);
  const engagement = await getEngagement(db, id, NOW);
  assert.deepEqual(engagement.streak, { current: 3, activeToday: true });
  assert.deepEqual(engagement.week, { answers: 2, correct: 1 });
});

const questions = [
  { moduleIndex: 0, question: "q0", options: ["a", "b"], correctOption: 1, explanation: "e0" },
  { moduleIndex: 1, question: "q1", options: ["a", "b", "c"], correctOption: 0, explanation: "e1" },
  { moduleIndex: 1, question: "dup", options: ["a", "b"], correctOption: 0, explanation: "dup" },
  { moduleIndex: 5, question: "out of range", options: ["a", "b"], correctOption: 0, explanation: "x" },
  { moduleIndex: 2, question: "bad answer index", options: ["a", "b"], correctOption: 4, explanation: "x" },
];

test("diagnostic keeps one valid question per existing module and hides answers", () => {
  const clean = sanitizeQuestions(questions, 3);
  assert.deepEqual(clean.map((question) => question.question), ["q0", "q1"]);
  assert.deepEqual(publicQuestions(clean)[0], { moduleIndex: 0, question: "q0", options: ["a", "b"] });
  assert.deepEqual(gradeDiagnostic(clean, [1, 2]), { results: [true, false], knownModules: [0] });
});

test("diagnostics are stored once, completed once, and become placements", async () => {
  const id = user("u2");
  course(id);
  const clean = sanitizeQuestions(questions, 3);
  await saveDiagnostic(db, id, "cv1", clean, NOW);
  await saveDiagnostic(db, id, "cv1", [clean[0]], NOW);
  assert.equal((await getDiagnostic(db, id, "cv1")).questions.length, 2, "second save keeps the first diagnostic");
  assert.equal(await completeDiagnostic(db, id, "cv1", [1, 0], [0, 1], NOW), true);
  assert.equal(await completeDiagnostic(db, id, "cv1", [0, 0], [], NOW), false, "cannot be re-submitted");
  assert.deepEqual(await getPlacements(db, id), { cv1: [0, 1] });
});

test("reminders go only to signed-in, subscribed learners with due reviews and no recent reminder", async () => {
  const active = user("clerk:active");
  const device = user("device:abc", "device-abc@local.invalid");
  const unsubscribed = user("clerk:unsub");
  const recent = user("clerk:recent");
  const nothingDue = user("clerk:idle");
  for (const id of [active, device, unsubscribed, recent, nothingDue]) course(id, `cv-${id}`);
  for (const id of [active, device, unsubscribed, recent]) dueRecord(id, `Lesson for ${id}`, NOW - 60);
  dueRecord(nothingDue, "Later", NOW + DAY);
  await setEmailReminders(db, unsubscribed, false, NOW);
  await markReminded(db, recent, NOW - 3600);
  const recipients = await findReminderRecipients(db, NOW);
  assert.deepEqual(recipients.map((recipient) => recipient.userId), [active]);
  assert.equal(await getEmailReminders(db, unsubscribed), false);
  assert.equal(await getEmailReminders(db, active), true);
});

test("reminder email escapes lesson titles and includes the unsubscribe link", () => {
  const email = buildReminderEmail({ locale: "zh", name: "<b>Ma</b>", due: 2, titles: ["<script>x</script>", "Schema"], streak: 3, siteUrl: "https://www.onelearn.ltd", unsubscribeUrl: "https://www.onelearn.ltd/api/email/unsubscribe?u=1&t=abc" });
  assert.match(email.subject, /2 个知识点/);
  assert.ok(!email.html.includes("<script>"));
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(email.html.includes("api/email/unsubscribe?u=1&amp;t=abc"));
  assert.match(email.text, /连续学习 3 天/);
});

test("unsubscribe tokens verify only for the matching user", async () => {
  const token = await unsubscribeToken("clerk:a");
  assert.equal(await verifyUnsubscribeToken("clerk:a", token), true);
  assert.equal(await verifyUnsubscribeToken("clerk:b", token), false);
  assert.equal(await verifyUnsubscribeToken("clerk:a", "0".repeat(token.length)), false);
});
