import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep tracing and Turbopack scoped to this checkout when a parent folder
  // contains another lockfile. Vercel already builds from the repository root.
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
