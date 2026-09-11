import { flattenLessons, type GeneratedCourseBundle, type LessonOutline } from "@/lib/onelearn/generated-course";
import type { MasteryOverview, MasteryRecord } from "./types";

export type LessonProgress = LessonOutline & { record: MasteryRecord | null; passed: boolean; unlocked: boolean };
export type ModuleProgress = { index: number; title: string; lessons: LessonProgress[]; score: number; mastered: number; passed: boolean; unlocked: boolean };

/**
 * Course progress from mastery records. A lesson is "passed" once it has an unassisted
 * correct answer; a module unlocks when every lesson of the previous module is passed.
 */
export function courseProgress(bundle: GeneratedCourseBundle, mastery: MasteryOverview | null) {
  const courseVersionId = bundle.generation.courseVersionId;
  const recordOf = (lessonId: string) => mastery?.records.find((record) => record.courseVersionId === courseVersionId && record.nodeKey === lessonId) ?? null;
  const outline = flattenLessons(bundle.curriculum);
  const modules: ModuleProgress[] = [];
  bundle.curriculum.modules.forEach((module, index) => {
    const unlocked = index === 0 || modules[index - 1].passed;
    const lessons = outline.filter((lesson) => lesson.moduleIndex === index).map((lesson) => {
      const record = recordOf(lesson.id);
      return { ...lesson, record, passed: (record?.unassistedPasses ?? 0) > 0, unlocked };
    });
    modules.push({
      index,
      title: module.title,
      lessons,
      score: Math.round(lessons.reduce((sum, lesson) => sum + (lesson.record?.score ?? 0), 0) / Math.max(1, lessons.length)),
      mastered: lessons.filter((lesson) => lesson.record?.mastered).length,
      passed: lessons.length > 0 && lessons.every((lesson) => lesson.passed),
      unlocked,
    });
  });
  const lessons = modules.flatMap((module) => module.lessons);
  const recommended = lessons.find((lesson) => lesson.unlocked && !lesson.passed)
    ?? lessons.find((lesson) => lesson.unlocked && !lesson.record?.mastered)
    ?? lessons[0];
  return { modules, lessons, recommendedId: recommended?.id ?? bundle.curriculum.firstLesson.id };
}

export function lessonNeighbors(bundle: GeneratedCourseBundle, lessonId: string) {
  const lessons = flattenLessons(bundle.curriculum);
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.id === lessonId));
  return { index, total: lessons.length, current: lessons[index] ?? null, next: lessons[index + 1] ?? null };
}
