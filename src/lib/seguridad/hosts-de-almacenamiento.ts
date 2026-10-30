import { HOSTS_S3_DATA } from './buckets-s3.data.mjs';

/**
 * Hosts of the new object storage (S3 + CloudFront), T-0182.
 *
 * Contract: private objects are served through presigned GET URLs on the
 * regional virtual-hosted S3 host of one of two exact buckets; public assets
 * come from CloudFront. Supabase hosts stay allowed during the transition and
 * are handled by each caller. This module only knows the NEW hosts so the
 * allowlist lives in one place (image optimizer, document proxy, CSP).
 */

/** Exact allowlist (see `buckets-s3.data.mjs`): no `leasefy-prod-*` pattern, bucket names are global. */
const S3_PRIVADOS: ReadonlySet<string> = new Set(HOSTS_S3_DATA);

export function esHostDeS3Privado(hostname: string): boolean {
  return S3_PRIVADOS.has(hostname);
}

/**
 * `NEXT_PUBLIC_ASSETS_HOST` (bare hostname of the CloudFront public-assets
 * distribution) -> normalized lowercase host, or `null` when unset/invalid.
 * A pasted `https://host/` is tolerated; wildcards and paths are not.
 */
export function hostDeAssets(valor: string | undefined): string | null {
  const v = valor?.trim().toLowerCase();
  if (!v) return null;
  const sinEsquema = v.replace(/^https:\/\//, '').replace(/\/$/, '');
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(sinEsquema) ? sinEsquema : null;
}

/** Is `hostname` one of the new storage hosts (S3 private bucket or the configured CloudFront host)? */
export function esHostDeAlmacenamientoNuevo(hostname: string, assetsHostCrudo: string | undefined): boolean {
  if (esHostDeS3Privado(hostname)) return true;
  const assets = hostDeAssets(assetsHostCrudo);
  return assets !== null && hostname === assets;
}
