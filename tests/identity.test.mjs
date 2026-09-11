import assert from "node:assert/strict";
import { test } from "node:test";
import { clientIpFromHeaders, hashClientKey, trustsPlatformIdentityHeaders } from "../lib/onelearn/identity.ts";

const headers = (values) => ({ get: (name) => values[name] ?? null });

test("platform identity headers are trusted on Sites and rejected on Vercel", () => {
  assert.equal(trustsPlatformIdentityHeaders({}), true);
  assert.equal(trustsPlatformIdentityHeaders({ VERCEL: "1" }), false);
});

test("explicit override wins over host detection", () => {
  assert.equal(trustsPlatformIdentityHeaders({ VERCEL: "1", ONELEARN_TRUST_PLATFORM_IDENTITY: "true" }), true);
  assert.equal(trustsPlatformIdentityHeaders({ ONELEARN_TRUST_PLATFORM_IDENTITY: "false" }), false);
});

test("client IP only comes from edge-controlled headers", () => {
  const spoofed = { "cf-connecting-ip": "6.6.6.6", "x-real-ip": "7.7.7.7", "x-vercel-forwarded-for": "1.2.3.4, 10.0.0.1" };
  assert.equal(clientIpFromHeaders(headers(spoofed), { VERCEL: "1" }), "1.2.3.4");
  assert.equal(clientIpFromHeaders(headers(spoofed), {}), "6.6.6.6");
  assert.equal(clientIpFromHeaders(headers({ "x-forwarded-for": "9.9.9.9" }), {}), "unknown");
});

test("client keys are stable and do not expose the IP", async () => {
  const key = await hashClientKey("1.2.3.4");
  assert.equal(key, await hashClientKey("1.2.3.4"));
  assert.notEqual(key, await hashClientKey("1.2.3.5"));
  assert.match(key, /^[0-9a-f]{32}$/);
});
