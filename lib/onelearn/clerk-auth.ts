import { createClerkClient, type ClerkClient } from "@clerk/backend";

// Server-side Clerk session verification for hosts without the ChatGPT Sites
// identity proxy (e.g. Vercel). The browser sends the Clerk session token as a
// Bearer header on every API call, so no middleware or handshake is needed.

export type ClerkLearner = { userId: string; email: string; displayName: string };

const publishableKey = () => (process.env.CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)?.trim();
const profileCache = new Map<string, { email: string; displayName: string; cachedAt: number }>();
const PROFILE_TTL_MS = 10 * 60 * 1000;
let client: ClerkClient | null = null;

export function isClerkConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim() && publishableKey());
}

function clerk() {
  client ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY!.trim(), publishableKey: publishableKey() });
  return client;
}

function authorizedParties() {
  const site = process.env.ONELEARN_SITE_URL?.trim();
  if (!site) return undefined;
  try { return [new URL(site).origin]; } catch { return undefined; }
}

async function loadProfile(clerkUserId: string) {
  const cached = profileCache.get(clerkUserId);
  if (cached && Date.now() - cached.cachedAt < PROFILE_TTL_MS) return cached;
  const user = await clerk().users.getUser(clerkUserId);
  const email = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? `${clerkUserId}@clerk.invalid`;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const profile = { email, displayName: name || email, cachedAt: Date.now() };
  profileCache.set(clerkUserId, profile);
  return profile;
}

export async function getClerkLearner(request: Request): Promise<ClerkLearner | null> {
  if (!isClerkConfigured() || !request.headers.get("authorization")) return null;
  try {
    const state = await clerk().authenticateRequest(request, { authorizedParties: authorizedParties() });
    if (!state.isSignedIn) return null;
    const clerkUserId = (state.toAuth() as { userId?: string | null }).userId;
    if (!clerkUserId) return null;
    const profile = await loadProfile(clerkUserId);
    return { userId: `clerk:${clerkUserId}`, email: profile.email, displayName: profile.displayName };
  } catch (error) {
    console.error("Clerk authentication failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
