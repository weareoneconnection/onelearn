import { NextRequest, NextResponse } from "next/server";
import { getBillingSummary, PLAN_CATALOG } from "@/lib/onelearn/billing";
import { resolveLearner } from "@/lib/onelearn/persistence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  return NextResponse.json({
    identity: { displayName: learner.displayName, email: learner.email, mode: learner.mode },
    plans: Object.values(PLAN_CATALOG),
    billing: await getBillingSummary(learner),
  });
}
