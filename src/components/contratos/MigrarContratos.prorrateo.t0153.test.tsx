/**
 * T-0153 §3.4 y §4.3/4.4, de punta a punta en la pantalla: el sistema nunca
 * asume el prorrateo (la agencia lo define por fila o en bloque), las filas de
 * copropietarios se unen y la comisión que no cuadra avisa. Datos inventados.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
  leerPrimerasFilas: vi.fn(async () => [] as string[][]),
  leerPrimerasFilasDeCadaHoja: vi.fn(async () => [] as Array<{ hoja: string; filas: string[][] }>),
}))
vi.mock('@/lib/api/inmuebles-importacion.service', () => ({
  inmueblesImportacionApi: { lotesAbiertos: vi.fn(async () => []) },
}))
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    migracion: {
      preparar: vi.fn(),
      filas: vi.fn(),
      resumen: vi.fn(),
      lotesAbiertos: vi.fn(),
      estadoDeLote: vi.fn(),
      fechaDeCorte: vi.fn().mockResolvedValue({ fecha: '2026-09-01', editable: true, motivo: null }),
    },
  },
}))

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile'
import { contractsApi } from '@/lib/api/contracts.service'
import { MigrarContratos } from './MigrarContratos'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([])
  vi.mocked(contractsApi.migracion.preparar).mockReset()
  vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
    lote: 'lote-1',
    estado: 'ENCOLADO',
    total: 1,
    procesadas: 0,
    pendientes: 0,
    listos: 0,
    activados: 0,
    descartados: 0,
  })
  vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue(undefined as never)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

const BASE = [
  'Consecutivo contrato',
  'Total Canon Contrato',
  'Consecutivo detalle',
  'Nro. Propiedad',
  'Dirección Propiedad',
  'Documento Propietario',
  'Nombre Propietario',
  'Documento Inquilino',
  'Nombre Inquilino',
  'Email inquilino',
  'Valor canon',
  '% Comisión',
  'Valor comisión',
  'Fecha inicio',
  'Fecha fin',
  'Fecha Cartera',
]

function fila(n: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    'Consecutivo contrato': n,
    'Total Canon Contrato': 1000000,
    'Consecutivo detalle': 1,
    'Nro. Propiedad': n,
    'Dirección Propiedad': `Calle ${n}`,
    'Documento Propietario': 100 + n,
    'Nombre Propietario': `Dueño ${n}`,
    'Documento Inquilino': 200 + n,
    'Nombre Inquilino': `Inquilino ${n}`,
    'Email inquilino': `i${n}@example.test`,
    'Valor canon': 1000000,
    '% Comisión': '7.5%',
    'Valor comisión': 75000,
    'Fecha inicio': '2025-01-10',
    'Fecha fin': '2026-01-09',
    'Fecha Cartera': '2025-01-15',
    ...over,
  }
}

async function subir(headers: string[], filas: Record<string, unknown>[]) {
  const rows = filas.map((f, i) => ({ _rowIndex: i, ...f }))
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers, sheetNames: ['Hoja'] })
  act(() => {
    root.render(<MigrarContratos />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  const input = container.querySelector('[data-testid="archivo-contratos"]') as HTMLInputElement
  Object.defineProperty(input, 'files', {
    value: [new File(['x'], 'contratos.csv', { type: 'text/csv' })],
    configurable: true,
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

const q = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const clic = (el: Element | null) => act(() => (el as HTMLElement).click())
const botonRevisar = () =>
  Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Revisar'),
  ) as HTMLButtonElement | undefined
async function revisar() {
  await act(async () => {
    botonRevisar()?.click()
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0))
  })
}

describe('sin la columna Prorrateado: la agencia define, en bloque', () => {
  it('lista todas, no deja revisar y no manda nada hasta decidir', async () => {
    await subir(BASE, [fila(1), fila(2), fila(3)])
    const panel = q('prorrateo-por-definir')!
    expect(panel.textContent).toContain('El archivo no trae la columna Prorrateado')
    expect(panel.textContent).toContain('3 contratos')
    expect(botonRevisar()?.disabled).toBe(true)
    await revisar()
    expect(contractsApi.migracion.preparar).not.toHaveBeenCalled()
  })

  it('seleccionar todas + Sí: salen todas con prorratearPrimerMes explícito', async () => {
    await subir(BASE, [fila(1), fila(2), fila(3)])
    clic(q('prorrateo-seleccionar-todas'))
    clic(q('prorrateo-masivo-si'))
    expect(botonRevisar()?.disabled).toBe(false)
    expect(botonRevisar()?.textContent).toContain('Revisar 3 contratos')
    await revisar()
    const [enviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(enviadas).toHaveLength(3)
    expect(enviadas.every((f) => f.prorratearPrimerMes === true)).toBe(true)
  })

  it('una por una: sólo salen las decididas', async () => {
    await subir(BASE, [fila(1), fila(2), fila(3)])
    clic(q('prorrateo-no-0'))
    clic(q('prorrateo-si-2'))
    expect(botonRevisar()?.textContent).toContain('Revisar 2 contratos')
    await revisar()
    const [enviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(enviadas.map((f) => [f.externalId, f.prorratearPrimerMes])).toEqual([
      ['1', false],
      ['3', true],
    ])
  })
})

describe('con la columna: los reconocidos siguen, los demás esperan', () => {
  const CON = [...BASE, 'Prorrateado']
  it('SI sale; vacío y texto raro quedan por definir con su texto', async () => {
    await subir(CON, [fila(1, { Prorrateado: 'SI' }), fila(2, { Prorrateado: '' }), fila(3, { Prorrateado: 'a veces' })])
    const panel = q('prorrateo-por-definir')!
    expect(panel.textContent).toContain('2 contratos')
    expect(panel.textContent).not.toContain('El archivo no trae la columna Prorrateado')
    expect(q('prorrateo-fila-2')!.textContent).toContain('«a veces»')
    expect(botonRevisar()?.textContent).toContain('Revisar 1 contrato')
    await revisar()
    const [enviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(enviadas).toHaveLength(1)
    expect(enviadas[0].prorratearPrimerMes).toBe(true)
  })

  it('todo decidido por el archivo: no hay panel de pendientes', async () => {
    await subir(CON, [fila(1, { Prorrateado: 'SI' }), fila(2, { Prorrateado: 'NO' })])
    expect(q('prorrateo-por-definir')).toBeNull()
  })
})

describe('copropietarios y comisión', () => {
  const CON = [...BASE, 'Prorrateado']
  it('dos filas del mismo contrato se unen en una', async () => {
    await subir(CON, [
      fila(1, { Prorrateado: 'SI', 'Valor canon': 600000, 'Valor comisión': 45000 }),
      fila(1, {
        Prorrateado: 'SI',
        'Consecutivo detalle': 2,
        'Documento Propietario': 555,
        'Valor canon': 400000,
        'Valor comisión': 30000,
      }),
    ])
    expect(q('aviso-filas-fundidas')).toBeTruthy()
    expect(botonRevisar()?.textContent).toContain('Revisar 1 contrato')
    await revisar()
    const [enviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(enviadas).toHaveLength(1)
    expect(enviadas[0].canonPorPropietario).toEqual([600000, 400000])
    expect(enviadas[0].monthlyRent).toBe(1000000)
  })

  it('la comisión que no cuadra avisa, sin bloquear', async () => {
    await subir(CON, [fila(1, { Prorrateado: 'SI', 'Valor comisión': 99999 })])
    expect(q('aviso-comision-no-cuadra')!.textContent).toContain('no cuadra con canon x %')
    expect(botonRevisar()?.disabled).toBe(false)
  })

  it('la comisión que cuadra no avisa', async () => {
    await subir(CON, [fila(1, { Prorrateado: 'SI' })])
    expect(q('aviso-comision-no-cuadra')).toBeNull()
  })
})
