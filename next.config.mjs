import path from "path";
// Plain-ESM data file (not the .ts wrapper): next.config.mjs runs under
// Node with no TypeScript loader on Next.js 14.2. See
// src/lib/landing/legacy-redirects.ts for the typed re-export + rationale.
import { LEGACY_PRODUCT_REDIRECTS_DATA } from "./src/lib/landing/legacy-redirects.data.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permite validar el build de producción sin matar un `next dev` que esté
  // corriendo: los dos escriben en `.next` y se pisan. Con
  // `NEXT_DIST_DIR=.next-build pnpm build` cada uno usa el suyo.
  // Por defecto no cambia nada.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // @leasefy/cadence is symlinked (file:../cadence) and resolves its own copy of
  // @radix-ui/react-accordion from ../cadence/node_modules, while this app's
  // accordion adapter (src/components/ui/accordion.tsx) uses the local copy.
  // Two module instances create two Radix contexts and crash at runtime with
  // "`Accordion` must be used within `Accordion`". Alias to a single copy.
  // REMOVE together with the temporary flags below once cadence is published.
  webpack: (config) => {
    config.resolve.alias["@radix-ui/react-accordion"] = path.resolve(
      process.cwd(),
      "node_modules/@radix-ui/react-accordion"
    );
    return config;
  },
  // TEMPORARY (stg-demo integration): the redesign depends on @leasefy/cadence, linked
  // locally via `file:../cadence` (no real pnpm workspace, no published tarball yet).
  // That linkage still surfaces type errors and some lint noise. We let `next build`
  // produce a runnable bundle meanwhile.
  // REMOVE both flags once @leasefy/cadence ships as a published/versioned package.
  // `tsc --noEmit` still reports the linkage-induced errors, so nothing is hidden in CI.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Google OAuth avatars (users who sign in with Google get their
      // profile photo served from googleusercontent.com)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
    ];

    // Report-only CSP in production. NOT enforcing: the app relies on Next.js
    // inline hydration, JsonLd inline scripts, and signing pages — a strict
    // enforcing CSP would break them. Report-only lets us observe violations
    // before tightening to an enforced policy later.
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Content-Security-Policy-Report-Only",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // SLICE 8 (landing-react-port): 301 the retired /productos/* taxonomy
  // (evaluacion/pagos/contratos/aplicaciones/seguro/api) to their nearest
  // equivalent in the new 8-product taxonomy. Map + rationale live in
  // src/lib/landing/legacy-redirects.ts (unit-tested); this file just
  // wires the same data into Next's redirects() (build-validated, not
  // vitest-covered). CSP/security headers above are untouched.
  async redirects() {
    return LEGACY_PRODUCT_REDIRECTS_DATA;
  },
};

export default nextConfig;
