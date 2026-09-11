import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

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

export async function getD1() {
  return (await getRuntimeBindings()).DB ?? null;
}

export async function getSourceBucket() {
  return (await getRuntimeBindings()).SOURCES ?? null;
}
