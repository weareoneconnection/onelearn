import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBillingCustomerId, getBillingSummary } from "@/lib/onelearn/billing";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { billingCurrency, createBillingPortalSession, createCheckoutSession, StripeConfigurationError, StripeResponseError } from "@/lib/onelearn/stripe";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.enum(["personal", "pro"]),
  interval: z.enum(["month", "year"]),
  locale: z.enum(["zh", "en"]),
});

function trustedOrigin(request: NextRequest) {
  const configured = process.env.ONELEARN_SITE_URL?.trim();
  if (configured) {
    const url = new URL(configured);
    if (url.protocol !== "https:") throw new Error("invalid_site_url");
    return url.origin;
  }
  if (request.nextUrl.protocol === "https:" || request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1") return request.nextUrl.origin;
  throw new Error("invalid_site_url");
}

async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  const locale = raw && typeof raw === "object" && "locale" in raw && raw.locale === "en" ? "en" : "zh";
  if (!parsed.success) return NextResponse.json({ error: locale === "zh" ? "套餐选择不正确" : "Invalid plan selection", code: "invalid_request" }, { status: 400 });
  const learner = await resolveLearner(request, parsed.data.locale);
  if (learner.mode === "device") {
    return NextResponse.json({
      error: parsed.data.locale === "zh" ? "请先登录，再开通会员" : "Sign in before starting a subscription",
      code: "authentication_required",
      signInUrl: "/signin-with-chatgpt?return_to=%2F%3Fview%3Dbilling",
    }, { status: 401 });
  }
  try {
    const customerId = await getBillingCustomerId(learner.userId);
    const current = await getBillingSummary(learner);
    if (customerId && current.subscription && ["active", "trialing"].includes(current.subscription.status ?? "")) {
      const portal = await createBillingPortalSession(customerId, trustedOrigin(request));
      return NextResponse.json({ url: portal.url, mode: "portal" });
    }
    const session = await createCheckoutSession({
      userId: learner.userId,
      email: learner.email,
      customerId,
      planId: parsed.data.planId,
      interval: parsed.data.interval,
      currency: billingCurrency(parsed.data.locale),
      origin: trustedOrigin(request),
      trialDays: current.trialDays,
    });
    if (!session.url) throw new StripeResponseError("Stripe Checkout did not return a URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      console.error("Billing configuration error:", error.message);
      return NextResponse.json({ error: parsed.data.locale === "zh" ? "支付通道正在配置，请稍后再试" : "Payments are still being configured", code: "billing_not_configured" }, { status: 503 });
    }
    if (error instanceof StripeResponseError) console.error("Stripe Checkout error:", error.message, error.code ?? "");
    else console.error("Checkout error:", error);
    return NextResponse.json({ error: parsed.data.locale === "zh" ? "暂时无法打开安全收银台" : "The secure checkout is temporarily unavailable", code: "checkout_failed" }, { status: 502 });
  }
}

export const POST = withApiErrors("/api/billing/checkout", handlePOST);
