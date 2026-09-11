import type { D1Database } from "@cloudflare/workers-types";
import { getD1 } from "@/db";
import { applyAnswer, applyTutorSignal, emptyMasteryState, evaluateMastery, type EvidenceDimension, type MasteryState } from "./mastery";
import { getOwnedCourseBundle, recordLearningEvent, type LearnerIdentity } from "./persistence";
import { flattenLessons } from "./generated-course";
import { getStoredLesson } from "./lessons";

export class MasteryInputError extends Error {
  readonly code: "course_not_found" | "lesson_not_found" | "question_not_found";
  constructor(code: MasteryInputError["code"]) {
    super(code);
    this.code = code;
  }
}

export type MasteryRecordView = MasteryState & {
  courseVersionId: string;
  nodeKey: string;
  nodeTitle: string;
} & ReturnType<typeof evaluateMastery>;

type StoredRecord = MasteryState & { courseVersionId: string; nodeKey: string; nodeTitle: string };

const nowSeconds = () => Math.floor(Date.now() / 1000);
const memory = globalThis as typeof globalThis & { __onelearnMastery?: Map<string, StoredRecord> };
const memoryRecords = memory.__onelearnMastery ??= new Map<string, StoredRecord>();
const memoryKey = (userId: string, courseVersionId: string, nodeKey: string) => `${userId}|${courseVersionId}|${nodeKey}`;

const COLUMNS = `course_version_id AS courseVersionId, node_key AS nodeKey, node_title AS nodeTitle,
  understanding, recall, application, transfer, attempts, correct_attempts AS correctAttempts,
  unassisted_passes AS unassistedPasses, review_passes AS reviewPasses, stability_days AS stabilityDays,
  first_pass_at AS firstPassAt, last_evidence_at AS lastEvidenceAt, next_review_at AS nextReviewAt`;

async function loadRecord(db: D1Database | null, learner: LearnerIdentity, courseVersionId: string, nodeKey: string) {
  if (!db) return memoryRecords.get(memoryKey(learner.userId, courseVersionId, nodeKey)) ?? null;
  return db.prepare(`SELECT ${COLUMNS} FROM mastery_records WHERE user_id = ? AND course_version_id = ? AND node_key = ?`)
    .bind(learner.userId, courseVersionId, nodeKey).first<StoredRecord>();
}

async function saveRecord(db: D1Database | null, learner: LearnerIdentity, record: StoredRecord, now: number) {
  if (!db) {
    memoryRecords.set(memoryKey(learner.userId, record.courseVersionId, record.nodeKey), record);
    return;
  }
  await db.prepare(`INSERT INTO mastery_records
      (id, user_id, course_version_id, node_key, node_title, understanding, recall, application, transfer,
       attempts, correct_attempts, unassisted_passes, review_passes, stability_days,
       first_pass_at, last_evidence_at, next_review_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, course_version_id, node_key) DO UPDATE SET
      node_title = excluded.node_title, understanding = excluded.understanding, recall = excluded.recall,
      application = excluded.application, transfer = excluded.transfer, attempts = excluded.attempts,
      correct_attempts = excluded.correct_attempts, unassisted_passes = excluded.unassisted_passes,
      review_passes = excluded.review_passes, stability_days = excluded.stability_days,
      first_pass_at = excluded.first_pass_at, last_evidence_at = excluded.last_evidence_at,
      next_review_at = excluded.next_review_at, updated_at = excluded.updated_at`)
    .bind(crypto.randomUUID(), learner.userId, record.courseVersionId, record.nodeKey, record.nodeTitle,
      record.understanding, record.recall, record.application, record.transfer, record.attempts,
      record.correctAttempts, record.unassistedPasses, record.reviewPasses, record.stabilityDays,
      record.firstPassAt, record.lastEvidenceAt, record.nextReviewAt, now).run();
}

function toView(record: StoredRecord, now: number): MasteryRecordView {
  return { ...record, ...evaluateMastery(record, now) };
}

