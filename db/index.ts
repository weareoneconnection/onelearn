import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { createTursoDatabase } from "./turso";

export type OneLearnRuntimeBindings = {
  DB?: D1Database;
  SOURCES?: R2Bucket;
};

let bindingsPromise: Promise<OneLearnRuntimeBindings> | null = null;

export async function getRuntimeBindings(): Promise<OneLearnRuntimeBindings> {
  if (!bindingsPromise) {
    bindingsPromise = (async () => {
      try {
        // Keep the Cloudflare runtime import dynamic so the same application
        // can still compile and run on Vercel without D1 or R2 bindings.
        const runtimeModule = "cloudflare:workers";
        const runtime = await import(/* webpackIgnore: true */ runtimeModule) as {
          env?: OneLearnRuntimeBindings;
        };
        return runtime.env ?? {};
      } catch {
        return {};
      }
    })();
  }
  return bindingsPromise;
}

export async function getDb() {
  const { DB } = await getRuntimeBindings();
  return DB ? drizzle(DB, { schema }) : null;
}

let turso: D1Database | null = null;

/** D1 binding on Cloudflare; Turso (via a D1-compatible facade) when TURSO_DATABASE_URL is set; otherwise null. */
export async function getD1() {
  const { DB } = await getRuntimeBindings();
  if (DB) return DB;
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return null;
  turso ??= createTursoDatabase(url, process.env.TURSO_AUTH_TOKEN?.trim());
  return turso;
}

export async function getSourceBucket() {
  return (await getRuntimeBindings()).SOURCES ?? null;
}
