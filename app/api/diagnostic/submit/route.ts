import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getD1 } from "@/db";
import { completeDiagnostic, getDiagnostic, gradeDiagnostic } from "@/lib/onelearn/diagnostic";
import { getOwnedCourseBundle, resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  locale: z.enum(["zh", "en"]),
  courseVersionId: z.string().min(1).max(100),
  answers: z.array(z.number().int().min(-1).max(10)).max(8),
});

/** Grades the diagnostic on the server. Submitting twice returns the first result. */
async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "invalid_request" }, { status: 400 });
  const { locale, courseVersionId, answers } = parsed.data;
  const learner = await resolveLearner(request, locale);
  if (!await getOwnedCourseBundle(learner, courseVersionId)) return NextResponse.json({ error: "Course not found", code: "course_not_found" }, { status: 404 });

  const db = await getD1();
  const diagnostic = await getDiagnostic(db, learner.userId, courseVersionId);
  if (!diagnostic) return NextResponse.json({ error: "Diagnostic not started", code: "diagnostic_not_found" }, { status: 404 });
  if (diagnostic.completedAt) {
    return NextResponse.json({ questions: diagnostic.questions, answers: diagnostic.answers, ...gradeDiagnostic(diagnostic.questions, diagnostic.answers ?? []) });
  }
  const graded = gradeDiagnostic(diagnostic.questions, answers);
  await completeDiagnostic(db, learner.userId, courseVersionId, answers, graded.knownModules, Math.floor(Date.now() / 1000));
  const final = await getDiagnostic(db, learner.userId, courseVersionId);
  const finalAnswers = final?.answers ?? answers;
  return NextResponse.json({ questions: diagnostic.questions, answers: finalAnswers, ...gradeDiagnostic(diagnostic.questions, finalAnswers) });
}

export const POST = withApiErrors("/api/diagnostic/submit", handlePOST);
