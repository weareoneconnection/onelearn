import { z } from "zod";

export const practiceQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctOption: z.number().int(),
  explanation: z.string(),
}).refine((question) => question.correctOption >= 0 && question.correctOption < question.options.length, {
  message: "correctOption must reference an available option",
  path: ["correctOption"],
});

export const lessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  objective: z.string(),
  durationMinutes: z.number().int(),
  sections: z.array(z.object({ heading: z.string(), body: z.string() })).min(1),
  keyPoints: z.array(z.string()).min(1),
  workedExample: z.object({
    scenario: z.string(),
    steps: z.array(z.string()).min(1),
    takeaway: z.string(),
  }),
  checkpointQuestion: z.string(),
  expectedAnswer: z.string(),
  practice: z.array(practiceQuestionSchema).min(1),
});

export const curriculumSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  overview: z.string(),
  audience: z.string(),
  difficulty: z.string(),
  estimatedHours: z.number(),
  learningOutcomes: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()),
  safetyNotice: z.string(),
  modules: z.array(z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    estimatedMinutes: z.number().int(),
    lessons: z.array(z.object({
      id: z.string(),
      title: z.string(),
      objective: z.string(),
      durationMinutes: z.number().int(),
    })).min(1),
  })).min(1),
  firstLesson: lessonSchema,
});

export type GeneratedLesson = z.infer<typeof lessonSchema>;
export type GeneratedCurriculum = z.infer<typeof curriculumSchema>;

export type GeneratedCourseBundle = {
  curriculum: GeneratedCurriculum;
  generation: {
    responseId: string;
    model: string;
    generatedAt: string;
    locale: "zh" | "en";
    grounding: "model_knowledge" | "provided_source";
  };
};

const strictObject = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

export const lessonJsonSchema = strictObject({
  id: { type: "string" },
  title: { type: "string" },
  objective: { type: "string" },
  durationMinutes: { type: "integer" },
  sections: {
    type: "array",
    items: strictObject({ heading: { type: "string" }, body: { type: "string" } }, ["heading", "body"]),
  },
  keyPoints: { type: "array", items: { type: "string" } },
  workedExample: strictObject({
    scenario: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    takeaway: { type: "string" },
  }, ["scenario", "steps", "takeaway"]),
  checkpointQuestion: { type: "string" },
  expectedAnswer: { type: "string" },
  practice: {
    type: "array",
    items: strictObject({
      id: { type: "string" },
      question: { type: "string" },
      options: { type: "array", items: { type: "string" } },
      correctOption: { type: "integer" },
      explanation: { type: "string" },
    }, ["id", "question", "options", "correctOption", "explanation"]),
  },
}, ["id", "title", "objective", "durationMinutes", "sections", "keyPoints", "workedExample", "checkpointQuestion", "expectedAnswer", "practice"]);

export const curriculumJsonSchema = strictObject({
  title: { type: "string" },
  subtitle: { type: "string" },
  overview: { type: "string" },
  audience: { type: "string" },
  difficulty: { type: "string" },
  estimatedHours: { type: "number" },
  learningOutcomes: { type: "array", items: { type: "string" } },
  prerequisites: { type: "array", items: { type: "string" } },
  safetyNotice: { type: "string" },
  modules: {
    type: "array",
    items: strictObject({
      id: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      estimatedMinutes: { type: "integer" },
      lessons: {
        type: "array",
        items: strictObject({
          id: { type: "string" },
          title: { type: "string" },
          objective: { type: "string" },
          durationMinutes: { type: "integer" },
        }, ["id", "title", "objective", "durationMinutes"]),
      },
    }, ["id", "title", "summary", "estimatedMinutes", "lessons"]),
  },
  firstLesson: lessonJsonSchema,
}, ["title", "subtitle", "overview", "audience", "difficulty", "estimatedHours", "learningOutcomes", "prerequisites", "safetyNotice", "modules", "firstLesson"]);
