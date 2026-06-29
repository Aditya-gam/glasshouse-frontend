import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

// Visualize the client/server bundles with `pnpm analyze` (ANALYZE=true). No-op otherwise.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {/* config options here */};

export default withBundleAnalyzer(nextConfig);
