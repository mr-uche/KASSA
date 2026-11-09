import type { NextConfig } from "next";

// Optional, exact HTTPS tunnel hostname (without protocol or path) for phone testing.
// Never allow every trycloudflare.com origin on a development server.
const httpsDevHost = process.env.KASSA_HTTPS_DEV_HOST?.trim();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.11.44.8",
    ...(httpsDevHost ? [httpsDevHost] : []),
  ],
};

export default nextConfig;
