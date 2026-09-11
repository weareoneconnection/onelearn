import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/db";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { createShare, getShareToken, revokeShare } from "@/lib/onelearn/proof-share";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

function siteOrigin() {
  try { return new URL(process.env.ONELEARN_SITE_URL?.trim() || "https://www.onelearn.ltd").origin; } catch { return "https://www.onelearn.ltd"; }
}

async function context(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  if (learner.mode === "device") return { ok: false as const, response: NextResponse.json({ error: locale === "zh" ? "登录后才能公开分享" : "Sign in to share publicly", code: "authentication_required" }, { status: 401 }) };
  const db = await getD1();
  if (!db) return { ok: false as const, response: NextResponse.json({ error: "Storage unavailable", code: "storage_unavailable" }, { status: 503 }) };
  return { ok: true as const, learner, db };
}

const urlFor = (token: string | null) => token ? `${siteOrigin()}/p/${token}` : null;

async function handleGET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({ url: urlFor(await getShareToken(ctx.db, ctx.learner.userId)) });
}

async function handlePOST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({ url: urlFor(await createShare(ctx.db, ctx.learner.userId, Math.floor(Date.now() / 1000))) });
}

async function handleDELETE(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx.ok) return ctx.response;
  await revokeShare(ctx.db, ctx.learner.userId, Math.floor(Date.now() / 1000));
  return NextResponse.json({ url: null });
}

export const GET = withApiErrors("/api/proof/share", handleGET);
export const POST = withApiErrors("/api/proof/share", handlePOST);
export const DELETE = withApiErrors("/api/proof/share", handleDELETE);
