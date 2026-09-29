import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isProd = process.env.NODE_ENV === "production";

const withPWA = withPWAInit({
  dest: "public",
  disable: !isProd,
  register: true,
  fallbacks: {
    document: "/offline",
  },
  customWorkerSrc: "worker",
  customWorkerPrefix: "akiba",
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\/eagaseke\/.*/i,
        handler: "NetworkOnly",
        method: "GET",
      },
      {
        urlPattern: /^https?:\/\/.*\/api\/auth\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https?:\/\/.*\/api\/ws-token.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /^https?:\/\/.*\/socket\.io\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "akiba-images",
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 },
        },
      },
      {
        urlPattern: /^https?:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "akiba-fonts",
          expiration: { maxEntries: 32, maxAgeSeconds: 365 * 24 * 3600 },
        },
      },
    ],
  },
});

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
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
  // Docker / VPS : standalone. Sur Vercel, laisser le runtime natif.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },
    ];
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

export default withPWA(nextConfig);
