import { getD1 } from "@/db";
import type { LearnerIdentity } from "./persistence";

export type PlanId = "free" | "personal" | "pro" | "team";
export type PaidPlanId = Exclude<PlanId, "free">;
export type BillingInterval = "month" | "year";
export type BillableAction = "course_generation" | "lesson_generation" | "tutor_turn" | "source_index";
export type BillingLimitCode = "monthly_credit_limit" | "source_limit" | "source_storage_limit";

export type PlanDefinition = {
  id: PlanId;
  nameZh: string;
  nameEn: string;
  monthlyPriceCny: number | null;
  annualPriceCny: number | null;
  aiCredits: number;
  sourceCount: number;
  sourceBytes: number;
  courseEquivalent: number;
  tutorEquivalent: number;
};

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free", nameZh: "免费版", nameEn: "Free", monthlyPriceCny: 0, annualPriceCny: 0,
    aiCredits: 100, sourceCount: 3, sourceBytes: 20 * 1024 * 1024, courseEquivalent: 1, tutorEquivalent: 30,
  },
  personal: {
    id: "personal", nameZh: "个人版", nameEn: "Personal", monthlyPriceCny: 39, annualPriceCny: 299,
    aiCredits: 800, sourceCount: 20, sourceBytes: 100 * 1024 * 1024, courseEquivalent: 5, tutorEquivalent: 300,
  },
  pro: {
    id: "pro", nameZh: "专业版", nameEn: "Pro", monthlyPriceCny: 99, annualPriceCny: 799,
    aiCredits: 3_000, sourceCount: 100, sourceBytes: 500 * 1024 * 1024, courseEquivalent: 20, tutorEquivalent: 1_200,
  },
  team: {
    id: "team", nameZh: "团队版", nameEn: "Team", monthlyPriceCny: 79, annualPriceCny: 790,
    aiCredits: 4_000, sourceCount: 300, sourceBytes: 2 * 1024 * 1024 * 1024, courseEquivalent: 30, tutorEquivalent: 1_600,
  },
};

const ACTION_CREDITS: Record<BillableAction, number> = {
  course_generation: 30,
  lesson_generation: 6,
  tutor_turn: 1,
  source_index: 4,
};

const activeStatuses = new Set(["active", "trialing"]);
const monthKey = () => new Date().toISOString().slice(0, 7);
const nowSeconds = () => Math.floor(Date.now() / 1000);

const memory = globalThis as typeof globalThis & {
  __onelearnBillingMemory?: Map<string, number>;
};
const memoryUsage = memory.__onelearnBillingMemory ??= new Map<string, number>();

export class BillingLimitError extends Error {
  constructor(public readonly code: BillingLimitCode) {
    super(code);
  }
}

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return value === "personal" || value === "pro" || value === "team";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

export function creditsForAction(action?: BillableAction) {
  return action ? ACTION_CREDITS[action] : 0;
}

export async function getEffectivePlanId(learner: LearnerIdentity): Promise<PlanId> {
  const db = await getD1();
  if (!db) return "free";
  const row = await db.prepare(`SELECT plan_id AS planId, status FROM subscriptions
    WHERE user_id = ? AND status IN ('active', 'trialing')
    ORDER BY updated_at DESC LIMIT 1`).bind(learner.userId).first<{ planId: string; status: string }>();
  return row && isPaidPlanId(row.planId) && activeStatuses.has(row.status) ? row.planId : "free";
}

