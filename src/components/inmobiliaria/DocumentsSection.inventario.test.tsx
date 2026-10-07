/**
 * 🟠 IA95-28 (QA-IA-95, 05-10-2026): la ficha decía «Acta de entrega · 0 items
 * en inventario» aunque el inmueble tiene el acta de entrega de Vidi con 7
 * ítems. Contaba sólo `consignacion.inventoryItems` (el inventario de la
 * captación); las actas viven aparte (`actas_entrega`).
 *
 * @vitest-environment-options { "settings": { "disableIframePageLoading": true } }
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ActaEntrega, Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** `t` que deja ver la clave y sus variables: «clave|count=7|fecha=…». */
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, v?: Record<string, unknown>) =>
      [k.split('.').pop(), ...Object.entries(v ?? {}).map(([a, b]) => `${a}=${String(b)}`)].join('|'),
    locale: 'es',
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { subirContrato: vi.fn() } }))

const actasPedidas = vi.hoisted(() => ({ lista: [] as ActaEntrega[], activo: [] as boolean[] }))
vi.mock('@/lib/actas/actas-del-mandato', async (original) => {
  const real = await original<typeof import('@/lib/actas/actas-del-mandato')>()
  return {
    ...real,
    useActasDelMandato: (_id: string, activo: boolean) => {
      actasPedidas.activo.push(activo)
      return activo ? actasPedidas.lista : []
    },
  }
})

import { DocumentsSection } from './ConsignacionDetailSections'
import { inventarioDeLaFicha } from '@/lib/actas/actas-del-mandato'

const acta = (p: Partial<ActaEntrega>): ActaEntrega =>
  ({ id: 'a-1', type: 'entrega', deliveryDate: '2026-10-02', items: [], ...p }) as unknown as ActaEntrega
const sieteItems = Array.from({ length: 7 }, (_, i) => ({ id: `i${i}` })) as unknown as ActaEntrega['items']

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  actasPedidas.lista = []
  actasPedidas.activo = []
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(inventoryItems: unknown[]) {
  const c = { id: 'c-1', inventoryItems, photosUrls: [] } as unknown as Consignacion
  act(() => root.render(React.createElement(DocumentsSection, { consignacion: c })))
  return container.querySelector<HTMLAnchorElement>('[data-testid="documento-acta"]')!
}

describe('IA95-28 · la ficha cuenta el inventario que de verdad tiene el inmueble', () => {
  it('sin inventario de captación y con el acta de Vidi: cuenta los 7 ítems del acta y lleva a Documentos › Actas', () => {
    actasPedidas.lista = [acta({ items: sieteItems })]
    const fila = pintar([])
    expect(fila.textContent).toContain('handoverFromActa|count=7|acta=actaDeEntrega|fecha=2 de octubre de 2026')
    expect(fila.getAttribute('href')).toBe('/panel/inmobiliaria/documentos?tab=actas')
  })

  it('con inventario de captación: lo cuenta (1 ítem, en singular) y no pide las actas', () => {
    const fila = pintar([{ id: 'i1' }])
    expect(fila.textContent).toContain('inventoryItemsCountOne')
    expect(fila.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/c-1/acta')
    expect(actasPedidas.activo.every((a) => a === false)).toBe(true)
  })

  it('sin inventario ni actas: dice 0 y abre la hoja de siempre', () => {
    const fila = pintar([])
    expect(fila.textContent).toContain('inventoryItemsCount|count=0')
    expect(fila.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/c-1/acta')
  })

  it('la regla, pura: prefiere la última acta de ENTREGA con ítems', () => {
    const r = inventarioDeLaFicha(0, [
      acta({ id: 'dev', type: 'devolucion', deliveryDate: '2026-10-04', items: sieteItems.slice(0, 3) }),
      acta({ id: 'vieja', deliveryDate: '2026-09-01', items: sieteItems.slice(0, 2) }),
      acta({ id: 'nueva', deliveryDate: '2026-10-02', items: sieteItems }),
    ])
    expect(r).toMatchObject({ de: 'acta', actaId: 'nueva', items: 7, tipo: 'entrega' })
    expect(inventarioDeLaFicha(0, [acta({ id: 'dev', type: 'devolucion', items: sieteItems.slice(0, 3) })])).toMatchObject({ de: 'acta', tipo: 'devolucion', items: 3 })
    expect(inventarioDeLaFicha(0, [acta({ items: [] })])).toEqual({ de: 'nada' })
    expect(inventarioDeLaFicha(4, [acta({ items: sieteItems })])).toEqual({ de: 'captacion', items: 4 })
  })
})
