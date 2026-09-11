import type { D1Database } from "@cloudflare/workers-types";
import { z } from "zod";

// Placement diagnostic: one question per module. Modules answered correctly are
// treated as already known, so they unlock and are skipped by recommendations.
// Correct answers never leave the server before the learner submits.

export const diagnosticQuestionSchema = z.object({
  moduleIndex: z.number().int().min(0),
  question: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctOption: z.number().int(),
  explanation: z.string(),
});
export const diagnosticSchema = z.object({ questions: z.array(diagnosticQuestionSchema).min(1).max(8) });
export type DiagnosticQuestion = z.infer<typeof diagnosticQuestionSchema>;

export const diagnosticJsonSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          moduleIndex: { type: "integer" },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctOption: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["moduleIndex", "question", "options", "correctOption", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

/** Keeps only well-formed questions for modules that exist, at most one per module. */
export function sanitizeQuestions(questions: DiagnosticQuestion[], moduleCount: number) {
  const seen = new Set<number>();
  return questions.filter((question) => {
    const valid = question.moduleIndex < moduleCount && question.correctOption >= 0 && question.correctOption < question.options.length && !seen.has(question.moduleIndex);
    if (valid) seen.add(question.moduleIndex);
    return valid;
  });
}

export function publicQuestions(questions: DiagnosticQuestion[]) {
  return questions.map(({ moduleIndex, question, options }) => ({ moduleIndex, question, options }));
}

export function gradeDiagnostic(questions: DiagnosticQuestion[], answers: number[]) {
  const results = questions.map((question, index) => answers[index] === question.correctOption);
  const knownModules = [...new Set(questions.filter((_, index) => results[index]).map((question) => question.moduleIndex))].sort((a, b) => a - b);
  return { results, knownModules };
}

type StoredDiagnostic = { questions: DiagnosticQuestion[]; answers: number[] | null; knownModules: number[] | null; completedAt: number | null };
type DiagnosticRow = { questionsJson: string; answersJson: string | null; knownModulesJson: string | null; completedAt: number | null };

const memory = globalThis as typeof globalThis & { __onelearnDiagnostics?: Map<string, StoredDiagnostic> };
const memoryDiagnostics = memory.__onelearnDiagnostics ??= new Map<string, StoredDiagnostic>();
const memoryKey = (userId: string, courseVersionId: string) => `${userId}|${courseVersionId}`;
const parse = <T>(json: string | null): T | null => {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
};

export async function getDiagnostic(db: D1Database | null, userId: string, courseVersionId: string): Promise<StoredDiagnostic | null> {
  if (!db) return memoryDiagnostics.get(memoryKey(userId, courseVersionId)) ?? null;
  const row = await db.prepare(`SELECT questions_json AS questionsJson, answers_json AS answersJson,
      known_modules_json AS knownModulesJson, completed_at AS completedAt
    FROM diagnostics WHERE user_id = ? AND course_version_id = ?`).bind(userId, courseVersionId).first<DiagnosticRow>();
  if (!row) return null;
  return { questions: parse<DiagnosticQuestion[]>(row.questionsJson) ?? [], answers: parse<number[]>(row.answersJson), knownModules: parse<number[]>(row.knownModulesJson), completedAt: row.completedAt };
}

/** Stores a new diagnostic; if one already exists for this course, the stored one is returned. */
export async function saveDiagnostic(db: D1Database | null, userId: string, courseVersionId: string, questions: DiagnosticQuestion[], now: number) {
  if (!db) {
    const key = memoryKey(userId, courseVersionId);
    if (!memoryDiagnostics.has(key)) memoryDiagnostics.set(key, { questions, answers: null, knownModules: null, completedAt: null });
    return memoryDiagnostics.get(key)!;
  }
  await db.prepare(`INSERT INTO diagnostics (id, user_id, course_version_id, questions_json, created_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, course_version_id) DO NOTHING`)
    .bind(crypto.randomUUID(), userId, courseVersionId, JSON.stringify(questions), now).run();
  return (await getDiagnostic(db, userId, courseVersionId))!;
}

/** Records answers once. Returns false if the diagnostic was already completed. */
export async function completeDiagnostic(db: D1Database | null, userId: string, courseVersionId: string, answers: number[], knownModules: number[], now: number) {
  if (!db) {
    const stored = memoryDiagnostics.get(memoryKey(userId, courseVersionId));
    if (!stored || stored.completedAt) return false;
    Object.assign(stored, { answers, knownModules, completedAt: now });
    return true;
  }
  const result = await db.prepare(`UPDATE diagnostics SET answers_json = ?, known_modules_json = ?, completed_at = ?
    WHERE user_id = ? AND course_version_id = ? AND completed_at IS NULL`)
    .bind(JSON.stringify(answers), JSON.stringify(knownModules), now, userId, courseVersionId).run();
  return Boolean(result.meta.changes);
}

/** Known modules per course version from completed diagnostics. */
export async function getPlacements(db: D1Database | null, userId: string): Promise<Record<string, number[]>> {
  if (!db) {
    return Object.fromEntries([...memoryDiagnostics.entries()]
      .filter(([key, value]) => key.startsWith(`${userId}|`) && value.completedAt)
      .map(([key, value]) => [key.split("|")[1], value.knownModules ?? []]));
  }
  const rows = (await db.prepare(`SELECT course_version_id AS courseVersionId, known_modules_json AS knownModulesJson
    FROM diagnostics WHERE user_id = ? AND completed_at IS NOT NULL`).bind(userId).all<{ courseVersionId: string; knownModulesJson: string | null }>()).results ?? [];
  return Object.fromEntries(rows.map((row) => [row.courseVersionId, parse<number[]>(row.knownModulesJson) ?? []]));
}
