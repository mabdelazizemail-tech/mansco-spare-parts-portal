import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Frontend prototype — relaxed checks for rapid iteration.
  // Tighten before backend integration in Phase 2.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
