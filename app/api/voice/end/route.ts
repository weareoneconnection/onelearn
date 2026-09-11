import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getD1 } from "@/db";
import { getEffectivePlanId } from "@/lib/onelearn/billing";
import { recordLearningEvent, resolveLearner } from "@/lib/onelearn/persistence";
import { endVoiceSession, voiceUsage } from "@/lib/onelearn/voice";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

const requestSchema = z.object({ locale: z.enum(["zh", "en"]), sessionId: z.string().min(1).max(100) });

/** Settles a voice session on server time and returns the remaining monthly allowance. */
async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  const db = await getD1();
  if (!db || learner.mode === "device") return NextResponse.json({ error: "Unavailable", code: "unavailable" }, { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  const ended = await endVoiceSession(db, { sessionId: parsed.data.sessionId, userId: learner.userId, now });
  if (!ended) return NextResponse.json({ error: "Session not found", code: "not_found" }, { status: 404 });
  if (!ended.alreadyEnded && ended.usedSeconds > 0) {
    await recordLearningEvent(learner, "tutor_turn", { voice: true, seconds: ended.usedSeconds, lessonId: ended.lessonId }, ended.courseVersionId);
  }
  const usage = await voiceUsage(db, learner.userId, await getEffectivePlanId(learner), now);
  return NextResponse.json({ usedSeconds: ended.usedSeconds, remainingSeconds: usage.remainingSeconds });
}

export const POST = withApiErrors("/api/voice/end", handlePOST);
