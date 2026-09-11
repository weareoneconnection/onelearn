import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getD1 } from "@/db";
import { resolveLearner } from "@/lib/onelearn/persistence";
import { claimReferral, getOrCreateReferralCode, REFERRAL_CREDITS, ReferralError, referralStats } from "@/lib/onelearn/referrals";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

function siteOrigin() {
  try { return new URL(process.env.ONELEARN_SITE_URL?.trim() || "https://www.onelearn.ltd").origin; } catch { return "https://www.onelearn.ltd"; }
}

/** The signed-in learner's invite link and reward stats. */
async function handleGET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  const learner = await resolveLearner(request, locale);
  if (learner.mode === "device") return NextResponse.json({ error: locale === "zh" ? "登录后才能邀请好友" : "Sign in to invite friends", code: "authentication_required" }, { status: 401 });
  const db = await getD1();
  if (!db) return NextResponse.json({ error: "Storage unavailable", code: "storage_unavailable" }, { status: 503 });
  const code = await getOrCreateReferralCode(db, learner.userId, Math.floor(Date.now() / 1000));
  return NextResponse.json({ code, link: `${siteOrigin()}/?ref=${code}`, reward: REFERRAL_CREDITS, ...await referralStats(db, learner.userId) });
}

const claimSchema = z.object({ locale: z.enum(["zh", "en"]), code: z.string().min(1).max(32) });

/** Claims an invite for a newly signed-in learner. */
async function handlePOST(request: NextRequest) {
  const raw = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", code: "invalid_request" }, { status: 400 });
  const zh = parsed.data.locale === "zh";
  const learner = await resolveLearner(request, parsed.data.locale);
  const db = await getD1();
  if (!db) return NextResponse.json({ error: "Storage unavailable", code: "storage_unavailable" }, { status: 503 });
  try {
    const result = await claimReferral(db, learner, parsed.data.code, Math.floor(Date.now() / 1000));
    return NextResponse.json({ claimed: true, credits: result.credits });
  } catch (error) {
    if (!(error instanceof ReferralError)) throw error;
    const messages: Record<ReferralError["code"], [string, string]> = {
      invalid_code: ["邀请码无效", "Invalid invite code"],
      self_referral: ["不能使用自己的邀请码", "You can't use your own invite code"],
      already_referred: ["你已经领取过邀请奖励", "You've already claimed an invite reward"],
      account_too_old: ["邀请奖励仅限新注册 7 天内的账号", "Invite rewards are for accounts created in the last 7 days"],
      not_eligible: ["登录后才能领取邀请奖励", "Sign in to claim invite rewards"],
    };
    return NextResponse.json({ error: messages[error.code][zh ? 0 : 1], code: error.code }, { status: 400 });
  }
}

export const GET = withApiErrors("/api/referral", handleGET);
export const POST = withApiErrors("/api/referral", handlePOST);
