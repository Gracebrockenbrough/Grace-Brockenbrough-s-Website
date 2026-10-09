import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't write an AGENTS.md into the project on `next dev`.
  agentRules: false,
  devIndicators: false,
};

export default nextConfig;
