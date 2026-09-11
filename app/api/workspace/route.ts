import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin, loadWorkspace, resolveLearner, savePreference } from "@/lib/onelearn/persistence";

const preferenceSchema = z.object({ locale: z.enum(["zh", "en"]) });

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  const workspace = await loadWorkspace(learner);
  return NextResponse.json({
    identity: { displayName: learner.displayName, email: learner.email, mode: learner.mode, admin: isAdmin(learner) },
    workspace,
  });
}

export async function PATCH(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid preference", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  const storage = await savePreference(learner, parsed.data.locale);
  return NextResponse.json({ saved: true, storage });
}
