import type { NextConfig } from "next";

// Sent with every response. The CSP leaves scripts and connections open: a strict script policy
// needs a nonce per request, which makes every page dynamic (slower), and LiveKit and Excalidraw
// load from several origins. It still stops other sites from framing the app (clickjacking).
// Referrer policy: not "no-referrer", which would turn same-origin POSTs' Origin header into
// "null" and break server actions. Cross-origin requests never see the path (invite slugs).
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
