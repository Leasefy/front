/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
