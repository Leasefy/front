/**
 * Open-redirect prevention for `returnUrl` query params.
 *
 * A `returnUrl` taken from the query string can be assigned to
 * `window.location.href`, `<Link href>`, or a server-side redirect target.
 * Without validation an attacker can craft
 * `?returnUrl=https://evil.com` (or `//evil.com`, `/\evil.com`,
 * `javascript:...`) and use a trusted leasefy.co URL to redirect victims
 * to a hostile origin after a legitimate login (CWE-601).
 *
 * `sanitizeReturnUrl` only accepts single-leading-slash, same-origin
 * relative paths and falls back to a caller-provided default otherwise.
 */

// Control characters (0x00-0x1F, 0x7F) and the space character can be used to
// smuggle a different target past parsers/browsers; reject any value that
// contains one of them.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\x00-\x20\x7f]/;

/**
 * Returns `value` only if it is a safe same-origin relative path
 * (a single leading slash, no scheme, no protocol-relative `//` or `/\`,
 * no control characters). Otherwise returns `fallback`.
 */
export function sanitizeReturnUrl(value: unknown, fallback: string = '/'): string {
  if (typeof value !== 'string' || value.length === 0) {
    return fallback;
  }

  // Must be a relative path rooted at a single slash.
  if (value[0] !== '/') {
    return fallback;
  }

  // Reject protocol-relative ("//host") and backslash tricks ("/\host")
  // that browsers may normalize into an absolute cross-origin URL.
  if (value[1] === '/' || value[1] === '\\') {
    return fallback;
  }

  // Reject any scheme separator (e.g. "javascript:", "data:", "http:").
  if (value.includes(':')) {
    return fallback;
  }

  // Reject control characters and the space character.
  if (UNSAFE_CHARS.test(value)) {
    return fallback;
  }

  return value;
}
