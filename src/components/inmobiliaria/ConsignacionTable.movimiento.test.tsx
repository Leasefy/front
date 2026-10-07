/**
 * @vitest-environment happy-dom
 *
 * El movimiento de la tabla del portafolio (movimiento ola 2, 03-10-2026): las
 * filas van en `TableBodyAnimado` / `TableRowAnimada` con `key` = el id, así
 * que al filtrar, paginar o retirar un inmueble la fila que se va SALE (150 ms,
 * acelerando) y recién después se desmonta; las demás quedan donde estaban.
 *
 * 🔴 También fija dos defectos de `Stagger` (Cadence) que aparecieron acá, en
 * el navegador:
 * - Los ítems llevaban `exit="exit"` (etiqueta): para framer eso los vuelve
 *   «controladores» y NO heredaban la entrada del `Stagger` (aparecían de
 *   golpe), y una fila que salía apenas montada animaba la opacidad «desde
 *   undefined» (aviso en consola). Ahora la salida va como objeto.
 * - Una lista que se monta DENTRO de algo que no anima su primer contenido (el
 *   `CrossFade` tabla ⇄ tarjetas de Inmuebles, un `Collapse` abierto) dejaba
 *   las filas INVISIBLES: el contenedor no corría su entrada y los ítems se
 *   quedaban esperándola. Ahora el `Stagger` lo detecta y las pinta quietas.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'
import { CrossFade } from '@leasefy/cadence'
import type { PortafolioRow } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}))

import { ConsignacionTable } from './ConsignacionTable'

function fila(id: string, titulo: string): PortafolioRow {
  return {
    kind: 'consignacion',
    id,
    propertyId: `p-${id}`,
    propietarioId: 'o-1',
    copropietarios: [{ propietarioId: 'o-1', participacionBps: 10000 }],
    agenteId: 'a-1',
    propertyTitle: titulo,
    propertyAddress: 'Cra 1 #1-1',
    propertyCity: 'Medellín',
    propertyZone: 'Laureles',
    propertyType: 'apartment',
    monthlyRent: 2_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as PortafolioRow
}

// La tabla ordena por título: A, B, C quedan en ese orden.
const TRES = [fila('c-1', 'Casa A'), fila('c-2', 'Casa B'), fila('c-3', 'Casa C')]
const SIN_LA_DOS = [TRES[0], TRES[2]]

let host: HTMLDivElement
let root: Root
let avisos: string[]
const origWarn = console.warn
const origError = console.error

const pintar = (filas: PortafolioRow[]) =>
  act(() => {
    root.render(<ConsignacionTable consignaciones={filas} onView={vi.fn()} onEdit={vi.fn()} />)
  })
const titulos = () =>
  Array.from(host.querySelectorAll('tbody tr')).map((tr) =>
    TRES.find((f) => tr.textContent?.includes((f as { propertyTitle: string }).propertyTitle))?.propertyTitle,
  )
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

beforeEach(() => {
  avisos = []
  console.warn = (...a: unknown[]) => avisos.push(a.map(String).join(' '))
  console.error = (...a: unknown[]) => avisos.push(a.map(String).join(' '))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  console.warn = origWarn
  console.error = origError
  MotionGlobalConfig.skipAnimations = true
})

describe('<ConsignacionTable> — las filas entran y salen', () => {
  it('🔴 dentro del `CrossFade` de la vista (primer pintado), las filas se VEN', async () => {
    MotionGlobalConfig.skipAnimations = false
    act(() => {
      root.render(
        <CrossFade swapKey="tabla">
          <ConsignacionTable consignaciones={TRES} onView={vi.fn()} onEdit={vi.fn()} />
        </CrossFade>,
      )
    })
    await esperar(700)
    const opacidades = Array.from(host.querySelectorAll<HTMLElement>('tbody tr')).map((tr) => tr.style.opacity)
    expect(opacidades).toHaveLength(3)
    // Sin animar (quedan como estaban) o al final de su entrada; nunca en 0.
    for (const o of opacidades) expect(['', '1']).toContain(o)
  })

  it('🔴 retirar una fila la SACA animada: sigue un momento mientras sale y después se va', async () => {
    MotionGlobalConfig.skipAnimations = false
    pintar(TRES)
    await esperar(500) // que terminen de entrar
    pintar(SIN_LA_DOS)
    // Mientras sale, la fila retirada todavía está (no se corta de golpe).
    expect(titulos()).toEqual(['Casa A', 'Casa B', 'Casa C'])
    await esperar(500)
    expect(titulos()).toEqual(['Casa A', 'Casa C'])
  })

  it('🔴 una fila que sale apenas se montó no ensucia la consola (StaggerItem con su `initial`)', async () => {
    pintar(TRES)
    pintar(SIN_LA_DOS) // la lista se relee al instante
    await esperar(50)
    expect(titulos()).toEqual(['Casa A', 'Casa C'])
    expect(avisos.filter((a) => /not an animatable value|animate opacity/i.test(a))).toEqual([])
  })

  it('las filas que se quedan son las MISMAS (la clave es el id, no el índice)', async () => {
    pintar(TRES)
    const tresAntes = host.querySelectorAll('tbody tr')[2]
    pintar(SIN_LA_DOS)
    await esperar(50)
    // «Casa C» sigue siendo el mismo nodo: con `key={index}` la que se
    // habría ido animada es la última y «Casa C» se habría vuelto a pintar.
    expect(host.querySelectorAll('tbody tr')[1]).toBe(tresAntes)
  })
})
