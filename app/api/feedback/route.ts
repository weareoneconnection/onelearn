import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FEEDBACK_CATEGORIES, FeedbackLimitError, setFeedbackStatus, submitFeedback } from "@/lib/onelearn/feedback";
import { isAdmin, resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

const submitSchema = z.object({
  locale: z.enum(["zh", "en"]),
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(5).max(4000),
  page: z.string().max(100).nullable().optional(),
});

const statusSchema = z.object({
  locale: z.enum(["zh", "en"]),
  id: z.string().min(1).max(100),
  status: z.enum(["open", "resolved"]),
});

async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(raw);
  const zh = !(raw && typeof raw === "object" && "locale" in raw && raw.locale === "en");
  if (!parsed.success) return NextResponse.json({ error: zh ? "请至少写 5 个字描述问题" : "Please describe the issue in at least 5 characters", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  try {
    const item = await submitFeedback(learner, parsed.data);
    return NextResponse.json({ id: item.id, received: true });
  } catch (error) {
    if (error instanceof FeedbackLimitError) return NextResponse.json({ error: zh ? "今天的反馈次数已达上限，请明天再试或发送邮件联系我们" : "Daily feedback limit reached. Please try tomorrow or email us.", code: "feedback_limit" }, { status: 429 });
    throw error;
  }
}

async function handlePATCH(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  if (!isAdmin(learner)) return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
  const updated = await setFeedbackStatus(parsed.data.id, parsed.data.status);
  return updated ? NextResponse.json({ updated: true }) : NextResponse.json({ error: "Not found", code: "not_found" }, { status: 404 });
}

export const POST = withApiErrors("/api/feedback", handlePOST);
export const PATCH = withApiErrors("/api/feedback", handlePATCH);