export async function consumeAiCredits(learner: LearnerIdentity, action?: BillableAction) {
  const credits = creditsForAction(action);
  const planId = await getEffectivePlanId(learner);
  const limit = PLAN_CATALOG[planId].aiCredits;
  const month = monthKey();
  if (!credits) return { planId, creditsUsed: 0, creditsLimit: limit, charged: 0 };
  if (credits > limit) throw new BillingLimitError("monthly_credit_limit");

  const db = await getD1();
  if (!db) {
    const key = `${learner.userId}:${month}`;
    const used = memoryUsage.get(key) ?? 0;
    if (used + credits > limit) throw new BillingLimitError("monthly_credit_limit");
    memoryUsage.set(key, used + credits);
    return { planId, creditsUsed: used + credits, creditsLimit: limit, charged: credits };
  }

  const result = await db.prepare(`INSERT INTO entitlement_usage
      (id, user_id, month, metric, quantity, updated_at)
    VALUES (?, ?, ?, 'ai_credits', ?, ?)
    ON CONFLICT(user_id, month, metric) DO UPDATE SET
      quantity = entitlement_usage.quantity + excluded.quantity,
      updated_at = excluded.updated_at
    WHERE entitlement_usage.quantity + excluded.quantity <= ?`)
    .bind(crypto.randomUUID(), learner.userId, month, credits, nowSeconds(), limit).run();
  if (!result.meta.changes) throw new BillingLimitError("monthly_credit_limit");
  const row = await db.prepare(`SELECT quantity FROM entitlement_usage
    WHERE user_id = ? AND month = ? AND metric = 'ai_credits'`)
    .bind(learner.userId, month).first<{ quantity: number }>();
  return { planId, creditsUsed: Number(row?.quantity ?? credits), creditsLimit: limit, charged: credits };
}

export async function refundAiCredits(learner: LearnerIdentity, action?: BillableAction) {
  const credits = creditsForAction(action);
  if (!credits) return;
  const month = monthKey();
  const db = await getD1();
  if (!db) {
    const key = `${learner.userId}:${month}`;
    memoryUsage.set(key, Math.max(0, (memoryUsage.get(key) ?? 0) - credits));
    return;
  }
  await db.prepare(`UPDATE entitlement_usage SET quantity = MAX(0, quantity - ?), updated_at = ?
    WHERE user_id = ? AND month = ? AND metric = 'ai_credits'`)
    .bind(credits, nowSeconds(), learner.userId, month).run();
}

export async function assertSourceCapacity(learner: LearnerIdentity, incomingBytes: number) {
  const planId = await getEffectivePlanId(learner);
  const plan = PLAN_CATALOG[planId];
  const db = await getD1();
  if (!db) return { planId, sourceCount: 0, sourceBytes: 0, limits: plan };
  const row = await db.prepare(`SELECT COUNT(*) AS sourceCount, COALESCE(SUM(size_bytes), 0) AS sourceBytes
    FROM source_documents WHERE user_id = ? AND status != 'failed'`)
    .bind(learner.userId).first<{ sourceCount: number; sourceBytes: number }>();
  const sourceCount = Number(row?.sourceCount ?? 0);
  const sourceBytes = Number(row?.sourceBytes ?? 0);
  if (sourceCount >= plan.sourceCount) throw new BillingLimitError("source_limit");
  if (sourceBytes + incomingBytes > plan.sourceBytes) throw new BillingLimitError("source_storage_limit");
  return { planId, sourceCount, sourceBytes, limits: plan };
}

