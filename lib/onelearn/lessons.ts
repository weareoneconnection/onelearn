import { getD1 } from "@/db";
import { flattenLessons, lessonSchema, type GeneratedCourseBundle, type GeneratedLesson } from "./generated-course";
import type { LearnerIdentity } from "./persistence";

// Lesson content beyond the first lesson is generated on demand and stored per
// course version, so every lesson in the map can be studied, practiced, and reviewed.

const memory = globalThis as typeof globalThis & { __onelearnLessons?: Map<string, GeneratedLesson> };
const memoryLessons = memory.__onelearnLessons ??= new Map<string, GeneratedLesson>();
const memoryKey = (userId: string, courseVersionId: string, lessonId: string) => `${userId}|${courseVersionId}|${lessonId}`;
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Where a lesson sits in the course, plus the titles before it (used to avoid repeating content). */
export function locateLesson(bundle: GeneratedCourseBundle, lessonId: string) {
  const lessons = flattenLessons(bundle.curriculum);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return null;
  return {
    outline: lessons[index],
    index,
    total: lessons.length,
    priorLessonTitles: lessons.slice(Math.max(0, index - 30), index).map((lesson) => lesson.title),
  };
}

function parseLesson(json: string) {
  try {
    const parsed = lessonSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The lesson's full content if it exists: the bundle's first lesson, or a stored generated lesson. */
export async function getStoredLesson(learner: LearnerIdentity, bundle: GeneratedCourseBundle, courseVersionId: string, lessonId: string): Promise<GeneratedLesson | null> {
  if (bundle.curriculum.firstLesson.id === lessonId) return bundle.curriculum.firstLesson;
  const db = await getD1();
  if (!db) return memoryLessons.get(memoryKey(learner.userId, courseVersionId, lessonId)) ?? null;
  const row = await db.prepare(`SELECT lesson_json AS lessonJson FROM lesson_contents
    WHERE user_id = ? AND course_version_id = ? AND lesson_id = ?`)
    .bind(learner.userId, courseVersionId, lessonId).first<{ lessonJson: string }>();
  return row ? parseLesson(row.lessonJson) : null;
}

/** Stores a generated lesson. If a parallel request already stored one, that copy wins and is returned. */
export async function saveLesson(learner: LearnerIdentity, courseVersionId: string, lesson: GeneratedLesson, responseId?: string | null): Promise<GeneratedLesson> {
  const db = await getD1();
  if (!db) {
    const key = memoryKey(learner.userId, courseVersionId, lesson.id);
    if (!memoryLessons.has(key)) memoryLessons.set(key, lesson);
    return memoryLessons.get(key)!;
  }
  await db.prepare(`INSERT INTO lesson_contents (id, user_id, course_version_id, lesson_id, lesson_json, response_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(course_version_id, lesson_id) DO NOTHING`)
    .bind(crypto.randomUUID(), learner.userId, courseVersionId, lesson.id, JSON.stringify(lesson), responseId ?? null, nowSeconds()).run();
  const row = await db.prepare("SELECT lesson_json AS lessonJson FROM lesson_contents WHERE course_version_id = ? AND lesson_id = ?")
    .bind(courseVersionId, lesson.id).first<{ lessonJson: string }>();
  return (row && parseLesson(row.lessonJson)) ?? lesson;
}
