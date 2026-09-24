/**
 * 🔴 `/panel/inmobiliaria/cobros` (→ `/pagos/cartera/cobros`) desbordaba a
 * 390 px (pendiente del traspaso del 24-09-2026).
 *
 * happy-dom no calcula layout, así que esto fija las CLASES que lo evitan; el
 * razonamiento, con los anchos de Cadence (botón `md` = `h-11 px-[26px]`,
 * `IconButton` md = 32 px, opción de `SegmentedControl` md = `px-4`):
 *
 *   · a 390 px quedan 358 px útiles (`p-4`);
 *   · la fila de acciones del encabezado era `flex … shrink-0` SIN
 *     `flex-wrap`: engranaje 32 + «Reglas de mora» 68 + «Generar cobros» ≈181
 *     + «Hacer recibo de caja» ≈226 + 3 huecos de 8 ≈ 531 px en una sola
 *     línea que no podía partirse → 170 px afuera de la pantalla;
 *   · la barra de la tarjeta (vista · mes · conteo · vigentes/anulados) era
 *     `flex justify-between` sin `flex-wrap`: ≈650 px en 324 útiles;
 *   · la tabla NO era el problema: `Table` ya se envuelve en su propio
 *     `overflow-auto` (y `CobroTable` en otro `overflow-x-auto`).
 *   · el resumen sí se cortaba adentro de su tarjeta (`overflow-hidden`): tres
 *     cifras de ≈110 px en columnas de ≈71 px.
 *
 * Patrón del panel (`ListaDeLotes`): la barra de la tarjeta es
 * `flex flex-wrap items-center justify-between gap-3`, y ninguna pantalla pone
 * su propio `max-w`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { CobroResumen } from '@/components/inmobiliaria/CobroResumen'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PAGINA = readFileSync(
  join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx'),
  'utf8',
)

/** El `className` literal del elemento que lleva ese `data-testid`. */
function clasesDe(testId: string): string[] {
  const i = PAGINA.indexOf(`data-testid="${testId}"`)
  expect(i, `no está data-testid="${testId}" en la página`).toBeGreaterThan(-1)
  // El atributo va en la misma etiqueta: el className más cercano antes o después.
  const inicio = PAGINA.lastIndexOf('<', i)
  const fin = PAGINA.indexOf('>', i)
  const etiqueta = PAGINA.slice(inicio, fin)
  const m = /className="([^"]+)"/.exec(etiqueta)
  expect(m, `la etiqueta de ${testId} no tiene className literal`).toBeTruthy()
  return m![1].split(/\s+/)
}

describe('Cobros a 390 px — la página', () => {
  it('🔴 las acciones del encabezado se parten en líneas en el teléfono', () => {
    const c = clasesDe('acciones-de-cobros')
    expect(c).toContain('flex-wrap')
    // `shrink-0` sólo desde `sm`, donde el encabezado ya es una fila.
    expect(c).not.toContain('shrink-0')
    expect(c).toContain('sm:shrink-0')
  })

  it('🔴 la barra de la tarjeta (vista · mes · conteo · vigentes) se parte, y su grupo también', () => {
    expect(clasesDe('barra-de-la-tabla-de-cobros')).toEqual(
      expect.arrayContaining(['flex', 'flex-wrap', 'items-center', 'justify-between']),
    )
    expect(clasesDe('mes-y-vigencia-de-cobros')).toEqual(
      expect.arrayContaining(['flex', 'flex-wrap', 'items-center']),
    )
  })

  it('ninguna pantalla pone su propio max-w (la raíz de la página)', () => {
    const raiz = /return \(\s*<div className="([^"]+)"/.exec(PAGINA)
    expect(raiz).toBeTruthy()
    expect(raiz![1]).not.toMatch(/(^|\s)max-w-/)
  })
})

describe('Cobros a 390 px — el resumen', () => {
  let root: Root | null = null
  let contenedor: HTMLDivElement | null = null

  afterEach(() => {
    act(() => root?.unmount())
    contenedor?.remove()
    root = null
    contenedor = null
  })

  async function montar() {
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    root = createRoot(contenedor)
    await act(async () => {
      root!.render(
        <CobroResumen
          summary={{
            month: '2026-09',
            totalExpected: 188_000_000,
            totalCollected: 82_000_000,
            totalPending: 106_310_820,
            totalLate: 10_631_082,
            collectionRate: 43.6,
            cobrosPaid: 4,
            cobrosPending: 7,
            cobrosLate: 5,
            tasaDeRecaudo: null,
          }}
          onViewPending={() => undefined}
          onViewLate={() => undefined}
        />,
      )
    })
  }

  it('🔴 las tres cifras van una debajo de otra en el teléfono y en fila desde sm', async () => {
    await montar()
    const grilla = contenedor!.querySelector('[data-testid="cobros-cifras-del-mes"]')
    expect(grilla).not.toBeNull()
    const c = grilla!.className.split(/\s+/)
    expect(c).toContain('grid-cols-1')
    expect(c).toContain('sm:grid-cols-3')
    expect(c).not.toContain('grid-cols-3')
  })

  it('la tasa y «Por cobrar» se parten en dos líneas si no caben', async () => {
    await montar()
    const fila = contenedor!.querySelector('[data-testid="cobros-tasa-y-por-cobrar"]')
    expect(fila).not.toBeNull()
    expect(fila!.className.split(/\s+/)).toContain('flex-wrap')
  })

  it('«Ver pendientes» y «Ver en mora» se apilan en el teléfono', async () => {
    await montar()
    const acciones = contenedor!.querySelector('[data-testid="cobros-atajos-del-resumen"]')
    expect(acciones).not.toBeNull()
    const c = acciones!.className.split(/\s+/)
    expect(c).toContain('flex-col')
    expect(c).toContain('sm:flex-row')
  })
})
