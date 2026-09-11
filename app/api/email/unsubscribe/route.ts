import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/db";
import { escapeHtml, verifyUnsubscribeToken } from "@/lib/onelearn/email";
import { setEmailReminders } from "@/lib/onelearn/reminders";
import { withApiErrors } from "@/lib/onelearn/api-errors";

export const dynamic = "force-dynamic";

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#060b13;color:#c9d6e3;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif">
<main style="max-width:480px;margin:18vh auto;padding:0 24px;text-align:center"><h1 style="color:#fff;font-size:22px">${escapeHtml(title)}</h1><p style="line-height:1.7">${escapeHtml(body)}</p>
<p><a href="/" style="color:#67e8f9">OneLearn</a></p></main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function unsubscribe(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("u") ?? "";
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!userId || !await verifyUnsubscribeToken(userId, token)) return page("链接无效 · Invalid link", "这个退订链接无效或已过期。你也可以登录后在账号菜单里关闭复习提醒。 / This link is invalid. You can also turn off reminders in the account menu.", 400);
  const db = await getD1();
  if (!db) return page("暂时无法退订 · Try again later", "服务暂时不可用，请稍后再试。 / The service is temporarily unavailable.", 503);
  await setEmailReminders(db, userId, false, Math.floor(Date.now() / 1000));
  return page("已退订复习提醒 · Unsubscribed", "你不会再收到复习提醒邮件。随时可以在账号菜单里重新开启。 / You will no longer receive review reminders. You can turn them back on in the account menu.");
}

// GET for the link in the email; POST for one-click unsubscribe (RFC 8058) from mail clients.
export const GET = withApiErrors("/api/email/unsubscribe", unsubscribe);
export const POST = withApiErrors("/api/email/unsubscribe", unsubscribe);