export async function getBillingSummary(learner: LearnerIdentity) {
  const db = await getD1();
  const month = monthKey();
  if (!db) {
    const used = memoryUsage.get(`${learner.userId}:${month}`) ?? 0;
    return {
      storage: "ephemeral" as const,
      configured: false,
      plan: PLAN_CATALOG.free,
      subscription: null,
      usage: { month, aiCreditsUsed: used, aiCreditsRemaining: Math.max(0, PLAN_CATALOG.free.aiCredits - used), sources: 0, sourceBytes: 0 },
      invoices: [],
    };
  }
  const [subscriptionResult, usageResult, sourcesResult, customerResult, invoicesResult] = await db.batch([
    db.prepare(`SELECT plan_id AS planId, billing_interval AS billingInterval, status,
        cancel_at_period_end AS cancelAtPeriodEnd, current_period_end AS currentPeriodEnd
      FROM subscriptions WHERE user_id = ?
      ORDER BY CASE WHEN status IN ('active', 'trialing') THEN 0 ELSE 1 END, updated_at DESC LIMIT 1`).bind(learner.userId),
    db.prepare(`SELECT quantity FROM entitlement_usage
      WHERE user_id = ? AND month = ? AND metric = 'ai_credits'`).bind(learner.userId, month),
    db.prepare(`SELECT COUNT(*) AS sourceCount, COALESCE(SUM(size_bytes), 0) AS sourceBytes
      FROM source_documents WHERE user_id = ? AND status != 'failed'`).bind(learner.userId),
    db.prepare("SELECT provider_customer_id AS providerCustomerId FROM billing_customers WHERE user_id = ?").bind(learner.userId),
    db.prepare(`SELECT id, amount_paid AS amountPaid, currency, status,
        hosted_invoice_url AS hostedInvoiceUrl, paid_at AS paidAt, created_at AS createdAt
      FROM billing_invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 6`).bind(learner.userId),
  ]);
  const subscription = subscriptionResult.results?.[0] as { planId?: string; billingInterval?: string; status?: string; cancelAtPeriodEnd?: number; currentPeriodEnd?: number } | undefined;
  const planId = subscription && isPaidPlanId(subscription.planId) && activeStatuses.has(subscription.status ?? "") ? subscription.planId : "free";
  const plan = PLAN_CATALOG[planId];
  const creditsUsed = Number((usageResult.results?.[0] as { quantity?: number } | undefined)?.quantity ?? 0);
  const sources = sourcesResult.results?.[0] as { sourceCount?: number; sourceBytes?: number } | undefined;
  return {
    storage: "durable" as const,
    configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    plan,
    subscription: subscription ? {
      planId: subscription.planId,
      billingInterval: subscription.billingInterval,
      status: subscription.status,
      cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
      currentPeriodEnd: Number(subscription.currentPeriodEnd ?? 0) || null,
      canManage: Boolean((customerResult.results?.[0] as { providerCustomerId?: string } | undefined)?.providerCustomerId),
    } : null,
    usage: {
      month,
      aiCreditsUsed: creditsUsed,
      aiCreditsRemaining: Math.max(0, plan.aiCredits - creditsUsed),
      sources: Number(sources?.sourceCount ?? 0),
      sourceBytes: Number(sources?.sourceBytes ?? 0),
    },
    invoices: invoicesResult.results ?? [],
  };
}

export async function getBillingCustomerId(userId: string) {
  const db = await getD1();
  if (!db) return null;
  const row = await db.prepare("SELECT provider_customer_id AS id FROM billing_customers WHERE user_id = ?")
    .bind(userId).first<{ id: string }>();
  return row?.id ?? null;
}

export async function saveBillingCustomer(userId: string, customerId: string) {
  const db = await getD1();
  if (!db) throw new Error("storage_unavailable");
  const now = nowSeconds();
  await db.prepare(`INSERT INTO billing_customers
      (user_id, provider, provider_customer_id, created_at, updated_at)
    VALUES (?, 'stripe', ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET provider_customer_id = excluded.provider_customer_id,
      updated_at = excluded.updated_at`)
    .bind(userId, customerId, now, now).run();
}

export async function findUserIdByCustomer(customerId: string) {
  const db = await getD1();
  if (!db) return null;
  const row = await db.prepare("SELECT user_id AS userId FROM billing_customers WHERE provider_customer_id = ?")
    .bind(customerId).first<{ userId: string }>();
  return row?.userId ?? null;
}

export async function getStoredSubscription(subscriptionId: string) {
  const db = await getD1();
  if (!db) return null;
  return db.prepare(`SELECT user_id AS userId, provider_customer_id AS customerId,
      plan_id AS planId, billing_interval AS billingInterval
    FROM subscriptions WHERE provider = 'stripe' AND provider_subscription_id = ?`)
    .bind(subscriptionId).first<{ userId: string; customerId: string; planId: PaidPlanId; billingInterval: BillingInterval }>();
}

export async function upsertSubscription(args: {
  userId: string;
  subscriptionId: string;
  customerId: string;
  planId: PaidPlanId;
  billingInterval: BillingInterval;
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
}) {
  const db = await getD1();
  if (!db) throw new Error("storage_unavailable");
  const now = nowSeconds();
  await saveBillingCustomer(args.userId, args.customerId);
  await db.prepare(`INSERT INTO subscriptions
      (id, user_id, provider, provider_subscription_id, provider_customer_id, plan_id,
       billing_interval, status, cancel_at_period_end, current_period_start, current_period_end, created_at, updated_at)
    VALUES (?, ?, 'stripe', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider, provider_subscription_id) DO UPDATE SET
      user_id = excluded.user_id, provider_customer_id = excluded.provider_customer_id,
      plan_id = excluded.plan_id, billing_interval = excluded.billing_interval,
      status = excluded.status, cancel_at_period_end = excluded.cancel_at_period_end,
      current_period_start = excluded.current_period_start, current_period_end = excluded.current_period_end,
      updated_at = excluded.updated_at`)
    .bind(args.subscriptionId, args.userId, args.subscriptionId, args.customerId, args.planId,
      args.billingInterval, args.status, args.cancelAtPeriodEnd ? 1 : 0,
      args.currentPeriodStart ?? null, args.currentPeriodEnd ?? null, now, now).run();
}

