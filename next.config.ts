import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: { authInterrupts: true },
};

export default nextConfig;
