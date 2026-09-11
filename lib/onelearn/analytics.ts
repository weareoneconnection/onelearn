"use client";

import type { PostHog } from "posthog-js";

// Product analytics via PostHog, loaded only when NEXT_PUBLIC_POSTHOG_KEY is set.
// No autocapture or session recording; learners are identified by a SHA-256 hash of
// their email, never the address itself.

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
let client: Promise<PostHog | null> | null = null;

function load() {
  if (!key || typeof window === "undefined") return Promise.resolve(null);
  client ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: host,
      autocapture: false,
      capture_pageview: true,
      disable_session_recording: true,
      persistence: "localStorage",
      person_profiles: "identified_only",
    });
    return posthog;
  }).catch(() => null);
  return client;
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!key) return;
  void load().then((posthog) => posthog?.capture(event, properties));
}

export async function identifyLearner(email: string) {
  if (!key || !email) return;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.trim().toLowerCase()));
  const id = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
  void load().then((posthog) => posthog?.identify(id));
}
