import { NextRequest, NextResponse } from "next/server";
import {
  beginBillingEvent,
  completeBillingEvent,
  findUserIdByCustomer,
  getStoredSubscription,
  isBillingInterval,
  isPaidPlanId,
  upsertInvoice,
  upsertSubscription,
} from "@/lib/onelearn/billing";
import {
  resolvePlanFromPriceId,
  retrieveStripeSubscription,
  type StripeSubscription,
  StripeConfigurationError,
  StripeResponseError,
  verifyStripeWebhook,
} from "@/lib/onelearn/stripe";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  if (typeof value === "string") return value;
  const record = objectRecord(value);
  return typeof record.id === "string" ? record.id : null;
}

async function syncSubscription(subscription: StripeSubscription, fallbackUserId?: string | null) {
  const stored = await getStoredSubscription(subscription.id);
  const metadata = subscription.metadata ?? {};
  const customerId = stringValue(subscription.customer);
  if (!customerId) return;
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const priceMatch = resolvePlanFromPriceId(priceId);
  const rawPlanId = metadata.plan_id ?? priceMatch?.planId ?? stored?.planId;
  const rawInterval = metadata.billing_interval ?? subscription.items?.data?.[0]?.price?.recurring?.interval ?? priceMatch?.interval ?? stored?.billingInterval;
  const userId = metadata.user_id ?? fallbackUserId ?? stored?.userId ?? await findUserIdByCustomer(customerId);
  if (!userId || !isPaidPlanId(rawPlanId) || !isBillingInterval(rawInterval)) return;
  await upsertSubscription({
    userId,
    subscriptionId: subscription.id,
    customerId,
    planId: rawPlanId,
    billingInterval: rawInterval,
    status: subscription.status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodStart: subscription.current_period_start ?? null,
    currentPeriodEnd: subscription.current_period_end ?? null,
  });
}

async function processEvent(type: string, object: Record<string, unknown>) {
  if (type === "checkout.session.completed") {
    const subscriptionId = stringValue(object.subscription);
    const userId = typeof object.client_reference_id === "string"
      ? object.client_reference_id
      : typeof objectRecord(object.metadata).user_id === "string" ? String(objectRecord(object.metadata).user_id) : null;
    if (subscriptionId) await syncSubscription(await retrieveStripeSubscription(subscriptionId), userId);
    return;
  }
  if (type === "customer.subscription.created" || type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    await syncSubscription(object as StripeSubscription);
    return;
  }
  if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const invoice = object;
    const parent = objectRecord(invoice.parent);
    const subscriptionDetails = objectRecord(parent.subscription_details);
    const subscriptionId = stringValue(invoice.subscription) ?? stringValue(subscriptionDetails.subscription);
    const customerId = stringValue(invoice.customer);
    const stored = subscriptionId ? await getStoredSubscription(subscriptionId) : null;
    const userId = stored?.userId ?? (customerId ? await findUserIdByCustomer(customerId) : null);
    const transitions = objectRecord(invoice.status_transitions);
    await upsertInvoice({
      id: String(invoice.id),
      userId,
      subscriptionId,
      amountPaid: Number(invoice.amount_paid ?? 0),
      currency: typeof invoice.currency === "string" ? invoice.currency : "cny",
      status: typeof invoice.status === "string" ? invoice.status : type === "invoice.paid" ? "paid" : "failed",
      hostedInvoiceUrl: typeof invoice.hosted_invoice_url === "string" ? invoice.hosted_invoice_url : null,
      paidAt: typeof transitions.paid_at === "number" ? transitions.paid_at : null,
      createdAt: typeof invoice.created === "number" ? invoice.created : null,
    });
  }
}

async function handlePOST(request: NextRequest) {
  const rawBody = await request.text();
  try {
    const event = await verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));
    if (!event.id || !event.type || !event.data?.object) throw new StripeResponseError("Invalid Stripe event", "invalid_event");
    const shouldProcess = await beginBillingEvent(event.id, event.type, Boolean(event.livemode));
    if (!shouldProcess) return NextResponse.json({ received: true, duplicate: true });
    await processEvent(event.type, event.data.object);
    await completeBillingEvent(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof StripeConfigurationError || error instanceof StripeResponseError) {
      console.error("Stripe webhook rejected:", error.message, error instanceof StripeResponseError ? error.code ?? "" : "");
      return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
    }
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}

export const POST = withApiErrors("/api/billing/webhook", handlePOST);
