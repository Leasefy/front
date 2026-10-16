import type { CSSProperties } from 'react'

/**
 * La cifra de plata que CABE en su ficha (15-10-2026, Juan de Portofino en
 * producción: «$ 7.112.907.502,14» se montaba sobre «Por vencer»).
 *
 * El tamaño de las franjas de resumen estaba pensado para diez dígitos sin
 * centavos («$ 1.636.622.564»). Con los centavos prendidos la cifra suma tres
 * caracteres y se sale de su ficha. En vez de adivinar anchos por pantalla, la
 * franja dice cuántos caracteres tiene su cifra más larga (`--largo-de-la-cifra`)
 * y cada ficha (`.ficha-con-cifra`, un contenedor) achica su cifra
 * (`.cifra-que-cabe`) para que esa cabe en su ancho. Todas las cifras de la
 * franja quedan del mismo tamaño; entre 14 px y el text-2xl de siempre.
 */
export function largoDeLaCifraMasLarga(textos: readonly string[]): number {
  return Math.max(1, ...textos.map((t) => Array.from(t).length))
}

/** El estilo de la franja: el largo de su cifra más larga, para `.cifra-que-cabe`. */
export function estiloDeLaFranja(textos: readonly string[]): CSSProperties {
  return { ['--largo-de-la-cifra' as string]: String(largoDeLaCifraMasLarga(textos)) } as CSSProperties
}
