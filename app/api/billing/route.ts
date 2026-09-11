import { NextRequest, NextResponse } from "next/server";
import { getBillingSummary, PLAN_CATALOG } from "@/lib/onelearn/billing";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

async function handleGET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  return NextResponse.json({
    identity: { displayName: learner.displayName, email: learner.email, mode: learner.mode },
    plans: Object.values(PLAN_CATALOG),
    billing: await getBillingSummary(learner),
  });
}

export const GET = withApiErrors("/api/billing", handleGET);
