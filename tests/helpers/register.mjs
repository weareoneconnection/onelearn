// Registers the test resolver: maps "@/…" aliases and extensionless relative
// imports to .ts files, and "cloudflare:workers" to an in-memory SQLite D1.
import { register } from "node:module";

register("./resolver.mjs", import.meta.url);
