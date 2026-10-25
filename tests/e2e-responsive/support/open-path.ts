import { readResolved, type Persona, type PersonaId } from './personas';
import { isDynamic, pathnameOf, type Resolution } from './resolve';
import { SHARES_RESOLVED_IDS_WITH } from './routes';

const resolvedCache = new Map<PersonaId, Record<string, Resolution>>();

function resolvedFor(id: PersonaId): Record<string, Resolution> {
  const source = SHARES_RESOLVED_IDS_WITH[id] ?? id;
  const cached = resolvedCache.get(source);
  if (cached) return cached;
  const data = readResolved(source) as Record<string, Resolution>;
  resolvedCache.set(source, data);
  return data;
}

/** Resolves the concrete path to open, or the reason it cannot be opened. */
export function concretePath(persona: Persona, route: string): { open: string | null; reason?: string } {
  if (!isDynamic(route)) return { open: route };
  const r = resolvedFor(persona.id)[pathnameOf(route)];
  if (!r) return { open: null, reason: 'dynamic route was not resolved (resolve setup did not run)' };
  if (!r.path) return { open: null, reason: r.reason ?? 'could not be resolved' };
  return { open: r.path };
}

/**
 * RESPONSIVE_ROUTE_FILTER: regex tested against "<persona> <route>"; only matches run.
 * RESPONSIVE_SAMPLE=N: keep every Nth route of each persona (deterministic, always keeps the
 * first). The default is every route; both exist because a dev server needs hours for the full
 * list on several devices. The warm-up pass uses the same selection, so it only warms what runs.
 */
export function selectRoutes(persona: PersonaId, routes: string[]): string[] {
  const filter = process.env.RESPONSIVE_ROUTE_FILTER ? new RegExp(process.env.RESPONSIVE_ROUTE_FILTER) : null;
  const every = Math.max(1, Number(process.env.RESPONSIVE_SAMPLE ?? 1));
  return routes.filter((route, index) => index % every === 0 && (!filter || filter.test(`${persona} ${route}`)));
}
