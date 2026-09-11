import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { endVoiceSession, MAX_SESSION_SECONDS, startVoiceSession, VoiceLimitError, voiceLimitSeconds, voiceUsage } = await import("../lib/onelearn/voice.ts");

const NOW = 1_800_000_000;
let db;
function user(id) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, `${id}@t.invalid`, id, NOW, NOW);
  return id;
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
});

test("plans get 5 / 60 / 300 voice minutes", () => {
  assert.equal(voiceLimitSeconds("free"), 300);
  assert.equal(voiceLimitSeconds("personal"), 3600);
  assert.equal(voiceLimitSeconds("pro"), 18_000);
});

test("a session reserves at most 10 minutes and settles on server time", async () => {
  const id = user("clerk:v1");
  const started = await startVoiceSession(db, { userId: id, planId: "pro", courseVersionId: null, lessonId: null, now: NOW });
  assert.equal(started.reservedSeconds, MAX_SESSION_SECONDS);
  assert.equal((await voiceUsage(db, id, "pro", NOW)).usedSeconds, MAX_SESSION_SECONDS);
  const ended = await endVoiceSession(db, { sessionId: started.sessionId, userId: id, now: NOW + 95 });
  assert.equal(ended.usedSeconds, 95);
  assert.equal((await voiceUsage(db, id, "pro", NOW)).usedSeconds, 95);
  const again = await endVoiceSession(db, { sessionId: started.sessionId, userId: id, now: NOW + 500 });
  assert.equal(again.alreadyEnded, true);
  assert.equal((await voiceUsage(db, id, "pro", NOW)).usedSeconds, 95, "ending twice changes nothing");
});

test("charged time never exceeds the reservation", async () => {
  const id = user("clerk:v2");
  const started = await startVoiceSession(db, { userId: id, planId: "free", courseVersionId: null, lessonId: null, now: NOW });
  assert.equal(started.reservedSeconds, 300, "free plan reserves only what is left");
  const ended = await endVoiceSession(db, { sessionId: started.sessionId, userId: id, now: NOW + 3600 });
  assert.equal(ended.usedSeconds, 300);
  await assert.rejects(startVoiceSession(db, { userId: id, planId: "free", courseVersionId: null, lessonId: null, now: NOW + 3601 }), VoiceLimitError);
});

test("parallel starts cannot overshoot the monthly allowance", async () => {
  const id = user("clerk:v3");
  const results = await Promise.allSettled(Array.from({ length: 5 }, () => startVoiceSession(db, { userId: id, planId: "free", courseVersionId: null, lessonId: null, now: NOW })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.ok((await voiceUsage(db, id, "free", NOW)).usedSeconds <= 300);
});

test("a failed start refunds the whole reservation", async () => {
  const id = user("clerk:v4");
  const started = await startVoiceSession(db, { userId: id, planId: "personal", courseVersionId: null, lessonId: null, now: NOW });
  await endVoiceSession(db, { sessionId: started.sessionId, userId: id, now: NOW + 5, chargeNothing: true });
  assert.equal((await voiceUsage(db, id, "personal", NOW)).usedSeconds, 0);
});

test("another learner cannot end someone else's session", async () => {
  const owner = user("clerk:owner");
  user("clerk:other");
  const started = await startVoiceSession(db, { userId: owner, planId: "pro", courseVersionId: null, lessonId: null, now: NOW });
  assert.equal(await endVoiceSession(db, { sessionId: started.sessionId, userId: "clerk:other", now: NOW + 10 }), null);
});
