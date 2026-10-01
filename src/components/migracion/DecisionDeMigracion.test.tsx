/**
 * «¿Migramos tu inmobiliaria?» después del glow up (Nico, 30-09: «esto de
 * verdad debe de verse más hermoso y como algo que es re importante»).
 *
 * Lo que NO podía cambiar con el aspecto: qué devuelve cada salida, que Esc
 * cuenta como «en otro momento», que el foco entra a la tarjeta y que el
 * lector de pantalla anuncia la pregunta. Y lo que sí cambió: la foto de
 * marca, limpia, sin la píldora «L Leasefy».
 *
 * Qué HACE cada decisión (omitir, recordatorio) lo prueba
 * `MuroDeMigracion.test.tsx` («la pregunta previa al muro»).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { FOTO_DE_LA_DECISION, ModalDecisionDeMigracion } from './DecisionDeMigracion'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function pintar(onDecidir = vi.fn()) {
  await act(async () => {
    root.render(<ModalDecisionDeMigracion onDecidir={onDecidir} />)
  })
  return onDecidir
}

// Se portalea a `document.body`: se busca en todo el documento.
const q = (testid: string) => document.querySelector<HTMLElement>(`[data-testid="${testid}"]`)

describe('ModalDecisionDeMigracion', () => {
  it.each([
    ['migrar-ahora', 'ahora'],
    ['migrar-en-otro-momento', 'luego'],
    ['no-requiero-migracion', 'nunca'],
  ] as const)('«%s» decide «%s», una sola vez', async (testid, decision) => {
    const onDecidir = await pintar()
    await act(async () => q(testid)?.click())
    expect(onDecidir).toHaveBeenCalledTimes(1)
    expect(onDecidir).toHaveBeenCalledWith(decision)
  })

  it('Esc cuenta como «en otro momento»', async () => {
    const onDecidir = await pintar()
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onDecidir).toHaveBeenCalledWith('luego')
  })

  it('la jerarquía: «Migrar ahora» es la primera y la única sólida; las otras dos, el mismo par', async () => {
    await pintar()
    const botones = [...(q('decision-de-migracion')?.querySelectorAll('button') ?? [])]
    expect(botones.map((b) => b.dataset.testid)).toEqual([
      'migrar-ahora',
      'migrar-en-otro-momento',
      'no-requiero-migracion',
    ])
    const clases = (testid: string) => q(testid)?.className ?? ''
    // Mismo alto para el par; la primaria, más alta.
    expect(clases('migrar-ahora')).toContain('h-12')
    expect(clases('migrar-en-otro-momento')).toContain('h-11')
    expect(clases('no-requiero-migracion')).toContain('h-11')
    // Ninguna salida se pinta como error.
    for (const b of botones) expect(b.className).not.toMatch(/destructive|danger/)
  })

  it('es un diálogo modal nombrado por la pregunta y descrito por la entrada', async () => {
    await pintar()
    const dialogo = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialogo).not.toBeNull()
    expect(dialogo?.getAttribute('aria-modal')).toBe('true')
    const nombre = document.getElementById(dialogo?.getAttribute('aria-labelledby') ?? '')
    expect(nombre?.textContent).toBe('¿Migramos tu inmobiliaria?')
    const descripcion = document.getElementById(dialogo?.getAttribute('aria-describedby') ?? '')
    expect(descripcion?.textContent).toContain('traemos tus datos')
  })

  it('el foco entra a la tarjeta al abrir', async () => {
    await pintar()
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    })
    expect(document.activeElement).toBe(document.querySelector('[role="dialog"]'))
  })

  it('dice qué se trae, cuánto toma y que se puede hacer por partes', async () => {
    await pintar()
    const lista = q('decision-lo-que-traemos')?.textContent ?? ''
    expect(lista).toContain('Propietarios e inquilinos')
    expect(lista).toContain('Inmuebles y contratos')
    expect(lista).toContain('Plan de cuentas y saldos')
    const cuanto = q('decision-cuanto-toma')?.textContent ?? ''
    expect(cuanto).toContain('unos minutos')
    expect(cuanto).toContain('por partes')
  })

  it('lleva la foto de marca, limpia: sin la píldora «L Leasefy» (Nico, 30-09)', async () => {
    await pintar()
    const foto = q('decision-foto')
    expect(foto?.getAttribute('aria-hidden')).toBe('true')
    const img = foto?.querySelector('img')
    expect(decodeURIComponent(img?.getAttribute('src') ?? '')).toContain(FOTO_DE_LA_DECISION)
    expect(img?.getAttribute('alt')).toBe('')
    // Ni la palabra ni el monograma en ninguna parte del modal.
    const modal = q('decision-de-migracion')
    expect(modal?.textContent ?? '').not.toContain('Leasefy')
    const monogramas = [...(modal?.querySelectorAll('span') ?? [])].filter(
      (s) => s.children.length === 0 && s.textContent?.trim() === 'L',
    )
    expect(monogramas).toHaveLength(0)
  })
})
