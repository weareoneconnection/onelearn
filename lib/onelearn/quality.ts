import {
  qualityReportJsonSchema,
  qualityReportSchema,
  type GeneratedCurriculum,
  type SourceCitation,
} from "./generated-course";
import { createStructuredResponse } from "./openai";

export async function evaluateCurriculum(args: {
  curriculum: GeneratedCurriculum;
  citations: SourceCitation[];
  locale: "zh" | "en";
}) {
  const outputLanguage = args.locale === "zh" ? "Simplified Chinese" : "English";
  const result = await createStructuredResponse<unknown>({
    name: "onelearn_course_quality_report",
    schema: qualityReportJsonSchema,
    instructions: [
      "You are OneLearn Quality Gate, an independent curriculum evaluator.",
      `Write the report in ${outputLanguage}.`,
      "Score factual grounding, coverage, pedagogy, safety, and clarity from 0 to 100.",
      "Check that objectives are measurable, lessons form a coherent progression, practice matches the lesson, and high-risk claims are appropriately bounded.",
      "When source excerpts are supplied, flag claims that contradict or exceed them. When no sources are supplied, state that factual verification is limited and do not pretend to have verified external facts.",
      "Set status to blocked for severe safety or factual failures, review for any material issue or score below 80, and passed only when the course is safe and the overall score is at least 80.",
    ].join(" "),
    input: JSON.stringify({ curriculum: args.curriculum, retrievedSources: args.citations }),
    maxOutputTokens: 3_500,
    promptCacheKey: "onelearn-quality-v1",
  });
  const parsed = qualityReportSchema.parse(result.data);
  const hasHighSeverityIssue = parsed.issues.some((issue) => issue.severity === "high");
  const status = hasHighSeverityIssue || parsed.dimensions.safety < 60
    ? "blocked" as const
    : parsed.overallScore < 80 || parsed.status !== "passed"
      ? "review" as const
      : "passed" as const;
  return { ...result, data: { ...parsed, status } };
}
