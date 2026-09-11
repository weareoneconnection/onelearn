// Transactional email via Resend's HTTP API (works on Vercel and Cloudflare without an SDK),
// plus signed unsubscribe tokens so one-click unsubscribe links cannot be forged.

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.ONELEARN_EMAIL_FROM?.trim());
}

export async function sendEmail(message: { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ONELEARN_EMAIL_FROM?.trim();
  if (!key || !from) throw new Error("email_not_configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text, headers: message.headers }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`email_send_failed_${response.status}`);
}

function tokenSecret() {
  return process.env.ONELEARN_EMAIL_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function unsubscribeToken(userId: string) {
  const secret = tokenSecret();
  if (!secret) throw new Error("email_secret_not_configured");
  return hmacHex(secret, `unsubscribe:${userId}`);
}

export async function verifyUnsubscribeToken(userId: string, token: string) {
  const secret = tokenSecret();
  if (!secret || !token) return false;
  const expected = await hmacHex(secret, `unsubscribe:${userId}`);
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ token.charCodeAt(index);
  return mismatch === 0;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
