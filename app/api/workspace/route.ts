import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, loadWorkspace, resolveLearner, savePreference } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

const preferenceSchema = z.object({ locale: z.enum(["zh", "en"]) });

async function handleGET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  const workspace = await loadWorkspace(learner);
  return NextResponse.json({
    identity: { displayName: learner.displayName, email: learner.email, mode: learner.mode, admin: isAdmin(learner) },
    workspace,
  });
}

async function handlePATCH(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid preference", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  const storage = await savePreference(learner, parsed.data.locale);
  return NextResponse.json({ saved: true, storage });
}

export const GET = withApiErrors("/api/workspace", handleGET);
export const PATCH = withApiErrors("/api/workspace", handlePATCH);