export async function beginBillingEvent(eventId: string, eventType: string, livemode: boolean) {
  const db = await getD1();
  if (!db) throw new Error("storage_unavailable");
  const existing = await db.prepare("SELECT processed_at AS processedAt FROM billing_events WHERE id = ?")
    .bind(eventId).first<{ processedAt: number | null }>();
  if (existing?.processedAt) return false;
  await db.prepare(`INSERT OR IGNORE INTO billing_events (id, event_type, livemode, processed_at, created_at)
    VALUES (?, ?, ?, NULL, ?)`).bind(eventId, eventType, livemode ? 1 : 0, nowSeconds()).run();
  return true;
}

export async function completeBillingEvent(eventId: string) {
  const db = await getD1();
  if (!db) throw new Error("storage_unavailable");
  await db.prepare("UPDATE billing_events SET processed_at = ? WHERE id = ?").bind(nowSeconds(), eventId).run();
}

export async function upsertInvoice(args: {
  id: string;
  userId: string | null;
  subscriptionId: string | null;
  amountPaid: number;
  currency: string;
  status: string;
  hostedInvoiceUrl?: string | null;
  paidAt?: number | null;
  createdAt?: number | null;
}) {
  const db = await getD1();
  if (!db) throw new Error("storage_unavailable");
  const now = nowSeconds();
  await db.prepare(`INSERT INTO billing_invoices
      (id, user_id, provider_subscription_id, amount_paid, currency, status,
       hosted_invoice_url, paid_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id,
      provider_subscription_id = excluded.provider_subscription_id,
      amount_paid = excluded.amount_paid, currency = excluded.currency, status = excluded.status,
      hosted_invoice_url = excluded.hosted_invoice_url, paid_at = excluded.paid_at,
      updated_at = excluded.updated_at`)
    .bind(args.id, args.userId, args.subscriptionId, args.amountPaid, args.currency,
      args.status, args.hostedInvoiceUrl ?? null, args.paidAt ?? null, args.createdAt ?? now, now).run();
}

export async function getBillingAdminMetrics() {
  const db = await getD1();
  if (!db) return { paidSubscribers: 0, mrrCny: 0, revenueCny: 0 };
  const [subscribers, mrr, revenue] = await db.batch([
    db.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM subscriptions WHERE status IN ('active', 'trialing')"),
    db.prepare(`SELECT COALESCE(SUM(CASE
        WHEN plan_id = 'personal' AND billing_interval = 'month' THEN 3900
        WHEN plan_id = 'personal' AND billing_interval = 'year' THEN 2492
        WHEN plan_id = 'pro' AND billing_interval = 'month' THEN 9900
        WHEN plan_id = 'pro' AND billing_interval = 'year' THEN 6658
        WHEN plan_id = 'team' AND billing_interval = 'month' THEN 7900
        WHEN plan_id = 'team' AND billing_interval = 'year' THEN 6583
        ELSE 0 END), 0) AS cents
      FROM subscriptions WHERE status IN ('active', 'trialing')`),
    db.prepare("SELECT COALESCE(SUM(amount_paid), 0) AS cents FROM billing_invoices WHERE status = 'paid'"),
  ]);
  return {
    paidSubscribers: Number((subscribers.results?.[0] as { count?: number } | undefined)?.count ?? 0),
    mrrCny: Number((mrr.results?.[0] as { cents?: number } | undefined)?.cents ?? 0) / 100,
    revenueCny: Number((revenue.results?.[0] as { cents?: number } | undefined)?.cents ?? 0) / 100,
  };
}
