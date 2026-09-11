import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordLearningEvent, resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

const eventSchema = z.object({
  locale: z.enum(["zh", "en"]),
  courseVersionId: z.string().max(100).nullable().optional(),
  eventType: z.enum(["course_opened", "lesson_started", "tutor_turn", "practice_answered", "review_completed"]),
  payload: z.record(z.unknown()).default({}),
});

async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid learning event", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  await recordLearningEvent(learner, parsed.data.eventType, parsed.data.payload, parsed.data.courseVersionId);
  return NextResponse.json({ recorded: true });
}

export const POST = withApiErrors("/api/progress", handlePOST);
