/**
 * Dynamic-segment resolution, kept free of Playwright so it can be reasoned about (and
 * unit tested) on its own. The crawler is injected: `getLinks(path)` returns the same-origin
 * hrefs (pathname only) found on a page.
 */

export interface Resolution {
  path: string | null;
  reason?: string;
}

export const isDynamic = (pattern: string): boolean => /\[[^\]]+\]/.test(pattern.split('?')[0]);

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pathname of a route that may carry a query string. */
export const pathnameOf = (route: string): string => route.split('?')[0].replace(/\/+$/, '') || '/';

export interface ResolveContext {
  /** Pathnames found on a page (cached by the caller). */
  getLinks: (path: string) => Promise<string[]>;
  /** Overrides: pattern -> pages to crawl instead of the parent path. */
  listSources: Record<string, string[]>;
  /** Every static (non-dynamic) route of the persona, so `/x/nuevo` is not mistaken for an id. */
  staticRoutes: Set<string>;
  /** Memo shared across calls. */
  memo: Map<string, Resolution>;
}

/**
 * Resolves `/a/[x]/b/[y]` to a concrete path. Strategy: the LAST dynamic segment is taken
 * from the first link `<concrete parent>/<segment>` found on a list page; anything after it
 * is appended unverified (a 404 then shows up as a page-error finding).
 */
export async function resolvePattern(pattern: string, ctx: ResolveContext): Promise<Resolution> {
  const key = pathnameOf(pattern);
  const cached = ctx.memo.get(key);
  if (cached) return cached;
  const result = await resolveUncached(key, ctx);
  ctx.memo.set(key, result);
  return result;
}

async function resolveUncached(pattern: string, ctx: ResolveContext): Promise<Resolution> {
  if (!isDynamic(pattern)) return { path: pattern };
  const segments = pattern.split('/').filter(Boolean);
  let last = -1;
  segments.forEach((s, i) => {
    if (/^\[.+\]$/.test(s)) last = i;
  });
  const tail = segments.slice(last + 1);

  if (tail.length > 0) {
    // Resolve the pattern that ends at the last dynamic segment, then append the static tail.
    const headPattern = '/' + segments.slice(0, last + 1).join('/');
    const head = await resolvePattern(headPattern, ctx);
    if (!head.path) return { path: null, reason: `parent ${headPattern} unresolved: ${head.reason}` };
    return { path: `${head.path}/${tail.join('/')}` };
  }

  const parentPattern = '/' + segments.slice(0, last).join('/');
  const parent = segments.slice(0, last).some((s) => /^\[.+\]$/.test(s))
    ? await resolvePattern(parentPattern, ctx)
    : { path: parentPattern === '/' ? '' : parentPattern };
  if (parent.path === null) {
    return { path: null, reason: `parent ${parentPattern} unresolved: ${parent.reason}` };
  }
  const prefix = parent.path;
  const sources = ctx.listSources[pattern] ?? [prefix === '' ? '/' : prefix];
  const matcher = new RegExp(`^${escapeRegex(prefix)}/[^/?#]+$`);

  const tried: string[] = [];
  for (const source of sources) {
    tried.push(source);
    let links: string[];
    try {
      links = await ctx.getLinks(source);
    } catch (error) {
      continue;
    }
    for (const href of links) {
      if (!matcher.test(href)) continue;
      if (ctx.staticRoutes.has(href)) continue; // e.g. /contratos/nuevo
      return { path: href };
    }
  }
  return { path: null, reason: `no link matching ${prefix}/<id> on ${tried.join(', ')}` };
}
