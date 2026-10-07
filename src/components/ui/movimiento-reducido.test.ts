/**
 * Movimiento reducido: sin desplazamientos, pero con los fundidos del sistema.
 *
 * `globals.css` ponía TODA animación y transición en 0,01 ms con
 * `prefers-reduced-motion`. Así nunca se aplicaban las duraciones reducidas de
 * los tokens de Cadence (fundidos de 150 ms): un modal o un cajón aparecía de
 * golpe. Desde el 02-10-2026 la regla global salva las animaciones del sistema
 * —que con los tokens reducidos ya son un fundido— y deja quieto todo lo demás.
 *
 * Esta prueba es estática a propósito (happy-dom no aplica media queries ni
 * keyframes) y congela lo que importa:
 *  1. Los tokens reducidos del front son los de Cadence: distancia 0, escala 1.
 *  2. 🔴 Ninguna animación salvada se mueve con esos valores: se lee cada
 *     keyframe del preset de Cadence, se le ponen los tokens reducidos y se
 *     comprueba que queda sin traslación ni escala.
 *  3. `tailwindcss-animate` pierde desplazamiento, escala y giro.
 *  4. Lo que se mueve con valores fijos (la hoja que sube el 100 %, el
 *     spinner que crece desde 0,5, la barra indeterminada…) sigue quieto.
 *  5. Las transiciones salvadas son sólo de opacidad.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const GLOBALS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
const TOKENS_DE_CADENCE = readFileSync(
  join(process.cwd(), 'node_modules/@leasefy/cadence/src/styles/tokens.css'),
  'utf8',
)
const requerir = createRequire(import.meta.url)
const PRESET = requerir(join(process.cwd(), 'node_modules/@leasefy/cadence/tailwind-preset.cjs')) as {
  theme: {
    extend: {
      keyframes: Record<string, Record<string, Record<string, string>>>
      animation: Record<string, string>
    }
  }
}
const { keyframes: KEYFRAMES, animation: ANIMACIONES } = PRESET.theme.extend

/** El bloque `@media (prefers-reduced-motion: reduce) { :root { … } }` de un archivo. */
function tokensReducidos(css: string): Record<string, string> {
  const m = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([^}]*)\}/)
  expect(m, 'falta el bloque de tokens reducidos').not.toBeNull()
  const tokens: Record<string, string> = {}
  for (const [, nombre, valor] of m![1].matchAll(/(--motion-[\w-]+):\s*([^;]+);/g)) {
    tokens[nombre] = valor.trim()
  }
  return tokens
}

/** La regla global de «Movimiento reducido» (la de `@layer utilities`). */
function reglaGlobal(): string {
  const inicio = GLOBALS.indexOf('/* Movimiento reducido (DESIGN.md §8b)')
  expect(inicio).toBeGreaterThan(-1)
  const fin = GLOBALS.indexOf('/* High contrast mode support */', inicio)
  return GLOBALS.slice(inicio, fin)
}

/** Las animaciones que la regla deja correr: `[class*="animate-x "]`. */
function animacionesSalvadas(): string[] {
  const regla = reglaGlobal()
  const bloque = regla.slice(regla.indexOf('*:not('), regla.indexOf('animation-duration'))
  return [...new Set([...bloque.matchAll(/\[class\*="(animate-[\w-]+) "\]/g)].map((m) => m[1]))]
}

const REDUCIDOS = tokensReducidos(GLOBALS)

