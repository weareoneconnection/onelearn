import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Production domain shape. Demo mode does not require a database.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), displayName: text("display_name"),
  locale: text("locale").notNull().default("en"), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.id),
  locale: text("locale", { enum: ["zh", "en"] }).notNull().default("zh"),
  activeCourseVersionId: text("active_course_version_id"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
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
