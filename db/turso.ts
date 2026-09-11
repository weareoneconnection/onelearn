import type { D1Database } from "@cloudflare/workers-types";
import type { Client, InStatement, InValue, ResultSet } from "@libsql/client/web";

// Minimal D1-compatible facade over Turso (libSQL), so the raw SQL in
// lib/onelearn runs unchanged on hosts without a D1 binding (e.g. Vercel).
// Only the D1 surface this app uses is implemented: prepare/bind/first/all/run and batch.

type Row = Record<string, unknown>;

function normalizeArg(value: unknown): InValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (value instanceof ArrayBuffer || value instanceof Uint8Array) return value;
  return String(value);
}

function toRows(result: ResultSet): Row[] {
  return result.rows.map((row) => Object.fromEntries(result.columns.map((column, index) => [column, row[index]])));
}

function toD1Result(result: ResultSet) {
  return { results: toRows(result), success: true, meta: { changes: result.rowsAffected, last_row_id: Number(result.lastInsertRowid ?? 0) } };
}

class TursoStatement {
  private readonly client: Promise<Client>;
  readonly sql: string;
  readonly args: InValue[];

  constructor(client: Promise<Client>, sql: string, args: InValue[] = []) {
    this.client = client;
    this.sql = sql;
    this.args = args;
  }

  bind(...values: unknown[]) {
    return new TursoStatement(this.client, this.sql, values.map(normalizeArg));
  }

  toStatement(): InStatement {
    return { sql: this.sql, args: this.args };
  }

  private async execute() {
    return (await this.client).execute(this.toStatement());
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = toRows(await this.execute())[0];
    if (!row) return null;
    return (column ? row[column] ?? null : row) as T | null;
  }

  async all() {
    return toD1Result(await this.execute());
  }

  async run() {
    return toD1Result(await this.execute());
  }
}

export function createTursoDatabase(url: string, authToken?: string): D1Database {
  const client = import("@libsql/client/web").then(({ createClient }) => createClient({ url, authToken }));
  return {
    prepare: (sql: string) => new TursoStatement(client, sql),
    batch: async (statements: TursoStatement[]) => {
      const results = await (await client).batch(statements.map((statement) => statement.toStatement()), "write");
      return results.map(toD1Result);
    },
  } as unknown as D1Database;
}