/** Sustituye los `var(--…, respaldo)` con los valores reducidos y evalúa la aritmética. */
function resolver(valor: string): string {
  let v = valor
  // Las variables que arman los flotantes y los cajones salen de las distancias.
  const derivadas: Record<string, string> = {
    '--pop-x': REDUCIDOS['--motion-distance-xs'],
    '--pop-y': REDUCIDOS['--motion-distance-xs'],
  }
  for (let i = 0; i < 5; i++) {
    v = v.replace(/var\((--[\w-]+)(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (_t, nombre: string, respaldo?: string) => {
      if (nombre in REDUCIDOS) return REDUCIDOS[nombre]
      if (nombre in derivadas) return derivadas[nombre]
      return (respaldo ?? '').trim()
    })
  }
  return v
}

function evaluar(expr: string): number {
  const limpia = expr.replace(/calc/g, '').replace(/px/g, '').trim()
  expect(limpia, `no sé evaluar «${expr}»`).toMatch(/^[\d\s.+\-*/()]+$/)
  return Function(`"use strict"; return (${limpia})`)() as number
}

/** ¿El fotograma deja algo corrido o escalado? */
function seMueve(fotograma: Record<string, string>): string | null {
  for (const [prop, crudo] of Object.entries(fotograma)) {
    const v = resolver(crudo)
    if (prop === 'translate') {
      for (const parte of v.split(/\s+(?![^(]*\))/)) {
        if (evaluar(parte) !== 0) return `${prop}: ${v}`
      }
    }
    if (prop === 'scale' && Math.abs(evaluar(v) - 1) > 1e-9) return `${prop}: ${v}`
    if (prop === 'transform') {
      for (const [, fn, arg] of v.matchAll(/(\w+)\(((?:[^()]|\([^()]*(?:\([^()]*\))?[^()]*\))*)\)/g)) {
        const n = evaluar(arg)
        if (/^translate/.test(fn) && n !== 0) return `${prop}: ${v}`
        if (/^scale/.test(fn) && Math.abs(n - 1) > 1e-9) return `${prop}: ${v}`
        if (/^rotate/.test(fn) && n !== 0) return `${prop}: ${v}`
      }
    }
  }
  return null
}

/** El nombre del @keyframes que usa la clase `animate-x` del preset. */
function keyframesDe(clase: string): string {
  const nombre = clase.replace(/^animate-/, '')
  const definicion = ANIMACIONES[nombre]
  expect(definicion, `el preset no tiene ${clase}`).toBeDefined()
  return definicion.split(/\s+/)[0]
}

describe('movimiento reducido — los tokens', () => {
  it('🔴 son los de Cadence: sin distancia, sin escala, fundidos cortos', () => {
    expect(REDUCIDOS).toEqual(tokensReducidos(TOKENS_DE_CADENCE))
    for (const d of ['xs', 'sm', 'md', 'lg']) expect(REDUCIDOS[`--motion-distance-${d}`]).toBe('0px')
    expect(REDUCIDOS['--motion-pop-scale']).toBe('1')
    for (const d of ['base', 'slow', 'reveal']) {
      expect(parseInt(REDUCIDOS[`--motion-duration-${d}`], 10)).toBeLessThanOrEqual(150)
    }
  })
})

describe('movimiento reducido — la regla global', () => {
  const salvadas = animacionesSalvadas()

  it('ya no deja TODO en 0,01 ms: salva las animaciones del sistema', () => {
    expect(salvadas).toEqual(
      expect.arrayContaining(['animate-dialog-in', 'animate-sheet-fade-in', 'animate-pop-in', 'animate-in']),
    )
    expect(reglaGlobal()).toContain('animation-duration: 0.01ms !important')
  })

  it.each(salvadas.filter((c) => c !== 'animate-in' && c !== 'animate-out').map((c) => [c]))(
    '🔴 %s no se mueve con los tokens reducidos',
    (clase) => {
      const fotogramas = KEYFRAMES[keyframesDe(clase)]
      expect(fotogramas, `no encuentro los keyframes de ${clase}`).toBeDefined()
      for (const [paso, fotograma] of Object.entries(fotogramas)) {
        expect(seMueve(fotograma), `${clase} @ ${paso}`).toBeNull()
      }
    },
  )

  it('🔴 tailwindcss-animate (`animate-in`/`animate-out`) pierde desplazamiento, escala y giro', () => {
    const regla = reglaGlobal()
    for (const lado of ['enter', 'exit']) {
      expect(regla).toContain(`--tw-${lado}-translate-x: 0 !important`)
      expect(regla).toContain(`--tw-${lado}-translate-y: 0 !important`)
      expect(regla).toContain(`--tw-${lado}-scale: 1 !important`)
      expect(regla).toContain(`--tw-${lado}-rotate: 0 !important`)
    }
  })

  it('🔴 lo que se mueve con valores fijos sigue quieto', () => {
    for (const quieta of [
      'animate-dialog-sheet-in',
      'animate-dialog-sheet-out',
      'animate-sheet-in',
      'animate-sheet-out',
      'animate-spinner-in',
      'animate-slide-in-bottom',
      'animate-fade-in-up',
      'animate-scale-in',
      'animate-collapse-open',
      'animate-indeterminate',
    ]) {
      expect(salvadas, quieta).not.toContain(quieta)
    }
  })

  it('cada salvada se nombra con su token entero (`animate-in` no atrapa a `animate-indeterminate`)', () => {
    const bloque = reglaGlobal()
    for (const clase of salvadas) {
      expect(bloque).toContain(`[class*="${clase} "], [class$="${clase}"]`)
    }
    expect(bloque).not.toMatch(/\[class\*="animate-[\w-]+"\]/)
  })

  it('las transiciones que se salvan son sólo de opacidad', () => {
    const regla = reglaGlobal()
    const bloque = regla.slice(regla.lastIndexOf('*:not('), regla.indexOf('transition-duration: 0.01ms'))
    expect(bloque).toContain('transition-opacity')
    expect(bloque).toContain(':not([class*="transition-transform"], [class*="transition-["])')
    // `.chat-acciones` (los botones de una respuesta del chat) sólo funde la opacidad.
    expect(bloque).toContain('.chat-acciones')
    for (const m of GLOBALS.matchAll(/\.chat-acciones[^{]*\{([^}]*)\}/g)) {
      const transicion = m[1].match(/transition:\s*([^;]+);/)
      if (transicion) expect(transicion[1].trim().startsWith('opacity ')).toBe(true)
    }
  })
})
