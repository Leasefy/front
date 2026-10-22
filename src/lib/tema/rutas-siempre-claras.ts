/**
 * Las páginas PÚBLICAS se ven siempre en claro (landing, marketplace, ficha,
 * perfil de la inmobiliaria, ayuda, planes, acceso…). Hasta el 21-10-2026 eso
 * lo hacía sólo `ForceLightMode`, DESPUÉS de hidratar: con el sistema en modo
 * oscuro, el marketplace se pintaba primero negro (~650 ms) y luego pasaba a
 * claro — el «flash negro super raro» que vio Nico al entrar desde la landing.
 *
 * Con esta lista, `ThemeProvider` le pasa `forcedTheme="light"` a next-themes,
 * cuyo script en línea lo aplica ANTES de la primera pintada. `ForceLightMode`
 * sigue en esas páginas como respaldo. PURA.
 */
const PREFIJOS_CLAROS = [
  '/propiedades',
  '/i/',
  '/ayuda',
  '/avaluo',
  '/terminos',
  '/privacidad',
  '/pricing',
  '/para/',
  '/blog',
  '/contacto',
  '/productos',
  '/auth',
  '/onboarding',
  '/aprobacion',
  '/arco/verify',
  '/agentes-preview/showcase',
] as const;

/** Quita el idioma de la URL pública (`/es/propiedades` → `/propiedades`). */
function sinIdioma(ruta: string): string {
  const m = /^\/(es|en)(?=\/|$)/.exec(ruta);
  return m ? ruta.slice(m[0].length) || '/' : ruta;
}

export function esRutaSiempreClara(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const ruta = sinIdioma(pathname.split('?')[0].split('#')[0]);
  if (ruta === '/' || ruta === '') return true;
  return PREFIJOS_CLAROS.some((p) =>
    p.endsWith('/') ? ruta.startsWith(p) : ruta === p || ruta.startsWith(`${p}/`),
  );
}
