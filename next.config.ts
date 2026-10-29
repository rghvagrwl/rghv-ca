import type { NextConfig } from "next";

// Keep the current site on /new while the fresh site gets its own canvas.
const currentSiteHost = [
  {
    type: "host" as const,
    value: "(www\\.)?rghv\\.ca|new\\.rghv\\.ca",
  },
];

const canvasHost = [
  {
    type: "host" as const,
    value: "rghv-new.*\\.vercel\\.app|localhost(?::\\d+)?|127\\.0\\.0\\.1(?::\\d+)?",
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
          source: "/writing/:slug",
          has: canvasHost,
          destination: "/canvas/writing/:slug",
        },
        {
          source: "/work/:slug",
          has: canvasHost,
          destination: "/canvas/work/:slug",
        },
        {
          source: "/work",
          has: canvasHost,
          destination: "/canvas/work",
        },
        {
          source: "/captures/:slug",
          has: canvasHost,
          destination: "/canvas/captures/:slug",
        },
        {
          source: "/captures",
          has: canvasHost,
          destination: "/canvas/captures",
        },
        {
          source: "/",
          has: canvasHost,
          destination: "/canvas",
        },
        {
          source: "/",
          has: currentSiteHost,
          destination: "/new",
        },
        {
          source: "/:path((?!_next/|api/|new/|new$)(?!.*\\.).*)",
          has: currentSiteHost,
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
