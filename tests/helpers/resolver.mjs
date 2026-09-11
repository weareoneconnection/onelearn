import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("../../", import.meta.url);

function withTsExtension(url) {
  const path = fileURLToPath(url);
  for (const candidate of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate) && !candidate.endsWith("/")) {
      try { if (!existsSync(`${candidate}/`)) return pathToFileURL(candidate).href; } catch { /* file */ }
    }
  }
  return null;
}

export async function resolve(specifier, context, next) {
  if (specifier === "cloudflare:workers") return { url: new URL("./fake-workers.mjs", import.meta.url).href, shortCircuit: true };
  // "next" has no ESM exports map, so subpaths like next/headers need their .js file.
  if (/^next\/[a-z-]+$/.test(specifier)) return next(`${specifier}.js`, context);
  if (specifier.startsWith("@/")) {
    const resolved = withTsExtension(new URL(specifier.slice(2), root));
    if (resolved) return { url: resolved, shortCircuit: true };
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    const resolved = withTsExtension(new URL(specifier, context.parentURL));
    if (resolved) return { url: resolved, shortCircuit: true };
  }
  return next(specifier, context);
}
