import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: { serverActions: { bodySizeLimit: "110mb" } },
};

export default nextConfig;
