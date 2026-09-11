import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MasteryInputError, recordPracticeAnswer } from "@/lib/onelearn/mastery-store";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

const schema = z.object({
  locale: z.enum(["zh", "en"]),
  courseVersionId: z.string().min(1).max(100),
  lessonId: z.string().min(1).max(100),
  questionId: z.string().min(1).max(100),
  selected: z.number().int().min(0).max(20),
  mode: z.enum(["practice", "review"]).default("practice"),
});

async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answer", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  try {
    return NextResponse.json(await recordPracticeAnswer(learner, parsed.data));
  } catch (error) {
    if (error instanceof MasteryInputError) {
      return NextResponse.json({ error: parsed.data.locale === "zh" ? "找不到这门课程或题目" : "Course or question not found", code: error.code }, { status: 404 });
    }
    throw error;
  }
}

export const POST = withApiErrors("/api/mastery/answer", handlePOST);
