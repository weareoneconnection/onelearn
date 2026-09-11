import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getD1 } from "@/db";
import { isAdmin, loadWorkspace, resolveLearner, savePreference } from "@/lib/onelearn/persistence";
import { getEmailReminders, setEmailReminders } from "@/lib/onelearn/reminders";
import { withApiErrors } from "@/lib/onelearn/api-errors";

const preferenceSchema = z.object({ locale: z.enum(["zh", "en"]), emailReminders: z.boolean().optional() });

async function handleGET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  const workspace = await loadWorkspace(learner);
  const db = await getD1();
  return NextResponse.json({
    identity: { displayName: learner.displayName, email: learner.email, mode: learner.mode, admin: isAdmin(learner) },
    preferences: { emailReminders: db && learner.mode !== "device" ? await getEmailReminders(db, learner.userId) : null },
    workspace,
  });
}

async function handlePATCH(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid preference", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  const storage = await savePreference(learner, parsed.data.locale);
  // Reminder emails only exist for signed-in learners with a real address.
  if (typeof parsed.data.emailReminders === "boolean" && learner.mode !== "device") {
    const db = await getD1();
    if (db) await setEmailReminders(db, learner.userId, parsed.data.emailReminders, Math.floor(Date.now() / 1000));
  }
  return NextResponse.json({ saved: true, storage });
}

export const GET = withApiErrors("/api/workspace", handleGET);
export const PATCH = withApiErrors("/api/workspace", handlePATCH);
