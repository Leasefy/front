/**
 * Las portadas de Leasefy para la página de una inmobiliaria (Nico, 12-10-2026:
 * «que puedan elegir cómo se van a ver en la red social; si no eligen nada,
 * toma los predeterminados nuestros»). La inmobiliaria sube la suya o elige una
 * de éstas (se guarda la ruta en `portadaUrl`); sin ninguna, sale la primera.
 * El back acepta exactamente esta lista (`marketplace/portadas-de-leasefy.ts`).
 */
export const PORTADAS_DE_LEASEFY = [
  { src: '/marketplace/portadas/leasefy-1.webp', nombre: 'Sala moderna' },
  { src: '/marketplace/portadas/leasefy-2.webp', nombre: 'Blanco y luz' },
  { src: '/marketplace/portadas/leasefy-3.webp', nombre: 'Espacio abierto' },
  { src: '/marketplace/portadas/leasefy-4.webp', nombre: 'Clásico oscuro' },
  { src: '/marketplace/portadas/leasefy-5.webp', nombre: 'Cálido' },
  { src: '/marketplace/portadas/leasefy-6.webp', nombre: 'Rústico' },
] as const;

/** La portada que se pinta: la de la inmobiliaria o, sin ninguna, la primera de Leasefy. */
export function portadaDe(portadaUrl: string | null | undefined): string {
  return portadaUrl || PORTADAS_DE_LEASEFY[0].src;
}

/** ¿Es una de las de Leasefy (no una que subió la inmobiliaria)? */
export function esPortadaDeLeasefy(portadaUrl: string | null | undefined): boolean {
  return PORTADAS_DE_LEASEFY.some((p) => p.src === portadaUrl);
}
