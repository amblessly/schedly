import type { NextConfig } from "next";
import { config as loadDotenv } from "dotenv";

// Load .env.secret so secrets stay out of .env.local and git.
loadDotenv({ path: ".env.secret", quiet: true });

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${appUrl} https://*.vercel.app https://*.blob.vercel-storage.com https://blob.vercel-storage.com https://openweathermap.org https://*.openweathermap.org`,
  `media-src 'self' data: blob: ${appUrl} https://*.vercel.app https://*.blob.vercel-storage.com https://blob.vercel-storage.com`,
  "font-src 'self'",
  `connect-src 'self' ${appUrl} https://*.vercel.app https://*.blob.vercel-storage.com https://blob.vercel-storage.com https://challenges.cloudflare.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["report-uri /api/csp-report"]),
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), usb=(), serial=(), bluetooth=(), midi=(), sync-xhr=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
    {
      source: "/(dashboard)/:path*",
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    },
  ],
};

export default nextConfig;
