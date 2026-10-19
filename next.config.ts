import type { NextConfig } from "next";

// The main domain and the standalone new-site hosts serve /new at their root.
const newHost = [
  {
    type: "host" as const,
    value: "(www\\.)?rghv\\.ca|new\\.rghv\\.ca|rghv-new.*\\.vercel\\.app",
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Everything under /public is effectively immutable — let the optimizer's
    // responses live in caches for a year instead of the 60s default.
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    return {
      // beforeFiles runs ahead of the filesystem, so the catch-all has to skip
      // Next internals, the API, anything with a file extension in /public, and
      // /new itself (which would otherwise become /new/new).
      beforeFiles: [
        {
          source: "/",
          has: newHost,
          destination: "/new",
        },
        {
          source: "/:path((?!_next/|api/|new/|new$)(?!.*\\.).*)",
          has: newHost,
          destination: "/new/:path",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*.(avif|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
