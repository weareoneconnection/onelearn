// Stand-in for the "cloudflare:workers" module. Tests put a SQLite-backed D1 on env.DB.
export const env = (globalThis.__onelearnTestEnv ??= {});
