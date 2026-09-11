import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Production domain shape. Demo mode does not require a database.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), email: text("email").notNull(), displayName: text("display_name"),
  locale: text("locale").notNull().default("en"), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("users_email_unique").on(t.email)]);

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

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => users.id), purpose: text("purpose").notNull(), model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(), inputTokens: integer("input_tokens").notNull().default(0), outputTokens: integer("output_tokens").notNull().default(0),
  latencyMs: integer("latency_ms").notNull(), status: text("status", { enum: ["success", "failed", "blocked"] }).notNull(), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