/** Grades a practice/review answer on the server against the stored course, then updates mastery. */
export async function recordPracticeAnswer(learner: LearnerIdentity, input: {
  courseVersionId: string;
  lessonId: string;
  questionId: string;
  selected: number;
  mode: "practice" | "review";
  now?: number;
}) {
  const now = input.now ?? nowSeconds();
  const bundle = await getOwnedCourseBundle(learner, input.courseVersionId);
  if (!bundle) throw new MasteryInputError("course_not_found");
  const lesson = await getStoredLesson(learner, bundle, input.courseVersionId, input.lessonId);
  if (!lesson) throw new MasteryInputError("lesson_not_found");
  const question = lesson.practice.find((item) => item.id === input.questionId);
  if (!question) throw new MasteryInputError("question_not_found");
  const correct = input.selected === question.correctOption;

  const db = await getD1();
  const current = await loadRecord(db, learner, input.courseVersionId, lesson.id);
  const record: StoredRecord = {
    ...applyAnswer(current ?? emptyMasteryState(), { correct, mode: input.mode, now }),
    courseVersionId: input.courseVersionId,
    nodeKey: lesson.id,
    nodeTitle: lesson.title,
  };
  await saveRecord(db, learner, record, now);
  await recordLearningEvent(learner, input.mode === "review" ? "review_completed" : "practice_answered",
    { lessonId: lesson.id, lessonTitle: lesson.title, questionId: question.id, selected: input.selected, correct }, input.courseVersionId);
  return { correct, correctOption: question.correctOption, explanation: question.explanation, record: toView(record, now) };
}

/** Folds the tutor's provisional evidence into the lesson's record. Unknown lessons are ignored. */
export async function applyTutorEvidence(learner: LearnerIdentity, input: {
  courseVersionId: string;
  lessonId: string;
  dimension: EvidenceDimension;
  confidence: number;
  now?: number;
}) {
  const now = input.now ?? nowSeconds();
  const bundle = await getOwnedCourseBundle(learner, input.courseVersionId);
  if (!bundle) return null;
  const title = flattenLessons(bundle.curriculum).find((lesson) => lesson.id === input.lessonId)?.title;
  if (!title) return null;
  const db = await getD1();
  const current = await loadRecord(db, learner, input.courseVersionId, input.lessonId);
  const record: StoredRecord = {
    ...applyTutorSignal(current ?? emptyMasteryState(), { dimension: input.dimension, confidence: input.confidence, now }),
    courseVersionId: input.courseVersionId,
    nodeKey: input.lessonId,
    nodeTitle: title,
  };
  await saveRecord(db, learner, record, now);
  return toView(record, now);
}

type EventRow = { eventType: string; payloadJson: string; createdAt: number };

export async function getMasteryOverview(learner: LearnerIdentity, now = nowSeconds()) {
  const db = await getD1();
  const stored = db
    ? ((await db.prepare(`SELECT ${COLUMNS} FROM mastery_records WHERE user_id = ? ORDER BY updated_at DESC LIMIT 500`)
        .bind(learner.userId).all<StoredRecord>()).results ?? [])
    : [...memoryRecords.entries()].filter(([key]) => key.startsWith(`${learner.userId}|`)).map(([, record]) => record);
  const records = stored.map((record) => toView(record, now));
  const events = db
    ? ((await db.prepare(`SELECT event_type AS eventType, payload_json AS payloadJson, created_at AS createdAt
        FROM learning_events WHERE user_id = ? AND created_at >= ?
          AND event_type IN ('practice_answered', 'review_completed', 'tutor_turn')
        ORDER BY created_at DESC LIMIT 400`).bind(learner.userId, now - 7 * 24 * 60 * 60).all<EventRow>()).results ?? [])
    : [];

  const startOfToday = new Date(now * 1000);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const dayStart = startOfToday.getTime() / 1000 - (6 - index) * 24 * 60 * 60;
    return { day: new Date(dayStart * 1000).toISOString().slice(0, 10), count: events.filter((event) => event.createdAt >= dayStart && event.createdAt < dayStart + 24 * 60 * 60).length };
  });
  const recent = events.slice(0, 8).map((event) => {
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(event.payloadJson) as Record<string, unknown>; } catch { /* keep empty */ }
    return { eventType: event.eventType, createdAt: event.createdAt, lessonTitle: typeof payload.lessonTitle === "string" ? payload.lessonTitle : typeof payload.node === "string" ? payload.node : null, correct: typeof payload.correct === "boolean" ? payload.correct : null };
  });
  const scored = records.filter((record) => record.attempts > 0 || record.lastEvidenceAt !== null);
  return {
    storage: db ? "durable" as const : "ephemeral" as const,
    records,
    due: records.filter((record) => record.due).sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0)),
    summary: {
      pathMastery: scored.length ? Math.round(scored.reduce((sum, record) => sum + record.score, 0) / scored.length) : 0,
      mastered: records.filter((record) => record.mastered).length,
      tracked: scored.length,
      due: records.filter((record) => record.due).length,
      averageRetention: scored.length ? Math.round(scored.reduce((sum, record) => sum + record.retention, 0) / scored.length) : 0,
      unassistedPasses: records.reduce((sum, record) => sum + record.unassistedPasses, 0),
      delayedReviews: records.reduce((sum, record) => sum + record.reviewPasses, 0),
    },
    weekly,
    recent,
  };
}
