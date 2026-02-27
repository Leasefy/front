'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Route name mapping for screen reader announcements.
 * Maps pathname prefixes to human-readable Spanish page names.
 */
const ROUTE_NAMES: Record<string, string> = {
  '/propiedades': 'Buscar Inmuebles',
  '/publicar': 'Publicar Inmueble',
  '/pricing': 'Precios',
  '/auth': 'Iniciar Sesion',
  '/panel': 'Panel de Propietario',
  '/inquilino': 'Panel de Inquilino',
  '/mis-aplicaciones': 'Mis Aplicaciones',
  '/mi-arriendo': 'Mi Arriendo',
  '/aplicar': 'Aplicar a Propiedad',
  '/demo': 'Demo',
};

/**
 * RouteAnnouncer - Announces route changes to screen readers
 *
 * Uses an aria-live region to announce page navigation.
 * Next.js App Router doesn't trigger native page loads on client navigation,
 * so screen readers need explicit announcements.
 */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Find matching route name by prefix
    const matchedKey = Object.keys(ROUTE_NAMES).find((key) =>
      pathname.startsWith(key)
    );
    const pageName = matchedKey ? ROUTE_NAMES[matchedKey] : 'Leasefy';
    setAnnouncement(`Navegaste a ${pageName}`);
  }, [pathname]);

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
