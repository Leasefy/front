/**
 * Private S3 buckets the front may talk to (T-0182). SINGLE source of truth,
 * imported by `next.config.mjs` (images.remotePatterns), the CSP, `/api/docs`
 * and `fotoPermitida` so the four cannot drift. Plain `.mjs` because
 * next.config cannot import TypeScript.
 *
 * Exact hostnames only: bucket names are global, so a `leasefy-prod-*`
 * pattern would also match a bucket someone else registers.
 * `leasefy-prod-public` is intentionally absent: it is served only through
 * CloudFront (NEXT_PUBLIC_ASSETS_HOST), nothing in the front reaches it directly.
 */
export const HOSTS_S3_DATA = [
  "leasefy-prod-files.s3.us-east-2.amazonaws.com",
  "leasefy-prod-avaluo.s3.us-east-2.amazonaws.com",
];
