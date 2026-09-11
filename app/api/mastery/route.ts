import { NextRequest, NextResponse } from "next/server";
import { getMasteryOverview } from "@/lib/onelearn/mastery-store";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  return NextResponse.json(await getMasteryOverview(learner));
}

export const GET = withApiErrors("/api/mastery", handleGET);
