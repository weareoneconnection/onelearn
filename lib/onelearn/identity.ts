// Pure identity helpers. Kept free of framework imports so they can be unit tested.

type Env = Record<string, string | undefined>;
type HeaderReader = { get(name: string): string | null };

/**
 * The `oai-authenticated-*` headers are injected by the ChatGPT Sites proxy.
 * On any other host (e.g. Vercel) a client can send them directly, so they must
 * not be trusted there. `ONELEARN_TRUST_PLATFORM_IDENTITY` overrides detection.
 */
export function trustsPlatformIdentityHeaders(env: Env = process.env) {
  const explicit = env.ONELEARN_TRUST_PLATFORM_IDENTITY?.trim().toLowerCase();
  if (explicit === "true" || explicit === "1") return true;
  if (explicit === "false" || explicit === "0") return false;
  return !env.VERCEL;
}

/**
 * Returns the client IP from headers set by the hosting edge. Only headers the
 * edge overwrites are consulted, so the value cannot be chosen by the client.
 */
export function clientIpFromHeaders(headers: HeaderReader, env: Env = process.env) {
  const candidates = env.VERCEL
    ? [headers.get("x-vercel-forwarded-for"), headers.get("x-real-ip")]
    : [headers.get("cf-connecting-ip")];
  const ip = candidates.find((value) => value?.trim())?.split(",")[0]?.trim();
  return ip || "unknown";
}

export async function hashClientKey(ip: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`onelearn-client:${ip}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((value) => value.toString(16).padStart(2, "0")).join("");
}
