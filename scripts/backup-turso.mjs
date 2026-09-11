// Read-only export of every table in the Turso database to backups/turso-<timestamp>.json.
// Backups contain personal data: keep them local (backups/ is git-ignored) and encrypted at rest.
import { mkdirSync, writeFileSync } from "node:fs";

try { process.loadEnvFile(".env.local"); } catch { /* variables may come from the shell */ }
const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}

const { createClient } = await import("@libsql/client/web");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const tables = (await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
  .rows.map((row) => String(row.name));

const dump = { exportedAt: new Date().toISOString(), database: new URL(url.replace(/^libsql:/, "https:")).host, tables: {} };
let rows = 0;
for (const table of tables) {
  const result = await client.execute(`SELECT * FROM "${table.replaceAll('"', '""')}"`);
  dump.tables[table] = result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => {
    const value = row[index];
    return [column, typeof value === "bigint" ? Number(value) : value];
  })));
  rows += result.rows.length;
}

mkdirSync("backups", { recursive: true });
const file = `backups/turso-${dump.exportedAt.replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(`Backed up ${tables.length} tables (${rows} rows) to ${file}`);
