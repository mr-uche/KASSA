import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permit the laptop's LAN IP to serve Next.js development assets to mobile browsers.
  // This applies only to next dev; do not use a wildcard for all origins.
  allowedDevOrigins: ["10.11.44.8"],
};

export default nextConfig;
