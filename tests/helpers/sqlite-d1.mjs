import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// A real SQLite database with the D1 surface the app uses, migrated with the
// same drizzle/*.sql files that production runs.

const normalize = (value) => value === undefined ? null : typeof value === "boolean" ? (value ? 1 : 0) : value;

export function createSqliteD1() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migrations = new URL("../../drizzle/", import.meta.url);
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    for (const statement of readFileSync(new URL(file, migrations), "utf8").split("--> statement-breakpoint")) {
      if (statement.trim()) db.exec(statement);
    }
  }
  const statement = (sql, args = []) => ({
    sql,
    args,
    bind: (...values) => statement(sql, values.map(normalize)),
    first: async (column) => {
      const row = db.prepare(sql).get(...args) ?? null;
      return row && column ? row[column] ?? null : row ? { ...row } : null;
    },
    all: async () => ({ results: db.prepare(sql).all(...args).map((row) => ({ ...row })), success: true, meta: { changes: 0 } }),
    run: async () => {
      const result = db.prepare(sql).run(...args);
      return { results: [], success: true, meta: { changes: Number(result.changes) } };
    },
  });
  return {
    raw: db,
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      db.exec("BEGIN");
      try {
        const results = statements.map((item) => {
          const prepared = db.prepare(item.sql);
          if (/^\s*select/i.test(item.sql)) return { results: prepared.all(...item.args).map((row) => ({ ...row })), success: true, meta: { changes: 0 } };
          const result = prepared.run(...item.args);
          return { results: [], success: true, meta: { changes: Number(result.changes) } };
        });
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
