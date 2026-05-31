import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Otherwise Next/Turbopack mis-detects it as the
  // user's home dir (a stray package-lock.json lives there + multiple
  // lockfiles), which breaks file-watching/HMR so dev edits never recompile.
  turbopack: {
    root: process.cwd(),
  },
  // Frontend prototype — relaxed checks for rapid iteration.
  // Tighten before backend integration in Phase 2.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
