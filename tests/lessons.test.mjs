import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { flattenLessons } = await import("../lib/onelearn/generated-course.ts");
const { getStoredLesson, locateLesson, saveLesson } = await import("../lib/onelearn/lessons.ts");
const { recordPracticeAnswer, MasteryInputError } = await import("../lib/onelearn/mastery-store.ts");

const lessonContent = (id, title) => ({
  id, title, objective: "o", durationMinutes: 10, sections: [{ heading: "h", body: "b" }], keyPoints: ["k"],
  workedExample: { scenario: "s", steps: ["1"], takeaway: "t" }, checkpointQuestion: "?", expectedAnswer: "a",
  practice: [{ id: `${id}-q1`, question: "?", options: ["a", "b"], correctOption: 1, explanation: "e" }],
});
const curriculum = {
  title: "Course", overview: "Overview",
  modules: [
    { id: "m1", title: "Module 1", lessons: [{ id: "m1-l1", title: "L1", objective: "o1", durationMinutes: 10 }, { id: "m1-l2", title: "L2", objective: "o2", durationMinutes: 12 }] },
    { id: "m2", title: "Module 2", lessons: [{ id: "m2-l1", title: "L3", objective: "o3", durationMinutes: 15 }] },
  ],
  firstLesson: lessonContent("m1-l1", "L1"),
};
const bundle = { curriculum, generation: { courseVersionId: "cv1" } };

test("lessons are flattened in course order with module positions", () => {
  const lessons = flattenLessons(curriculum);
  assert.deepEqual(lessons.map((lesson) => [lesson.id, lesson.moduleIndex, lesson.lessonIndex]), [["m1-l1", 0, 0], ["m1-l2", 0, 1], ["m2-l1", 1, 0]]);
  const position = locateLesson(bundle, "m2-l1");
  assert.equal(position.index, 2);
  assert.deepEqual(position.priorLessonTitles, ["L1", "L2"]);
  assert.equal(locateLesson(bundle, "nope"), null);
});

test("a first lesson whose id differs from the outline still takes the first slot", () => {
  const drifted = { ...curriculum, firstLesson: lessonContent("intro", "Intro") };
  const lessons = flattenLessons(drifted);
  assert.equal(lessons[0].id, "intro");
  assert.equal(lessons.length, 3);
});

let db;
const now = () => Math.floor(Date.now() / 1000);
function learner(id) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, `${id}@t.invalid`, id, now(), now());
  return { userId: id, email: `${id}@t.invalid`, displayName: id, mode: "clerk" };
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
  db.raw.prepare(`INSERT INTO course_versions (id, user_id, catalog_course_id, locale, version, title, course_json, bundle_json, grounding, response_id, model, quality_status, created_at)
    VALUES ('cv1', ?, 'c', 'zh', 1, 'Course', '{}', ?, 'none', 'r', 'm', 'passed', ?)`).run(learner("owner").userId, JSON.stringify(bundle), now());
});

test("stored lessons are returned; the first lesson comes from the bundle", async () => {
  const owner = learner("owner");
  assert.equal((await getStoredLesson(owner, bundle, "cv1", "m1-l1")).title, "L1");
  assert.equal(await getStoredLesson(owner, bundle, "cv1", "m1-l2"), null);
  await saveLesson(owner, "cv1", lessonContent("m1-l2", "L2"), "resp_1");
  assert.equal((await getStoredLesson(owner, bundle, "cv1", "m1-l2")).title, "L2");
  assert.equal(await getStoredLesson(learner("intruder"), bundle, "cv1", "m1-l2"), null);
});

test("saving the same lesson twice keeps the first copy", async () => {
  const owner = learner("owner");
  await saveLesson(owner, "cv1", lessonContent("m1-l2", "First copy"));
  const second = await saveLesson(owner, "cv1", lessonContent("m1-l2", "Second copy"));
  assert.equal(second.title, "First copy");
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM lesson_contents").get().n, 1);
});

test("practice on later lessons is graded once their content exists", async () => {
  const owner = learner("owner");
  await assert.rejects(
    recordPracticeAnswer(owner, { courseVersionId: "cv1", lessonId: "m1-l2", questionId: "m1-l2-q1", selected: 1, mode: "practice" }),
    (error) => error instanceof MasteryInputError && error.code === "lesson_not_found",
  );
  await saveLesson(owner, "cv1", lessonContent("m1-l2", "L2"));
  const result = await recordPracticeAnswer(owner, { courseVersionId: "cv1", lessonId: "m1-l2", questionId: "m1-l2-q1", selected: 1, mode: "practice" });
  assert.equal(result.correct, true);
  assert.equal(result.record.nodeTitle, "L2");
});
