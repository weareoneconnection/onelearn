import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createSqliteD1 } from "./helpers/sqlite-d1.mjs";

const env = (globalThis.__onelearnTestEnv ??= {});
process.env.ONELEARN_TRUST_PLATFORM_IDENTITY = "false";

const { submitFeedback, listFeedback, setFeedbackStatus, FeedbackLimitError } = await import("../lib/onelearn/feedback.ts");
const { getAdminSnapshot } = await import("../lib/onelearn/persistence.ts");

let db;
const now = () => Math.floor(Date.now() / 1000);
function learner(id) {
  db.raw.prepare("INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at, last_seen_at) VALUES (?, ?, ?, 'zh', ?, ?)").run(id, `${id}@t.invalid`, id, now(), now());
  return { userId: id, email: `${id}@t.invalid`, displayName: id, mode: "clerk" };
}

beforeEach(() => {
  db = createSqliteD1();
  env.DB = db;
});

test("feedback is stored and listed open-first", async () => {
  const user = learner("fb-user");
  const first = await submitFeedback(user, { category: "bug", message: "Practice page froze" });
  await submitFeedback(user, { category: "billing", message: "Invoice missing", page: "billing" });
  assert.equal(await setFeedbackStatus(first.id, "resolved"), true);
  const { open, items } = await listFeedback(db);
  assert.equal(open, 1);
  assert.deepEqual(items.map((item) => item.status), ["open", "resolved"]);
  assert.equal(items[0].page, "billing");
});

test("each learner can submit at most five items per day", async () => {
  const user = learner("fb-spam");
  const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => submitFeedback(user, { category: "other", message: `message ${i}` })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 5);
  assert.ok(results.some((result) => result.status === "rejected" && result.reason instanceof FeedbackLimitError));
  await submitFeedback(learner("fb-other"), { category: "other", message: "different learner" });
});

test("operations snapshot includes feedback and mastery metrics", async () => {
  await submitFeedback(learner("fb-ops"), { category: "content", message: "Lesson 2 has a typo" });
  const snapshot = await getAdminSnapshot(db);
  assert.equal(snapshot.metrics.openFeedback, 1);
  assert.equal(snapshot.metrics.verifiedNodes, 0);
  assert.equal(snapshot.feedback.length, 1);
});

test("unknown feedback ids are reported as not updated", async () => {
  assert.equal(await setFeedbackStatus("missing", "resolved"), false);
});
