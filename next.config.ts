import type { NextConfig } from "next";

// Content Security Policy. Goals (in priority order):
// 1. Block clickjacking via frame-ancestors — wallet-write tools must not be
//    iframable so an attacker can't trick a user into signing in a hidden frame.
// 2. Restrict object/embed (no Flash/PDF plugins as exfil vectors).
// 3. Limit connect-src to the APIs we actually call — bounds the blast radius
//    of any future XSS regression.
//
// We deliberately allow 'unsafe-inline' on script-src and style-src because
// Next.js App Router emits inline runtime scripts and Tailwind injects inline
// styles. Tightening to nonces is a follow-up worth doing once we have a
// monitoring path for CSP violations.
//
// img-src is permissive because token artwork lives on arbitrary IPFS gateways,
// data: URIs, and various HTTPS hosts an artist might use.

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https://api.tzkt.io wss://api.tzkt.io https://data.objkt.com https://mainnet.tezos.ecadinfra.com https://*.tezos.com https://*.tzkt.io https: wss:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
