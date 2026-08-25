/**
 * Hace que el modificador de opacidad funcione sobre los tokens que son un
 * `var(--x)` pelado.
 *
 * El problema: Tailwind sólo sabe inyectar alpha cuando puede leer los canales
 * del color. `hsl(var(--foreground))` lo reescribe a `hsl(var(--foreground) / .9)`
 * porque la var es un triplete HSL. Pero los tokens de @leasefy/cadence son
 * `var(--surface)` y esa var guarda un **hex**: Tailwind no puede componerlo y
 * entonces **no emite la regla**. `bg-surface/50` no existía en el CSS — no es
 * que se viera mal, es que no se veía.
 *
 * Medido el 2026-08-09 con un build aislado de Tailwind: 103 formas de clase
 * (768 usos) no generaban una sola línea de CSS. Ver docs/CLASES-OPACIDAD-MUERTAS.md.
 *
 * La solución es `color-mix()`, que compone en el navegador sin conocer los
 * canales. Soporte: Chrome 111+ · Safari 16.2+ · Firefox 113+.
 *
 * Sólo se transforman los valores que son EXACTAMENTE `var(--x)`. Un hex, un
 * `rgba()` o un `hsl(var(--x))` se dejan como están: Tailwind ya los resuelve.
 */

/** `var(--algo)` y nada más — sin fallback ni funciones alrededor. */
const SOLO_VAR = /^var\(--[a-z0-9-]+\)$/i;

type ValorDeColor = string | ((opts: { opacityValue?: string }) => string);

function conAlpha(valor: string): ValorDeColor {
  if (!SOLO_VAR.test(valor)) return valor;

  return ({ opacityValue }) => {
    const alpha = Number(opacityValue);
    // `undefined` (sin modificador) y `var(--tw-bg-opacity)` (la ruta legacy de
    // bg-opacity-*) caen acá como NaN: se devuelve el color entero.
    if (!Number.isFinite(alpha) || alpha >= 1) return valor;
    if (alpha <= 0) return 'transparent';
    return `color-mix(in srgb, ${valor} ${alpha * 100}%, transparent)`;
  };
}

/** Recorre el árbol de colores de Tailwind (anidado a profundidad libre). */
export function coloresConAlpha<T>(colores: T): T {
  if (typeof colores === 'string') return conAlpha(colores) as unknown as T;
  if (colores && typeof colores === 'object' && !Array.isArray(colores)) {
    return Object.fromEntries(
      Object.entries(colores as Record<string, unknown>).map(([clave, valor]) => [
        clave,
        coloresConAlpha(valor),
      ]),
    ) as T;
  }
  return colores;
}
