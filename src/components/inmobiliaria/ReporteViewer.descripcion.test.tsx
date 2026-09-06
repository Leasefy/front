/**
 * El cajón de vista previa de un reporte es un diálogo de Radix, y estaba SIN
 * descripción registrada.
 *
 * Se veía en dos lados a la vez:
 *
 *   · en la consola del navegador, un aviso por cada apertura —
 *     «Missing `Description` or `aria-describedby={undefined}` for
 *     {DialogContent}»— para los OCHO reportes;
 *   · en el lector de pantalla, que anunciaba el título del cajón y nada más:
 *     el `<p>` con la descripción del reporte estaba ahí, a la vista, pero era
 *     un párrafo suelto que el diálogo no reclamaba como suyo.
 *
 * El arreglo no agrega texto nuevo: convierte ese `<p>` en `SheetDescription`,
 * que es `Dialog.Description`, y con eso `aria-describedby` apunta a él.
 *
 * Este test muerde por los dos lados: la consola tiene que quedar limpia Y el
 * `aria-describedby` tiene que resolver al texto de la descripción.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('@/lib/hooks/useInmobiliaria', () => {
  const vacio = () => ({
    report: null,
    isLoading: false,
    error: null,
    errorCrudo: null,
    refetch: () => Promise.resolve(null),
  })
  return {
    useCarteraReport: vacio,
    useOcupacionReport: vacio,
    useComisionesReport: vacio,
    useFlujoCajaReport: vacio,
    useRendimientoAgentesReport: vacio,
    useVencimientosReport: vacio,
  }
})

import { ReporteViewer } from './ReporteViewer'
import type { ReportDefinition } from '@/lib/types/inmobiliaria'

const REPORTE: ReportDefinition = {
  id: 'cartera-edades',
  title: 'Cartera por Edades',
  description: 'Saldos pendientes agrupados por dias de mora',
  category: 'financiero',
  icon: 'ChartBar',
  format: 'excel',
  frequency: 'monthly',
  isFavorite: true,
}

const FILTROS = {
  period: { start: '2026-09-01', end: '2026-09-30' },
  zone: null,
  category: 'all' as const,
  search: '',
  favoritesOnly: false,
}

let container: HTMLDivElement
let root: Root
let avisos: string[]
let origError: typeof console.error
let origWarn: typeof console.warn

beforeEach(() => {
  avisos = []
  origError = console.error
  origWarn = console.warn
  console.error = (...a: unknown[]) => avisos.push(a.map(String).join(' '))
  console.warn = (...a: unknown[]) => avisos.push(a.map(String).join(' '))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  console.error = origError
  console.warn = origWarn
})

async function abrir() {
  await act(async () => {
    root.render(
      <ReporteViewer isOpen onClose={() => {}} report={REPORTE} filters={FILTROS} />,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('ReporteViewer — el cajón declara su descripción', () => {
  it('no deja el aviso de Radix en la consola al abrirse', async () => {
    await abrir()

    const deRadix = avisos.filter((a) => a.includes('Description') && a.includes('DialogContent'))
    expect(deRadix).toEqual([])
  })

  it('aria-describedby del diálogo resuelve al texto de la descripción', async () => {
    await abrir()

    const dialogo = document.querySelector('[role="dialog"]')
    expect(dialogo).not.toBeNull()

    const id = dialogo?.getAttribute('aria-describedby')
    expect(id, 'el diálogo tiene que apuntar a su descripción').toBeTruthy()

    const descripcion = document.getElementById(id as string)
    expect(descripcion?.textContent).toBe(REPORTE.description)
  })

  it('el texto de la descripción sigue a la vista, no se escondió para callar el aviso', async () => {
    await abrir()

    expect(document.body.textContent).toContain(REPORTE.description)
  })
})
