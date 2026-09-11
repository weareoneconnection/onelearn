import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, test } from "node:test";
import { resolvePlanFromPriceId, verifyStripeWebhook } from "../lib/onelearn/stripe.ts";

const SECRET = "whsec_test";
const body = JSON.stringify({ id: "evt_1", type: "invoice.paid", livemode: false, data: { object: {} } });
const sign = (timestamp, payload = body, secret = SECRET) =>
  `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_year";
});

test("accepts a correctly signed, fresh webhook", async () => {
  const event = await verifyStripeWebhook(body, sign(now()));
  assert.equal(event.id, "evt_1");
});

test("rejects a wrong secret, tampered body, stale timestamp and missing header", async () => {
  await assert.rejects(verifyStripeWebhook(body, sign(now(), body, "whsec_other")), /Invalid Stripe webhook signature/);
  await assert.rejects(verifyStripeWebhook(body.replace("evt_1", "evt_2"), sign(now())), /Invalid Stripe webhook signature/);
  await assert.rejects(verifyStripeWebhook(body, sign(now() - 301)), /Expired/);
  await assert.rejects(verifyStripeWebhook(body, null), /Missing/);
});

test("maps configured price ids back to plans", () => {
  assert.deepEqual(resolvePlanFromPriceId("price_pro_year"), { planId: "pro", interval: "year" });
  assert.equal(resolvePlanFromPriceId("price_unknown"), null);
  assert.equal(resolvePlanFromPriceId(null), null);
});
