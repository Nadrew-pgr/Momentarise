import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@momentarise/shared"],
  turbopack: {
    // Monorepo root so Turbopack can resolve hoisted workspace dependencies.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
