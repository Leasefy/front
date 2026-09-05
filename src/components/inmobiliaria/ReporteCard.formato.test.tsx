/**
 * La insignia de formato de la tarjeta contradecía al botón que tenía al lado.
 *
 * La tarjeta mostraba `report.format` —«EXCEL» en seis de los ocho reportes,
 * «PDF» en los otros dos—, literales escritos en `inmobiliaria-data.ts` antes
 * de que existiera el export. Diez píxeles más abajo, el botón decía
 * «Descargar CSV», que es lo que de verdad pasa: `/inmobiliaria/reports/export`
 * responde `text/csv` y el archivo baja `.csv`. La que mentía era la insignia.
 *
 * Y en los reportes que TODAVÍA no se pueden bajar la insignia era peor que una
 * contradicción: era una promesa sobre un archivo que nadie produce.
 *
 * Ahora las dos cosas salen de la misma fuente —`formatoDelArchivo`, sobre el
 * catálogo de `exportables.ts`— y donde no hay archivo no hay insignia.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { ReporteCard } from './ReporteCard'
import { sePuedeBajar } from '@/lib/reportes/exportables'
import { REPORT_DEFINITIONS } from '@/lib/constants/inmobiliaria-data'
import type { ReportDefinition, ReportId } from '@/lib/types/inmobiliaria'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function pintar(report: ReportDefinition, variant?: 'default' | 'compact') {
  const descargable = sePuedeBajar(report.id as ReportId)
  await act(async () => {
    root.render(
      <ReporteCard
        report={report}
        variant={variant}
        descargable={descargable}
        onGenerate={() => {}}
        onPreview={() => {}}
      />,
    )
  })
  return container.textContent ?? ''
}

/** `cartera-edades` — está en el catálogo de export. */
const BAJABLE = REPORT_DEFINITIONS.find((r) => r.id === 'cartera-edades') as ReportDefinition
/** `extractos-propietarios` — NO se baja: el extracto es por propietario. */
const NO_BAJABLE = REPORT_DEFINITIONS.find(
  (r) => r.id === 'extractos-propietarios',
) as ReportDefinition

/** Cuántas veces aparece un literal en la tarjeta. Contar, y no `toContain`,
 *  es lo que hace que el test muerda: con el defecto puesto la tarjeta seguía
 *  diciendo «CSV» UNA vez —la del botón— mientras la insignia decía «EXCEL». */
function veces(texto: string, aguja: string): number {
  return texto.split(aguja).length - 1
}

describe('ReporteCard — la insignia dice el formato del archivo que baja', () => {
  it('el reporte que se baja dice CSV en la insignia Y en el botón', async () => {
    const texto = await pintar(BAJABLE)

    // insignia + botón: los dos, y coincidiendo.
    expect(veces(texto, 'CSV')).toBe(2)
    expect(texto).toContain('Descargar CSV')
  })

  it('nunca dice EXCEL ni PDF: ninguno de los dos es lo que el back entrega', async () => {
    for (const report of REPORT_DEFINITIONS) {
      for (const variant of ['default', 'compact'] as const) {
        const texto = await pintar(report, variant)
        expect(texto, `${report.id} (${variant})`).not.toContain('EXCEL')
        expect(texto, `${report.id} (${variant})`).not.toContain('PDF')
      }
    }
  })

  it('el reporte que todavía no se baja no promete NINGÚN formato', async () => {
    const texto = await pintar(NO_BAJABLE)

    expect(veces(texto, 'CSV')).toBe(0)
    expect(veces(texto, 'PDF')).toBe(0)
    expect(veces(texto, 'EXCEL')).toBe(0)
    expect(texto).toContain('Todavía no')
  })

  it('la variante compacta sigue la misma regla', async () => {
    // En compacta no hay botón: la insignia es la única que habla de formato.
    expect(veces(await pintar(BAJABLE, 'compact'), 'CSV')).toBe(1)

    const noBajable = await pintar(NO_BAJABLE, 'compact')
    expect(veces(noBajable, 'CSV')).toBe(0)
    expect(veces(noBajable, 'PDF')).toBe(0)
    expect(veces(noBajable, 'EXCEL')).toBe(0)
  })

  it('el catálogo sigue teniendo reportes de los dos lados (si no, el test no prueba nada)', () => {
    const bajables = REPORT_DEFINITIONS.filter((r) => sePuedeBajar(r.id as ReportId))
    const noBajables = REPORT_DEFINITIONS.filter((r) => !sePuedeBajar(r.id as ReportId))

    expect(bajables.length).toBeGreaterThan(0)
    expect(noBajables.length).toBeGreaterThan(0)
  })
})
