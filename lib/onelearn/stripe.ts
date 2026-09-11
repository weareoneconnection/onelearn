import type { BillingInterval, PaidPlanId } from "./billing";

const STRIPE_API = "https://api.stripe.com/v1";

type StripeErrorResponse = { error?: { message?: string; code?: string } };

export class StripeConfigurationError extends Error {}
export class StripeResponseError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

function secretKey() {
  const value = process.env.STRIPE_SECRET_KEY?.trim();
  if (!value) throw new StripeConfigurationError("STRIPE_SECRET_KEY is not configured");
  return value;
}

function priceEnvironmentName(planId: PaidPlanId, interval: BillingInterval) {
  return `STRIPE_PRICE_${planId.toUpperCase()}_${interval === "month" ? "MONTHLY" : "ANNUAL"}`;
}

export function getStripePriceId(planId: PaidPlanId, interval: BillingInterval) {
  const environmentName = priceEnvironmentName(planId, interval);
  const value = process.env[environmentName]?.trim();
  if (!value) throw new StripeConfigurationError(`${environmentName} is not configured`);
  return value;
}

export function resolvePlanFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  const candidates: Array<[PaidPlanId, BillingInterval]> = [
    ["personal", "month"], ["personal", "year"], ["pro", "month"], ["pro", "year"],
  ];
  for (const [planId, interval] of candidates) {
    if (process.env[priceEnvironmentName(planId, interval)]?.trim() === priceId) return { planId, interval };
  }
  return null;
}

async function stripeRequest<T>(path: string, init: { method?: "GET" | "POST"; body?: URLSearchParams } = {}) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init.body,
  });
  const payload = await response.json().catch(() => ({})) as T & StripeErrorResponse;
  if (!response.ok) throw new StripeResponseError(payload.error?.message ?? "Stripe request failed", payload.error?.code);
  return payload;
}

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(args: {
  userId: string;
  email: string;
  customerId?: string | null;
  planId: "personal" | "pro";
  interval: BillingInterval;
  origin: string;
  trialDays?: number;
}) {
  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", getStripePriceId(args.planId, args.interval));
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", `${args.origin}/?view=billing&checkout=success`);
  body.set("cancel_url", `${args.origin}/?view=billing&checkout=cancelled`);
  body.set("client_reference_id", args.userId);
  body.set("metadata[user_id]", args.userId);
  body.set("metadata[plan_id]", args.planId);
  body.set("metadata[billing_interval]", args.interval);
  body.set("subscription_data[metadata][user_id]", args.userId);
  body.set("subscription_data[metadata][plan_id]", args.planId);
  body.set("subscription_data[metadata][billing_interval]", args.interval);
  if (args.trialDays && args.trialDays > 0) body.set("subscription_data[trial_period_days]", String(args.trialDays));
  body.set("allow_promotion_codes", "true");
  body.set("billing_address_collection", "auto");
  body.set("locale", "auto");
  if (args.customerId) body.set("customer", args.customerId);
  else body.set("customer_email", args.email);
  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", { method: "POST", body });
}

export async function createBillingPortalSession(customerId: string, origin: string) {
  const body = new URLSearchParams({ customer: customerId, return_url: `${origin}/?view=billing` });
  return stripeRequest<{ id: string; url: string }>("/billing_portal/sessions", { method: "POST", body });
}

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string; recurring?: { interval?: string } } }> };
};

export async function retrieveStripeSubscription(subscriptionId: string) {
  return stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

function parseSignatureHeader(value: string) {
  const parts = value.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, signature]) => signature);
  return { timestamp, signatures };
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function verifyStripeWebhook(rawBody: string, signatureHeader: string | null) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) throw new StripeConfigurationError("STRIPE_WEBHOOK_SECRET is not configured");
  if (!signatureHeader) throw new StripeResponseError("Missing Stripe-Signature header", "missing_signature");
  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
  if (!timestamp || !signatures.length) throw new StripeResponseError("Invalid Stripe-Signature header", "invalid_signature");
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Math.floor(Date.now() / 1000) - timestampNumber) > 300) {
    throw new StripeResponseError("Expired Stripe webhook signature", "expired_signature");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = toHex(signed);
  if (!signatures.some((signature) => constantTimeEqual(signature, expected))) {
    throw new StripeResponseError("Invalid Stripe webhook signature", "invalid_signature");
  }
  return JSON.parse(rawBody) as StripeEvent;
}

export type StripeEvent = {
  id: string;
  type: string;
  livemode: boolean;
  data: { object: Record<string, unknown> };
};
