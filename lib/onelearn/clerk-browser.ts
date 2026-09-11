"use client";

// Browser-side Clerk, loaded from Clerk's own CDN only when a publishable key is
// configured (Vercel). Sites builds have no key, so nothing is loaded there.

type ClerkSession = { getToken: () => Promise<string | null> };
type ClerkInstance = {
  load: (options?: Record<string, unknown>) => Promise<void>;
  session?: ClerkSession | null;
  user?: unknown;
  openSignIn: (options?: Record<string, unknown>) => void;
  signOut: (options?: Record<string, unknown>) => Promise<void>;
};

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
let clerkPromise: Promise<ClerkInstance | null> | null = null;

export const clerkEnabled = Boolean(publishableKey);

function frontendApi() {
  try { return atob(publishableKey.split("_")[2] ?? "").replace(/\$$/, ""); } catch { return ""; }
}

export function loadClerk(locale: "zh" | "en" = "zh"): Promise<ClerkInstance | null> {
  if (!clerkEnabled || typeof window === "undefined") return Promise.resolve(null);
  clerkPromise ??= (async () => {
    const host = frontendApi();
    if (!host) return null;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${host}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.clerkPublishableKey = publishableKey;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Clerk failed to load"));
      document.head.appendChild(script);
    });
    const clerk = (window as unknown as { Clerk?: ClerkInstance }).Clerk;
    if (!clerk) return null;
    const localization = locale === "zh" ? (await import("@clerk/localizations")).zhCN : undefined;
    await clerk.load({ localization });
    return clerk;
  })().catch((error: unknown) => {
    console.error(error);
    clerkPromise = null;
    return null;
  });
  return clerkPromise;
}

export async function clerkSessionToken() {
  const clerk = await loadClerk();
  return clerk?.session ? clerk.session.getToken() : null;
}

export async function openClerkSignIn(returnTo = window.location.href) {
  const clerk = await loadClerk();
  clerk?.openSignIn({ forceRedirectUrl: returnTo, fallbackRedirectUrl: returnTo });
}

export async function clerkSignOut() {
  const clerk = await loadClerk();
  await clerk?.signOut({ redirectUrl: window.location.href });
}
