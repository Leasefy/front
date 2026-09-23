/**
 * Contar cosas en español, sin escribir «1 disponibles».
 *
 * ── Por qué existe (21-09-2026) ────────────────────────────────────────────
 *
 * El resumen del negocio decía «108 · 5 arrendadas · **1 disponibles** · 102
 * fuera del catálogo». La frase venía de una clave de i18n con el plural
 * clavado (`"{{rented}} arrendadas · {{available}} disponibles"`), así que con
 * un inmueble decía «1 disponibles» y con cero decía «0 disponibles», que está
 * bien, pero con uno no.
 *
 * El back ya tenía este primitivo (`common/texto/plural.ts` +
 * `contar(n, 'cuota')`) y hasta un guardián que prohíbe «cuota(s)». El front no
 * lo tenía, así que cada pantalla lo resolvía a mano o no lo resolvía.
 *
 * ── Lo que NO hace ─────────────────────────────────────────────────────────
 *
 * No adivina plurales irregulares ni géneros. El español tiene reglas
 * suficientes para el 95 % (`-s` / `-es`), y lo que no cae ahí se pasa
 * explícito. Inventar «lápizs» es peor que pedir el plural.
 */

/**
 * El plural de una palabra española, por la regla corriente.
 *
 *   · vocal (no tónica) → `+s`: «casa» → «casas»
 *   · `-z` → `-ces`: «vez» → «veces»
 *   · consonante → `+es`: «mes» → «meses»
 */
export function plural(palabra: string): string {
  if (palabra === '') return palabra;
  const ultima = palabra.slice(-1).toLowerCase();
  if ('aeiou'.includes(ultima)) return `${palabra}s`;
  if (ultima === 'z') return `${palabra.slice(0, -1)}ces`;
  return `${palabra}es`;
}

/**
 * «1 inmueble», «3 inmuebles», «0 inmuebles».
 *
 * El número va con separador de miles en español: «1.944 inmuebles», porque
 * «1944 inmuebles» en un subtítulo de tarjeta se lee como un año.
 */
export function contar(
  cuantos: number,
  singular: string,
  pluralExplicito?: string,
): string {
  const palabra =
    cuantos === 1 ? singular : (pluralExplicito ?? plural(singular));
  return `${cuantos.toLocaleString('es-CO')} ${palabra}`;
}
