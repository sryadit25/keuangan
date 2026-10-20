import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Aplikasi ini sepenuhnya per-request (session + query database), jadi
  // Cache Components tidak memberi manfaat dan justru mencoba prerender
  // halaman yang butuh sesi login.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
