import { NextRequest, NextResponse } from "next/server";
import { getBillingCustomerId } from "@/lib/onelearn/billing";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { createBillingPortalSession, StripeConfigurationError, StripeResponseError } from "@/lib/onelearn/stripe";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

function trustedOrigin(request: NextRequest) {
  const configured = process.env.ONELEARN_SITE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error("invalid_site_url");
    return url.origin;
  }
  return request.nextUrl.origin;
}

async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null) as { locale?: string } | null;
  const locale = raw?.locale === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  if (learner.mode !== "chatgpt") return NextResponse.json({ error: locale === "zh" ? "请先登录" : "Sign in first", code: "authentication_required" }, { status: 401 });
  const customerId = await getBillingCustomerId(learner.userId);
  if (!customerId) return NextResponse.json({ error: locale === "zh" ? "当前没有可管理的付费订阅" : "There is no paid subscription to manage", code: "subscription_not_found" }, { status: 404 });
  try {
    const session = await createBillingPortalSession(customerId, trustedOrigin(request));
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeConfigurationError) console.error("Billing configuration error:", error.message);
    else if (error instanceof StripeResponseError) console.error("Stripe portal error:", error.message, error.code ?? "");
    else console.error("Billing portal error:", error);
    return NextResponse.json({ error: locale === "zh" ? "暂时无法打开订阅管理" : "Subscription management is temporarily unavailable", code: "portal_failed" }, { status: 502 });
  }
}

export const POST = withApiErrors("/api/billing/portal", handlePOST);
