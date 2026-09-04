'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useOptionalI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/**
 * Route name mapping for screen reader announcements.
 *
 * Each pathname prefix maps to an `a11y.routes.*` translation key. Prefixes are
 * matched longest-first so nested routes (e.g. `/panel/inmobiliaria/configuracion/agentes`) win over
 * their parents (`/panel/inmobiliaria`, `/panel`).
 */
const ROUTE_NAME_KEYS: Record<string, string> = {
  // La vitrina de agentes vive en Configuración; los workspaces de cada agente
  // viven dentro de su módulo y se anuncian como el panel (ya no son sección).
  '/panel/inmobiliaria/configuracion/agentes': 'a11y.routes.agencyAi',
  '/panel/inmobiliaria': 'a11y.routes.agencyPanel',
  '/panel/beta': 'a11y.routes.assistant',
  '/panel': 'a11y.routes.landlordPanel',
  '/inquilino': 'a11y.routes.tenantPanel',
  '/propiedades': 'a11y.routes.search',
  '/publicar': 'a11y.routes.publish',
  '/pricing': 'a11y.routes.pricing',
  '/auth': 'a11y.routes.signIn',
  '/mis-aplicaciones': 'a11y.routes.myApplications',
  '/mi-arriendo': 'a11y.routes.myLease',
  '/aplicar': 'a11y.routes.apply',
  '/demo': 'a11y.routes.demo',
};

/**
 * Fallback names used on routes mounted outside any I18nProvider (e.g. the
 * public marketing pages). Keyed by the same `a11y.routes.*` keys so the wording
 * stays in sync with the locale files. Locale is read from the <html lang>
 * attribute, which I18nProvider keeps in sync with the user's selection.
 */
const FALLBACK_ROUTE_NAMES: Record<string, Record<Locale, string>> = {
  'a11y.routes.agencyAi': { es: 'Agentes IA', en: 'AI Agents' },
  'a11y.routes.agencyPanel': { es: 'Panel de Inmobiliaria', en: 'Agency Panel' },
  'a11y.routes.assistant': { es: 'Asistente', en: 'Assistant' },
  'a11y.routes.landlordPanel': { es: 'Panel de Propietario', en: 'Landlord Panel' },
  'a11y.routes.tenantPanel': { es: 'Panel de Inquilino', en: 'Tenant Panel' },
  'a11y.routes.search': { es: 'Buscar Inmuebles', en: 'Search Properties' },
  'a11y.routes.publish': { es: 'Publicar Inmueble', en: 'Publish Property' },
  'a11y.routes.pricing': { es: 'Precios', en: 'Pricing' },
  'a11y.routes.signIn': { es: 'Iniciar Sesión', en: 'Sign In' },
  'a11y.routes.myApplications': { es: 'Mis Aplicaciones', en: 'My Applications' },
  'a11y.routes.myLease': { es: 'Mi Arriendo', en: 'My Lease' },
  'a11y.routes.apply': { es: 'Aplicar a Propiedad', en: 'Apply to Property' },
  'a11y.routes.demo': { es: 'Demo', en: 'Demo' },
};

const FALLBACK_BRAND = 'Leasefy';
const FALLBACK_SENTENCE: Record<Locale, (page: string) => string> = {
  es: (page) => `Navegaste a ${page}`,
  en: (page) => `Navigated to ${page}`,
};

// Longest prefix first so nested routes win over their parents.
const SORTED_PREFIXES = Object.keys(ROUTE_NAME_KEYS).sort((a, b) => b.length - a.length);

function readDocumentLocale(): Locale {
  if (typeof document !== 'undefined' && document.documentElement.lang === 'en') {
    return 'en';
  }
  return 'es';
}

/**
 * RouteAnnouncer - Announces route changes to screen readers
 *
 * Uses an aria-live region to announce page navigation.
 * Next.js App Router doesn't trigger native page loads on client navigation,
 * so screen readers need explicit announcements.
 *
 * Mounted at the root layout (outside route-group I18nProviders), so it reads
 * i18n via useOptionalI18n() and falls back to a locale-aware built-in map on
 * public routes where no provider is present.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const i18n = useOptionalI18n();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const matchedKey = SORTED_PREFIXES.find((prefix) => pathname.startsWith(prefix));
    const routeKey = matchedKey ? ROUTE_NAME_KEYS[matchedKey] : undefined;

    if (i18n) {
      const pageName = routeKey ? i18n.t(routeKey) : FALLBACK_BRAND;
      setAnnouncement(i18n.t('a11y.routeAnnounce', { page: pageName }));
      return;
    }

    // No provider in tree (public routes): localize from <html lang>.
    const locale = readDocumentLocale();
    const pageName = routeKey ? FALLBACK_ROUTE_NAMES[routeKey][locale] : FALLBACK_BRAND;
    setAnnouncement(FALLBACK_SENTENCE[locale](pageName));
  }, [pathname, i18n]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
