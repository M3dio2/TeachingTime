import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// The two outside services the browser talks to (from .env.local / Vercel's env vars).
const origin = (url: string | undefined) => {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
};
const supabase = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseHttps = supabase ? `https://${supabase}` : "";
const supabaseWss = supabase ? `wss://${supabase}` : "";

// Content Security Policy (H3, security review). An allow-list: scripts only from this site,
// connections only to Supabase and LiveKit (and esm.sh, where Excalidraw loads its fonts);
// Cloudflare's Turnstile script and frame on the login pages.
// It stops injected <script src>, eval, plugins, framing, and sending data to other sites
// with fetch/XHR/WebSocket/images.
// Not a nonce policy: inline scripts stay allowed ('unsafe-inline'), because Next's inline
// page data needs a nonce per request, which would make every page dynamic (no prerendering)
// and slower. See docs/ARCHITECTURE.md, "Security headers".
// 'wasm-unsafe-eval': Excalidraw compiles WebAssembly for its fonts. Dev also needs
// 'unsafe-eval' (React's dev tools) and the hot-reload socket.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabaseHttps}`,
  "font-src 'self' data: blob: https://esm.sh", // blob: fonts embedded in Word files
  `media-src 'self' blob: ${supabaseHttps}`,
  `connect-src 'self' ${supabaseHttps} ${supabaseWss} https://*.livekit.cloud wss://*.livekit.cloud https://esm.sh${
    isDev ? " ws: http://localhost:*" : ""
  }`,
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com", // Turnstile, the sign-up check (G1)
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

// Sent with every response.
// Referrer policy: not "no-referrer", which would turn same-origin POSTs' Origin header into
// "null" and break server actions. Cross-origin requests never see the path (invite slugs).
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
