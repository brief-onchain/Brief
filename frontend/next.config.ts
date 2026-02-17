import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/zh-CN", permanent: false },
      { source: "/guide", destination: "/zh-CN/guide", permanent: false },
      { source: "/agents", destination: "/zh-CN/agents", permanent: false },
    ];
  },
};

export default nextConfig;
