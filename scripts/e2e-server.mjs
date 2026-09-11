// Serves the production build for end-to-end tests from a directory that has no
// .env.local, and strips storage/auth/payment variables from the environment, so
// tests always run against in-memory storage and never reach real services.
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dir = join(root, ".e2e-app");
const port = process.env.E2E_PORT ?? "3310";

if (!existsSync(join(root, ".next", "BUILD_ID"))) {
  console.error("No production build found. Run `npm run build:vercel` first.");
  process.exit(1);
}

rmSync(dir, { recursive: true, force: true });
mkdirSync(dir);
cpSync(join(root, ".next"), join(dir, ".next"), { recursive: true });
cpSync(join(root, "public"), join(dir, "public"), { recursive: true });
cpSync(join(root, "package.json"), join(dir, "package.json"));
cpSync(join(root, "next.config.ts"), join(dir, "next.config.ts"));
symlinkSync(join(root, "node_modules"), join(dir, "node_modules"));

const env = { ...process.env };
for (const name of Object.keys(env)) {
  if (/^(TURSO_|CLERK_|STRIPE_|RESEND_|OPENAI_|SENTRY_|CRON_SECRET|ONELEARN_EMAIL_SECRET)/.test(name)) delete env[name];
}

const child = spawn(join(dir, "node_modules", ".bin", "next"), ["start", "-p", port], { cwd: dir, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code ?? 0);
});
