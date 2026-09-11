import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { applyAnswer, applyTutorSignal, emptyMasteryState, evaluateMastery, DELAYED_REVIEW_SECONDS } = await import("../lib/onelearn/mastery.ts");
const { recordPracticeAnswer, applyTutorEvidence, getMasteryOverview, MasteryInputError } = await import("../lib/onelearn/mastery-store.ts");

const T0 = 1_800_000_000;
const DAY = 86_400;

test("one correct answer never produces mastered", () => {
  const state = applyAnswer(emptyMasteryState(), { correct: true, mode: "practice", now: T0 });
  const result = evaluateMastery(state, T0);
  assert.equal(result.mastered, false);
  assert.notEqual(result.status, "mastered");
  assert.equal(state.nextReviewAt, T0 + DAY);
});

test("mastered requires application, an unassisted pass, and a delayed review", () => {
  let state = emptyMasteryState();
  state = applyAnswer(state, { correct: true, mode: "practice", now: T0 });
  state = applyAnswer(state, { correct: true, mode: "practice", now: T0 + 60 });
  state = applyAnswer(state, { correct: true, mode: "review", now: T0 + 120 });
  assert.equal(state.reviewPasses, 0, "a review right after learning is not delayed");
  assert.equal(evaluateMastery(state, T0 + 120).mastered, false);
  state = applyAnswer(state, { correct: true, mode: "review", now: T0 + DELAYED_REVIEW_SECONDS + 1 });
  assert.equal(state.reviewPasses, 1);
  const result = evaluateMastery(state, T0 + DELAYED_REVIEW_SECONDS + 1);
  assert.equal(result.mastered, true);
  assert.equal(result.status, "mastered");
});

test("wrong answers shorten the review interval and lower application", () => {
  let state = applyAnswer(emptyMasteryState(), { correct: true, mode: "practice", now: T0 });
  const before = state.application;
  state = applyAnswer(state, { correct: false, mode: "review", now: T0 + DAY });
  assert.ok(state.application < before);
  assert.equal(state.stabilityDays, 1);
  assert.equal(state.nextReviewAt, T0 + DAY + DAY / 2);
});

test("retention decays with time and items become due", () => {
  const state = applyAnswer(emptyMasteryState(), { correct: true, mode: "practice", now: T0 });
  const fresh = evaluateMastery(state, T0);
  const later = evaluateMastery(state, T0 + 3 * DAY);
  assert.ok(later.retention < fresh.retention);
  assert.equal(fresh.due, false);
  assert.equal(later.due, true);
});

test("tutor signals move one dimension but never count as unassisted passes", () => {
  const state = applyTutorSignal(emptyMasteryState(), { dimension: "understanding", confidence: .9, now: T0 });
  assert.ok(state.understanding > 0);
  assert.equal(state.unassistedPasses, 0);
  assert.equal(evaluateMastery(state, T0).mastered, false);
});

// ---- store, against real SQL ----

let db;
const now = () => Math.floor(Date.now() / 1000);
const bundle = {
  curriculum: {
    title: "Course", modules: [{ id: "m1", title: "M1", lessons: [{ id: "m1-l1", title: "Lesson 1" }, { id: "m1-l2", title: "Lesson 2" }] }],
    firstLesson: { id: "m1-l1", title: "Lesson 1", practice: [{ id: "q1", question: "?", options: ["a", "b", "c"], correctOption: 2, explanation: "because" }] },
  },
  generation: { courseVersionId: "cv1" },
};

function learner(id) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, `${id}@t.invalid`, id, now(), now());
  return { userId: id, email: `${id}@t.invalid`, displayName: id, mode: "clerk" };
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
  const owner = learner("owner");
  db.raw.prepare(`INSERT INTO course_versions (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding, response_id, model, quality_status, created_at)
    VALUES ('cv1', ?, 'c', 'zh', 1, 'Course', '{}', ?, 'none', 'r', 'm', 'passed', ?)`).run(owner.userId, JSON.stringify(bundle), now());
});

test("answers are graded on the server, not trusted from the client", async () => {
  const owner = learner("owner");
  const wrong = await recordPracticeAnswer(owner, { courseVersionId: "cv1", lessonId: "m1-l1", questionId: "q1", selected: 0, mode: "practice" });
  assert.equal(wrong.correct, false);
  assert.equal(wrong.correctOption, 2);
  const right = await recordPracticeAnswer(owner, { courseVersionId: "cv1", lessonId: "m1-l1", questionId: "q1", selected: 2, mode: "practice" });
  assert.equal(right.correct, true);
  assert.equal(right.record.attempts, 2);
  assert.equal(right.record.correctAttempts, 1);
  const events = db.raw.prepare("SELECT event_type FROM learning_events WHERE user_id = 'owner'").all();
  assert.equal(events.length, 2);
});

test("another learner cannot answer against someone else's course", async () => {
  const intruder = learner("intruder");
  await assert.rejects(
    recordPracticeAnswer(intruder, { courseVersionId: "cv1", lessonId: "m1-l1", questionId: "q1", selected: 2, mode: "practice" }),
    (error) => error instanceof MasteryInputError && error.code === "course_not_found",
  );
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM mastery_records").get().n, 0);
});

test("unknown questions are rejected", async () => {
  await assert.rejects(recordPracticeAnswer(learner("owner"), { courseVersionId: "cv1", lessonId: "m1-l1", questionId: "nope", selected: 0, mode: "practice" }), { code: "question_not_found" });
});

test("tutor evidence updates outline lessons and ignores unknown lessons", async () => {
  const owner = learner("owner");
  assert.ok(await applyTutorEvidence(owner, { courseVersionId: "cv1", lessonId: "m1-l2", dimension: "transfer", confidence: .8 }));
  assert.equal(await applyTutorEvidence(owner, { courseVersionId: "cv1", lessonId: "m9-l9", dimension: "transfer", confidence: .8 }), null);
  assert.equal(await applyTutorEvidence(learner("intruder"), { courseVersionId: "cv1", lessonId: "m1-l2", dimension: "transfer", confidence: .8 }), null);
});

test("the overview reports due reviews, summary and weekly activity", async () => {
  const owner = learner("owner");
  const start = now() - 2 * DAY;
  await recordPracticeAnswer(owner, { courseVersionId: "cv1", lessonId: "m1-l1", questionId: "q1", selected: 2, mode: "practice", now: start });
  const overview = await getMasteryOverview(owner);
  assert.equal(overview.records.length, 1);
  assert.equal(overview.summary.tracked, 1);
  assert.equal(overview.due.length, 1, "one-day interval has elapsed");
  assert.equal(overview.summary.mastered, 0);
  assert.equal(overview.weekly.length, 7);
  assert.equal(overview.recent[0].lessonTitle, "Lesson 1");
});
