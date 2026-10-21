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

const firstLine = (error: unknown): string => String(error).split(String.fromCharCode(10))[0].slice(0, 200);

const isParam = (segment: string): boolean => /^\[.+\]$/.test(segment);

const escapeRegex =(s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Pathname of a route that may carry a query string. */
export const pathnameOf = (route: string): string => route.split('?')[0].replace(/\/+$/, '') || '/';

export interface ResolveContext {
  /** Pathnames found on a page (cached by the caller). */
  getLinks: (path: string) => Promise<string[]>;
  /** Overrides: pattern -> pages to crawl instead of the parent path. */
  listSources: Record<string, string[]>;
  /** Every static (non-dynamic) route of the persona, so `/x/nuevo` is not mistaken for an id. */
  staticRoutes: Set<string>;
  /**
   * Fallback when no anchor matches (rows that navigate on click): open `source`, click a few
   * row-like elements and return the pathname the app navigated to, if it matches.
   */
  discoverByClick?: (source: string, matcher: RegExp, exclude: Set<string>) => Promise<string | null>;
  /**
   * Read-only API lookup for an id (a GET of a list endpoint with the persona's own session).
   * Tried before crawling: many lists are tables whose rows navigate on click, with no anchors.
   */
  idFromApi?: (headPattern: string) => Promise<string | null>;
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
    if (isParam(s)) last = i;
  });
  const tail = segments.slice(last + 1);

  // Everything before the last dynamic segment must itself be concrete.
  const parentPattern = '/' + segments.slice(0, last).join('/');
  const parent = segments.slice(0, last).some(isParam)
    ? await resolvePattern(parentPattern, ctx)
    : { path: parentPattern === '/' ? '' : parentPattern };
  if (parent.path === null) {
    return { path: null, reason: `parent ${parentPattern} unresolved: ${parent.reason}` };
  }
  const prefix = parent.path;
  const sources = ctx.listSources[pattern] ?? ctx.listSources[headOf(segments, last)] ?? [prefix === '' ? '/' : prefix];
  const tailPath = tail.length ? '/' + tail.join('/') : '';
  const withTail = new RegExp(`^${escapeRegex(prefix)}/([^/?#]+)${escapeRegex(tailPath)}$`);
  const headOnly = new RegExp(`^${escapeRegex(prefix)}/[^/?#]+$`);

  const apiId = ctx.idFromApi ? await ctx.idFromApi(headOf(segments, last)) : null;
  if (apiId) return { path: `${prefix}/${encodeURIComponent(apiId)}${tailPath}` };

  const tried: string[] = [];
  const pages: Array<{ source: string; links: string[] }> = [];
  for (const source of sources) {
    tried.push(source);
    try {
      pages.push({ source, links: await ctx.getLinks(source) });
    } catch (error) {
      console.warn(`[resolve] could not read ${source}: ${firstLine(error)}`);
      continue;
    }
  }
  // (a) a link that already carries the whole path (e.g. /contratos/<id>/firmar)
  if (tail.length) {
    for (const { links } of pages) {
      const hit = links.find((href) => withTail.test(href) && !ctx.staticRoutes.has(href));
      if (hit) return { path: hit };
    }
  }
  // (b) a link to the detail page; the static tail is appended unverified
  for (const { links } of pages) {
    const hit = links.find((href) => headOnly.test(href) && !ctx.staticRoutes.has(href));
    if (hit) return { path: hit + tailPath };
  }
  // (c) rows that navigate on click
  if (ctx.discoverByClick) {
    for (const source of sources) {
      try {
        const found = await ctx.discoverByClick(source, headOnly, ctx.staticRoutes);
        if (found) return { path: found + tailPath };
      } catch (error) {
        console.warn(`[resolve] click discovery failed on ${source}: ${firstLine(error)}`);
        continue;
      }
    }
  }
  return {
    path: null,
    reason: `no link or clickable row leading to ${prefix}/<id>${tailPath} on ${tried.join(', ') || '(no list page)'}`,
  };
}

/** The pattern that ends at the last dynamic segment (the key LIST_SOURCES overrides use for deep routes). */
function headOf(segments: string[], last: number): string {
  return '/' + segments.slice(0, last + 1).join('/');
}
