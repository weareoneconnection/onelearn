import type { D1Database } from "@cloudflare/workers-types";
import { getD1 } from "@/db";
import { emailConfigured, escapeHtml, sendEmail, unsubscribeToken } from "./email";
import { getEngagement } from "./engagement";

// Daily review reminders: only signed-in learners with a real email, reminders enabled,
// reviews due, and no reminder in the last 20 hours.

const REMINDER_GAP_SECONDS = 20 * 60 * 60;

export type ReminderRecipient = { userId: string; email: string; displayName: string | null; locale: "zh" | "en"; due: number };

export async function findReminderRecipients(db: D1Database, now: number, limit = 200) {
  const rows = (await db.prepare(`SELECT u.id AS userId, u.email AS email, u.display_name AS displayName,
        COALESCE(p.locale, u.locale) AS locale, COUNT(m.id) AS due
      FROM users u
      JOIN mastery_records m ON m.user_id = u.id AND m.next_review_at <= ?
      LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE u.id NOT LIKE 'device:%' AND u.email NOT LIKE '%.invalid'
        AND COALESCE(p.email_reminders, 1) = 1
        AND (p.last_reminded_at IS NULL OR p.last_reminded_at <= ?)
      GROUP BY u.id ORDER BY due DESC LIMIT ?`)
    .bind(now, now - REMINDER_GAP_SECONDS, limit).all<ReminderRecipient>()).results ?? [];
  return rows.map((row) => ({ ...row, due: Number(row.due), locale: row.locale === "en" ? "en" as const : "zh" as const }));
}

export async function dueLessonTitles(db: D1Database, userId: string, now: number) {
  const rows = (await db.prepare(`SELECT node_title AS title FROM mastery_records
    WHERE user_id = ? AND next_review_at <= ? ORDER BY next_review_at ASC LIMIT 5`).bind(userId, now).all<{ title: string }>()).results ?? [];
  return rows.map((row) => row.title);
}

export function buildReminderEmail(args: { locale: "zh" | "en"; name: string | null; due: number; titles: string[]; streak: number; siteUrl: string; unsubscribeUrl: string }) {
  const zh = args.locale === "zh";
  const name = args.name?.trim() || (zh ? "学习者" : "there");
  const subject = zh ? `今天有 ${args.due} 个知识点需要复习` : `${args.due} ${args.due === 1 ? "topic is" : "topics are"} due for review today`;
  const intro = zh
    ? `${name}，你好。按照遗忘曲线，下面这些内容现在复习效果最好，大约只需要 ${Math.max(3, args.due * 2)} 分钟。`
    : `Hi ${name}, based on your forgetting curve, these are best reviewed now. It takes about ${Math.max(3, args.due * 2)} minutes.`;
  const streakLine = args.streak > 0 ? (zh ? `你已经连续学习 ${args.streak} 天，今天复习一下就能保持。` : `You're on a ${args.streak}-day streak — a quick review keeps it going.`) : "";
  const cta = zh ? "开始复习" : "Start reviewing";
  const footer = zh ? "不想再收到复习提醒？" : "Don't want review reminders?";
  const unsubscribe = zh ? "一键退订" : "Unsubscribe";
  const reviewUrl = `${args.siteUrl}/?view=review`;
  const items = args.titles.map((title) => `<li style="margin:6px 0">${escapeHtml(title)}</li>`).join("");
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI',sans-serif;max-width:520px;margin:0 auto;color:#1f2937;line-height:1.6">
<p style="font-size:13px;letter-spacing:.12em;color:#0891b2;font-weight:600">ONELEARN</p>
<h1 style="font-size:20px;margin:8px 0 12px">${escapeHtml(subject)}</h1>
<p>${escapeHtml(intro)}</p>
<ul style="padding-left:20px">${items}</ul>
${streakLine ? `<p>${escapeHtml(streakLine)}</p>` : ""}
<p style="margin:24px 0"><a href="${escapeHtml(reviewUrl)}" style="background:#0891b2;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:600">${cta}</a></p>
<p style="font-size:12px;color:#6b7280;margin-top:32px">${footer} <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#6b7280">${unsubscribe}</a></p>
<p style="font-size:11px;color:#9ca3af;margin-top:8px"><a href="https://www.oneailabs.ai/" style="color:#9ca3af">Powered by OneAI Labs</a></p>
</div>`;
  const text = [subject, "", intro, ...args.titles.map((title) => `- ${title}`), streakLine, "", `${cta}: ${reviewUrl}`, "", `${footer} ${unsubscribe}: ${args.unsubscribeUrl}`, "", "Powered by OneAI Labs · https://www.oneailabs.ai/"].filter((line) => line !== undefined).join("\n");
  return { subject, html, text };
}

export async function markReminded(db: D1Database, userId: string, now: number) {
  await db.prepare(`INSERT INTO user_preferences (user_id, locale, updated_at, last_reminded_at)
    VALUES (?, 'zh', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET last_reminded_at = excluded.last_reminded_at`).bind(userId, now, now).run();
}

export async function setEmailReminders(db: D1Database, userId: string, enabled: boolean, now: number) {
  await db.prepare(`INSERT INTO user_preferences (user_id, locale, updated_at, email_reminders)
    VALUES (?, 'zh', ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET email_reminders = excluded.email_reminders, updated_at = excluded.updated_at`).bind(userId, now, enabled ? 1 : 0).run();
}

export async function getEmailReminders(db: D1Database, userId: string) {
  const row = await db.prepare("SELECT email_reminders AS enabled FROM user_preferences WHERE user_id = ?").bind(userId).first<{ enabled: number }>();
  return row ? Boolean(row.enabled) : true;
}

function siteUrl() {
  const configured = process.env.ONELEARN_SITE_URL?.trim();
  try { return configured ? new URL(configured).origin : "https://www.onelearn.ltd"; } catch { return "https://www.onelearn.ltd"; }
}

export async function runReviewReminders(now = Math.floor(Date.now() / 1000)) {
  const db = await getD1();
  if (!db) return { skipped: "storage_unavailable" as const, sent: 0, failed: 0 };
  if (!emailConfigured()) return { skipped: "email_not_configured" as const, sent: 0, failed: 0 };
  const base = siteUrl();
  const recipients = await findReminderRecipients(db, now);
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    try {
      const [titles, engagement, token] = await Promise.all([dueLessonTitles(db, recipient.userId, now), getEngagement(db, recipient.userId, now), unsubscribeToken(recipient.userId)]);
      const unsubscribeUrl = `${base}/api/email/unsubscribe?u=${encodeURIComponent(recipient.userId)}&t=${token}`;
      const email = buildReminderEmail({ locale: recipient.locale, name: recipient.displayName, due: recipient.due, titles, streak: engagement.streak.current, siteUrl: base, unsubscribeUrl });
      await sendEmail({ to: recipient.email, ...email, headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
      await markReminded(db, recipient.userId, now);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("Review reminder failed:", recipient.userId, error instanceof Error ? error.message : error);
    }
  }
  return { skipped: null, sent, failed, candidates: recipients.length };
}
