import { NextRequest, NextResponse } from "next/server";
import { runReviewReminders } from "@/lib/onelearn/reminders";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

/** Daily job (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
async function handleGET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Cron is not configured", code: "cron_not_configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runReviewReminders());
}

export const GET = withApiErrors("/api/cron/review-reminders", handleGET);
