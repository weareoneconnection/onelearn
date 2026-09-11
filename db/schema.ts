import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Production domain shape. Demo mode does not require a database.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), displayName: text("display_name"),
  locale: text("locale").notNull().default("en"), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_users_email").on(t.email)]);

// Daily AI request counter for anonymous device learners, keyed by hashed client IP.
// Device ids are client-generated, so this caps what rotating ids can consume.
export const anonymousUsageDaily = sqliteTable("anonymous_usage_daily", {
  clientKey: text("client_key").notNull(),
  day: text("day").notNull(),
  requests: integer("requests").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [primaryKey({ columns: [t.clientKey, t.day] })]);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id),
  locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
  activeCourseVersionId: text("active_course_version_id"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  emailReminders: integer("email_reminders", { mode: "boolean" }).notNull().default(true),
  lastRemindedAt: integer("last_reminded_at"),
});

export const goals = sqliteTable("learning_goals", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(), targetOutcome: text("target_outcome").notNull(), targetDate: integer("target_date", { mode: "timestamp" }),
  status: text("status", { enum: ["draft", "active", "paused", "completed"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const paths = sqliteTable("learning_paths", {
  id: text("id").primaryKey(), goalId: text("goal_id").notNull().references(() => goals.id), title: text("title").notNull(),
  version: integer("version").notNull().default(1), status: text("status", { enum: ["draft", "active", "archived"] }).notNull().default("draft"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const knowledgeNodes = sqliteTable("knowledge_nodes", {
  id: text("id").primaryKey(), pathId: text("path_id").notNull().references(() => paths.id), title: text("title").notNull(),
  description: text("description").notNull(), order: integer("sort_order").notNull(), difficulty: integer("difficulty").notNull().default(1), sourceVersion: text("source_version"),
});

export const knowledgeEdges = sqliteTable("knowledge_edges", {
  id: text("id").primaryKey(), pathId: text("path_id").notNull().references(() => paths.id),
  fromNodeId: text("from_node_id").notNull().references(() => knowledgeNodes.id), toNodeId: text("to_node_id").notNull().references(() => knowledgeNodes.id),
  relation: text("relation", { enum: ["prerequisite", "related", "transfer"] }).notNull(),
});

export const learningSessions = sqliteTable("learning_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), nodeId: text("node_id").notNull().references(() => knowledgeNodes.id),
  mode: text("mode", { enum: ["focus", "deep_dive", "practice", "project", "exam", "oral_defense"] }).notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(), completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(), sessionId: text("session_id").notNull().references(() => learningSessions.id), nodeId: text("node_id").notNull().references(() => knowledgeNodes.id),
  answer: text("answer").notNull(), score: real("score").notNull(), confidence: real("confidence").notNull(), feedback: text("feedback").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const masteryStates = sqliteTable("mastery_states", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), nodeId: text("node_id").notNull().references(() => knowledgeNodes.id),
  understanding: real("understanding").notNull().default(0), recall: real("recall").notNull().default(0), application: real("application").notNull().default(0),
  transfer: real("transfer").notNull().default(0), retention: real("retention").notNull().default(0), confidence: real("confidence").notNull().default(0),
  nextReviewAt: integer("next_review_at", { mode: "timestamp" }), updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("mastery_user_node_unique").on(t.userId, t.nodeId)]);

export const evidence = sqliteTable("mastery_evidence", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => users.id), nodeId: text("node_id").notNull().references(() => knowledgeNodes.id),
  type: text("type", { enum: ["assessment", "project", "oral_defense", "delayed_review", "human_review"] }).notNull(),
  score: real("score").notNull(), artifactUrl: text("artifact_url"), evaluatorVersion: text("evaluator_version").notNull(), verifiedAt: integer("verified_at", { mode: "timestamp" }).notNull(),
});

export const sourceDocuments = sqliteTable("source_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  sourceKind: text("source_kind", { enum: ["file", "text", "web"] }).notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  sourceUrl: text("source_url"),
  objectKey: text("object_key"),
  openaiFileId: text("openai_file_id"),
  vectorStoreId: text("vector_store_id"),
  status: text("status", { enum: ["processing", "ready", "failed"] }).notNull().default("processing"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  index("idx_source_documents_user_created").on(t.userId, t.createdAt),
  index("idx_source_documents_vector_store").on(t.vectorStoreId),
]);

export const courseVersions = sqliteTable("course_versions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  catalogCourseId: text("catalog_course_id").notNull(),
  locale: text("locale", { enum: ["zh", "en"] }).notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  courseJson: text("course_json").notNull(),
  bundleJson: text("bundle_json").notNull(),
  grounding: text("grounding").notNull(),
  vectorStoreId: text("vector_store_id"),
  responseId: text("response_id").notNull(),
  model: text("model").notNull(),
  qualityScore: real("quality_score"),
  qualityStatus: text("quality_status", { enum: ["passed", "review", "blocked"] }).notNull().default("review"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  uniqueIndex("course_versions_user_catalog_locale_version_unique").on(t.userId, t.catalogCourseId, t.locale, t.version),
  index("idx_course_versions_user_created").on(t.userId, t.createdAt),
  index("idx_course_versions_quality_status").on(t.qualityStatus, t.createdAt),
]);

export const qualityReports = sqliteTable("quality_reports", {
  id: text("id").primaryKey(),
  courseVersionId: text("course_version_id").notNull().references(() => courseVersions.id),
  evaluatorModel: text("evaluator_model").notNull(),
  overallScore: real("overall_score").notNull(),
  reportJson: text("report_json").notNull(),
  status: text("status", { enum: ["passed", "review", "blocked"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_quality_reports_course_version").on(t.courseVersionId)]);

export const learningEvents = sqliteTable("learning_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  courseVersionId: text("course_version_id").references(() => courseVersions.id),
  eventType: text("event_type", { enum: ["course_opened", "lesson_started", "tutor_turn", "practice_answered", "review_completed"] }).notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  index("idx_learning_events_user_created").on(t.userId, t.createdAt),
  index("idx_learning_events_course_version").on(t.courseVersionId),
]);

export const usageDaily = sqliteTable("usage_daily", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  day: text("day").notNull(),
  requests: integer("requests").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  failures: integer("failures").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("usage_daily_user_day_unique").on(t.userId, t.day)]);

export const billingCustomers = sqliteTable("billing_customers", {
  userId: text("user_id").primaryKey().references(() => users.id),
  provider: text("provider", { enum: ["stripe"] }).notNull().default("stripe"),
  providerCustomerId: text("provider_customer_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("billing_customers_provider_customer_unique").on(t.provider, t.providerCustomerId)]);

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  provider: text("provider", { enum: ["stripe"] }).notNull().default("stripe"),
  providerSubscriptionId: text("provider_subscription_id").notNull(),
  providerCustomerId: text("provider_customer_id").notNull(),
  planId: text("plan_id", { enum: ["personal", "pro", "team"] }).notNull(),
  billingInterval: text("billing_interval", { enum: ["month", "year"] }).notNull(),
  status: text("status").notNull(),
  cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }).notNull().default(false),
  currentPeriodStart: integer("current_period_start", { mode: "timestamp" }),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  uniqueIndex("subscriptions_provider_subscription_unique").on(t.provider, t.providerSubscriptionId),
  index("idx_subscriptions_user_status").on(t.userId, t.status),
  index("idx_subscriptions_customer").on(t.providerCustomerId),
]);

export const entitlementUsage = sqliteTable("entitlement_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  month: text("month").notNull(),
  metric: text("metric", { enum: ["ai_credits"] }).notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("entitlement_usage_user_month_metric_unique").on(t.userId, t.month, t.metric)]);

export const billingInvoices = sqliteTable("billing_invoices", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  providerSubscriptionId: text("provider_subscription_id"),
  amountPaid: integer("amount_paid").notNull().default(0),
  currency: text("currency").notNull().default("cny"),
  status: text("status").notNull(),
  hostedInvoiceUrl: text("hosted_invoice_url"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  index("idx_billing_invoices_user_created").on(t.userId, t.createdAt),
  index("idx_billing_invoices_subscription").on(t.providerSubscriptionId),
]);

export const billingEvents = sqliteTable("billing_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  livemode: integer("livemode", { mode: "boolean" }).notNull().default(false),
  processedAt: integer("processed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [index("idx_billing_events_processed").on(t.processedAt, t.createdAt)]);

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id), purpose: text("purpose").notNull(), model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(), inputTokens: integer("input_tokens").notNull().default(0), outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(), status: text("status", { enum: ["success", "failed", "blocked"] }).notNull(),
  responseId: text("response_id"), errorCode: text("error_code"), courseVersionId: text("course_version_id").references(() => courseVersions.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [
  index("idx_ai_runs_user_created").on(t.userId, t.createdAt),
  index("idx_ai_runs_status_created").on(t.status, t.createdAt),
]);

// Evidence-driven mastery per learner × course version × lesson (see lib/onelearn/mastery.ts).
export const masteryRecords = sqliteTable("mastery_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  courseVersionId: text("course_version_id").notNull().references(() => courseVersions.id),
  nodeKey: text("node_key").notNull(),
  nodeTitle: text("node_title").notNull(),
  understanding: real("understanding").notNull().default(0),
  recall: real("recall").notNull().default(0),
  application: real("application").notNull().default(0),
  transfer: real("transfer").notNull().default(0),
  attempts: integer("attempts").notNull().default(0),
  correctAttempts: integer("correct_attempts").notNull().default(0),
  unassistedPasses: integer("unassisted_passes").notNull().default(0),
  reviewPasses: integer("review_passes").notNull().default(0),
  stabilityDays: real("stability_days").notNull().default(1),
  firstPassAt: integer("first_pass_at"),
  lastEvidenceAt: integer("last_evidence_at"),
  nextReviewAt: integer("next_review_at"),
  updatedAt: integer("updated_at").notNull(),
}, (t) => [
  uniqueIndex("mastery_records_user_course_node_unique").on(t.userId, t.courseVersionId, t.nodeKey),
  index("idx_mastery_records_user_review").on(t.userId, t.nextReviewAt),
]);

// Learner-submitted support requests, triaged in the operations center.
export const feedback = sqliteTable("feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  category: text("category", { enum: ["bug", "billing", "content", "suggestion", "other"] }).notNull(),
  message: text("message").notNull(),
  page: text("page"),
  status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
  createdAt: integer("created_at").notNull(),
  resolvedAt: integer("resolved_at"),
}, (t) => [
  index("idx_feedback_status_created").on(t.status, t.createdAt),
  index("idx_feedback_user_created").on(t.userId, t.createdAt),
]);

// Lessons generated on demand after the first one (the first lesson lives in the course bundle).
export const lessonContents = sqliteTable("lesson_contents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  courseVersionId: text("course_version_id").notNull().references(() => courseVersions.id),
  lessonId: text("lesson_id").notNull(),
  lessonJson: text("lesson_json").notNull(),
  responseId: text("response_id"),
  createdAt: integer("created_at").notNull(),
}, (t) => [uniqueIndex("lesson_contents_course_lesson_unique").on(t.courseVersionId, t.lessonId)]);

// Placement diagnostic per learner × course version (see lib/onelearn/diagnostic.ts).
export const diagnostics = sqliteTable("diagnostics", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  courseVersionId: text("course_version_id").notNull().references(() => courseVersions.id),
  questionsJson: text("questions_json").notNull(),
  answersJson: text("answers_json"),
  knownModulesJson: text("known_modules_json"),
  createdAt: integer("created_at").notNull(),
  completedAt: integer("completed_at"),
}, (t) => [uniqueIndex("diagnostics_user_course_unique").on(t.userId, t.courseVersionId)]);

// Extra AI credits on top of the plan for a given month (referral rewards, goodwill).
// The unique (user, reason, reference) key makes every grant idempotent.
export const creditGrants = sqliteTable("credit_grants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  month: text("month").notNull(),
  credits: integer("credits").notNull(),
  reason: text("reason").notNull(),
  reference: text("reference").notNull(),
  createdAt: integer("created_at").notNull(),
}, (t) => [
  uniqueIndex("credit_grants_user_reason_reference_unique").on(t.userId, t.reason, t.reference),
  index("idx_credit_grants_user_month").on(t.userId, t.month),
]);

export const referralCodes = sqliteTable("referral_codes", {
  userId: text("user_id").primaryKey().references(() => users.id),
  code: text("code").notNull(),
  createdAt: integer("created_at").notNull(),
}, (t) => [uniqueIndex("referral_codes_code_unique").on(t.code)]);

export const referrals = sqliteTable("referrals", {
  id: text("id").primaryKey(),
  referrerUserId: text("referrer_user_id").notNull().references(() => users.id),
  inviteeUserId: text("invitee_user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  createdAt: integer("created_at").notNull(),
}, (t) => [
  uniqueIndex("referrals_invitee_unique").on(t.inviteeUserId),
  index("idx_referrals_referrer").on(t.referrerUserId, t.createdAt),
]);

// Public, revocable link to a learner's verified capabilities.
export const proofShares = sqliteTable("proof_shares", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  revokedAt: integer("revoked_at"),
}, (t) => [uniqueIndex("proof_shares_user_unique").on(t.userId)]);

// Realtime voice tutor sessions. Time is reserved from the monthly voice allowance
// (entitlement_usage metric 'voice_seconds') at start and settled on end.
export const voiceSessions = sqliteTable("voice_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  courseVersionId: text("course_version_id"),
  lessonId: text("lesson_id"),
  month: text("month").notNull(),
  reservedSeconds: integer("reserved_seconds").notNull(),
  usedSeconds: integer("used_seconds"),
  startedAt: integer("started_at").notNull(),
  endedAt: integer("ended_at"),
}, (t) => [index("idx_voice_sessions_user_started").on(t.userId, t.startedAt)]);
