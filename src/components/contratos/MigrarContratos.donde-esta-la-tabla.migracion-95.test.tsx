/**
 * QA-MIGRACION-95 (MP-06, 06-10-2026): en contratos, como en terceros, la hoja
 * y la fila de los encabezados se adivinan y no se podían corregir. Un libro
 * con «Contratos vigentes» y «Contratos terminados» (mismas columnas) se leía
 * desde la primera, sin decirlo; la segunda quedaba afuera en silencio.
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

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  )
  return {
    ...actual,
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn(async () => []) },
  }
})

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    migracion: {
      preparar: vi.fn(),
      filas: vi.fn(),
      resolverMasivo: vi.fn(),
      resumen: vi.fn(),
      lotesAbiertos: vi.fn(async () => []),
      resolver: vi.fn(),
      crearInmueble: vi.fn(),
      registrarPropietario: vi.fn(),
      descartar: vi.fn(),
      descartarLote: vi.fn(),
      activar: vi.fn(),
      fechaDeCorte: vi.fn().mockResolvedValue({ fecha: '2026-09-01', editable: true, motivo: null }),
      fijarFechaDeCorte: vi.fn(),
      reconciliar: vi.fn(),
      estadoDeLote: vi.fn(),
      idsDeFilas: vi.fn(),
      inmueblesFaltantes: vi.fn(async () => ({ candidatas: 0, activadas: 0 })),
      crearInmueblesFaltantes: vi.fn(),
    },
  },
}))

/* El Select de Radix no se abre en happy-dom: un <select> nativo con el mismo contrato. */
vi.mock('@/components/ui/select', async () => {
  const React = await import('react')
  type Ctx = { value?: string; onValueChange?: (v: string) => void; trigger: Record<string, unknown> }
  const Contexto = React.createContext<Ctx>({ trigger: {} })
  return {
    Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: React.ReactNode }) => {
      const trigger = React.useRef<Record<string, unknown>>({}).current
      return <Contexto.Provider value={{ value, onValueChange, trigger }}>{children}</Contexto.Provider>
    },
    SelectTrigger: (props: Record<string, unknown>) => {
      Object.assign(React.useContext(Contexto).trigger, props)
      return null
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => {
      const ctx = React.useContext(Contexto)
      return (
        <select
          data-testid={ctx.trigger['data-testid'] as string | undefined}
          value={ctx.value ?? ''}
          onChange={(e) => ctx.onValueChange?.(e.target.value)}
        >
          {children}
        </select>
      )
    },
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
      <option value={value}>{children}</option>
    ),
    SelectGroup: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectSeparator: () => null,
  }
})

import {
  leerPrimerasFilasDeCadaHoja,
  parseSpreadsheetFile,
} from '@/components/inmobiliaria/import/lib/parseFile'
import { MigrarContratos } from './MigrarContratos'

const ENCABEZADOS = ['Código inmueble', 'Inquilino', 'Cédula inquilino', 'Canon', 'Fecha inicio', 'Fecha fin']
const fila = (codigo: string, nombre: string) => [codigo, nombre, '1036111222', '2500000', '01/02/2026', '31/01/2027']
const objeto = (celdas: string[], i: number) => ({
  _rowIndex: i + 1,
  ...Object.fromEntries(ENCABEZADOS.map((h, j) => [h, celdas[j]])),
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('MP-06: elegir la hoja y la fila de los encabezados (contratos)', () => {
  it('un libro con dos hojas de contratos: dice cuál leyó y deja leer la otra', async () => {
    vi.mocked(leerPrimerasFilasDeCadaHoja).mockResolvedValue([
      { hoja: 'Contratos vigentes', filas: [ENCABEZADOS, fila('9001', 'Valentina')] },
      { hoja: 'Contratos terminados', filas: [ENCABEZADOS, fila('9002', 'Santiago')] },
    ])
    vi.mocked(parseSpreadsheetFile).mockImplementation(async (_f, hoja) => ({
      rows: [objeto(hoja === 'Contratos terminados' ? fila('9002', 'Santiago') : fila('9001', 'Valentina'), 0)],
      headers: ENCABEZADOS,
      sheetNames: ['Contratos vigentes', 'Contratos terminados'],
    }))
    act(() => root.render(<MigrarContratos />))
    await esperar()
    const input = container.querySelector('[data-testid="archivo-contratos"]') as HTMLInputElement
    const archivo = new File(['x'], 'contratos.xlsx')
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await esperar()
    await esperar()

    const hoja = container.querySelector<HTMLSelectElement>('select[data-testid="elegir-hoja"]')
    expect(hoja).not.toBeNull()
    expect(hoja?.value).toBe('Contratos vigentes')

    await act(async () => {
      hoja!.value = 'Contratos terminados'
      hoja!.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await esperar()
    await esperar()
    expect(vi.mocked(parseSpreadsheetFile)).toHaveBeenLastCalledWith(archivo, 'Contratos terminados', {
      filaDeEncabezado: 0,
    })
    expect(
      container.querySelector<HTMLSelectElement>('select[data-testid="elegir-hoja"]')?.value,
    ).toBe('Contratos terminados')
  })

  it('la fila de los encabezados se elige a mano', async () => {
    vi.mocked(leerPrimerasFilasDeCadaHoja).mockResolvedValue([
      { hoja: 'Hoja1', filas: [['Reporte de contratos', 'Octubre'], ENCABEZADOS, fila('9001', 'Valentina')] },
    ])
    vi.mocked(parseSpreadsheetFile).mockImplementation(async () => ({
      rows: [objeto(fila('9001', 'Valentina'), 1)],
      headers: ENCABEZADOS,
      sheetNames: ['Hoja1'],
    }))
    act(() => root.render(<MigrarContratos />))
    await esperar()
    const input = container.querySelector('[data-testid="archivo-contratos"]') as HTMLInputElement
    const archivo = new File(['x'], 'contratos.xlsx')
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await esperar()
    await esperar()

    const filaSel = container.querySelector<HTMLSelectElement>('select[data-testid="elegir-fila-de-encabezado"]')
    expect(filaSel).not.toBeNull()
    expect(container.querySelector('[data-testid="elegir-hoja"]')).toBeNull()
    await act(async () => {
      filaSel!.value = '0'
      filaSel!.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await esperar()
    await esperar()
    expect(vi.mocked(parseSpreadsheetFile)).toHaveBeenLastCalledWith(archivo, undefined, { filaDeEncabezado: 0 })
  })
})
