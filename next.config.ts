import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // Évite ENOENT / MODULE_NOT_FOUND sur chunks après hot-reload agressif (env reload, etc.)
  webpack: (config, { dev, isServer }) => {
    if (dev && process.env.DISABLE_WEBPACK_FS_CACHE !== "0") {
      config.cache = { type: "memory" as const };
    }
    if (dev && !isServer) {
      config.output = config.output ?? {};
      config.output.chunkLoadTimeout = 180_000;
    }
    return config;
  },
};

export default nextConfig;
