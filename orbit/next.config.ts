import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Static export keeps the prototype hostable anywhere; detail views use
  // query parameters (?id=) so user-created records work without a server.
  output: process.env.ORBIT_STATIC_EXPORT ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
