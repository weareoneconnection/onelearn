import { defineConfig } from "drizzle-kit";

// Applies the same migrations in ./drizzle to a Turso database (used by Vercel deployments).
try { process.loadEnvFile(".env.local"); } catch { /* env may come from the shell instead */ }

if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is not set");

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
