/**
 * Sistema de errores (02-10-2026) en el importador de contratos:
 *
 *  · `preparar` dice EN QUÉ FILA del archivo está cada problema de un 400, y
 *    un 5xx sale «de nuestro lado» con su referencia;
 *  · el archivo que pasa el tope del back (5.000) se ataja antes de subir;
 *  · la consignación automática dice POR QUÉ no pudo con cada fila, no sólo
 *    cuántas.
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
      lotesAbiertos: vi.fn(),
      resolver: vi.fn(),
      crearInmueble: vi.fn(),
      registrarPropietario: vi.fn(),
      descartar: vi.fn(),
      descartarLote: vi.fn(),
      activar: vi.fn(),
      fechaDeCorte: vi
        .fn()
        .mockResolvedValue({ fecha: '2026-09-01', editable: true, motivo: null }),
      fijarFechaDeCorte: vi.fn(),
      reconciliar: vi.fn(),
      estadoDeLote: vi.fn(),
      idsDeFilas: vi.fn(),
      inmueblesFaltantes: vi.fn(async () => ({ candidatas: 0, activadas: 0 })),
      crearInmueblesFaltantes: vi.fn(),
    },
  },
}))

import { ApiError } from '@/lib/api/client'
import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile'
import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import {
  MigrarContratos,
  mensajeDelPreparar,
  motivosDeLaConsignacion,
} from './MigrarContratos'
import { MENSAJES_DE_LA_MIGRACION as M } from '@/components/migracion/limites-de-la-migracion'

const ERROR_500 = () =>
  new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia: 'ab12cd34',
  })

describe('mensajeDelPreparar', () => {
  it('🔴 un 400 del archivo dice la fila: «Fila 14: …» (+2, como la revisión)', () => {
    const e = new ApiError(400, ['El canon de un contrato no puede pasar de $2.147.483.647.'], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      campos: [
        {
          campo: 'contratos.12.monthlyRent',
          regla: 'maximo',
          mensaje: 'El canon de un contrato no puede pasar de $2.147.483.647.',
        },
      ],
    })
    expect(mensajeDelPreparar(e)).toBe(
      'Fila 14: El canon de un contrato no puede pasar de $2.147.483.647.',
    )
  })

  it('con muchos problemas lista cinco y dice cuántos más', () => {
    const campos = Array.from({ length: 8 }, (_, i) => ({
      campo: `contratos.${i}.deposit`,
      regla: 'maximo',
      mensaje: 'El depósito de un contrato no puede pasar de $2.147.483.647.',
    }))
    const e = new ApiError(400, 'x', 'DATOS_INVALIDOS', { statusCode: 400, code: 'DATOS_INVALIDOS', campos })
    const m = mensajeDelPreparar(e)
    expect(m.startsWith('Fila 2: ')).toBe(true)
    expect(m).toContain('Fila 6: ')
    expect(m).not.toContain('Fila 7: ')
    expect(m.endsWith('y 3 más.')).toBe(true)
  })

  it('un 400 del archivo entero (sin fila) sale con su frase', () => {
    const e = new ApiError(400, [M.demasiadosContratos], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      campos: [{ campo: 'contratos', regla: 'lista_maxima', mensaje: M.demasiadosContratos }],
    })
    expect(mensajeDelPreparar(e)).toBe(M.demasiadosContratos)
  })

  it('🔴 un 5xx: de nuestro lado, con la referencia, sin culpar a la conexión', () => {
    const m = mensajeDelPreparar(ERROR_500())
    expect(m).toMatch(/^No pudimos preparar la migración: algo falló de nuestro lado/)
    expect(m).toContain('ab12cd34')
    expect(m).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta: la conexión', () => {
    expect(mensajeDelPreparar(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })
})

describe('motivosDeLaConsignacion', () => {
  it('agrupa por motivo y dice las filas como en la revisión (+2)', () => {
    expect(
      motivosDeLaConsignacion([
        { fila: 0, motivo: 'El documento no es válido.' },
        { fila: 3, motivo: 'Ese inmueble ya tiene consignación.' },
        { fila: 7, motivo: 'El documento no es válido.' },
      ]),
    ).toEqual([
      'Filas 2 y 9: El documento no es válido.',
      'Fila 5: Ese inmueble ya tiene consignación.',
    ])
  })

  it('con muchas filas del mismo motivo muestra ocho y dice cuántas más', () => {
    const fallidas = Array.from({ length: 10 }, (_, i) => ({ fila: i, motivo: 'x' }))
    expect(motivosDeLaConsignacion(fallidas)).toEqual(['Filas 2, 3, 4, 5, 6, 7, 8, 9 y 2 más: x'])
  })
})

// ── La pantalla ─────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.mocked(contractsApi.migracion.lotesAbiertos).mockResolvedValue([])
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function esperar(vueltas = 5) {
  await act(async () => {
    for (let i = 0; i < vueltas; i++) await new Promise((r) => setTimeout(r, 0))
  })
}

const ENCABEZADOS = [
  'Dirección del inmueble',
  'Nombre del arrendatario',
  'Correo del arrendatario',
  'Fecha de inicio',
  'Fecha de terminación',
  'Canon',
  'Día de pago',
  'Nombre del arrendador',
  'Documento del arrendador',
]

function filaDelArchivo(i: number): { _rowIndex: number; [columna: string]: unknown } {
  return {
    _rowIndex: i,
    'Dirección del inmueble': `Calle ${10 + i} # 20-30`,
    'Nombre del arrendatario': `Inquilino ${i}`,
    'Correo del arrendatario': `inquilino${i}@correo.co`,
    'Fecha de inicio': '2026-01-01',
    'Fecha de terminación': '2027-01-01',
    Canon: '1800000',
    'Día de pago': '5',
    'Nombre del arrendador': `Dueño ${i}`,
    'Documento del arrendador': String(71_000_000 + i),
  }
}

async function subir(cuantas: number) {
  const rows = Array.from({ length: cuantas }, (_, i) => filaDelArchivo(i))
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers: ENCABEZADOS, sheetNames: ['Hoja'] })
  act(() => {
    root.render(<MigrarContratos />)
  })
  await esperar()
  const input = container.querySelector('[data-testid="archivo-contratos"]') as HTMLInputElement
  Object.defineProperty(input, 'files', {
    value: [new File(['x'], 'contratos.csv', { type: 'text/csv' })],
    configurable: true,
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await esperar()
}

async function revisar() {
  const b = Array.from(container.querySelectorAll('button')).find((x) =>
    x.textContent?.includes('Revisar'),
  ) as HTMLButtonElement
  await act(async () => {
    b.click()
  })
  await esperar(10)
}

function filaDeMigracion(n: number): FilaDeMigracion {
  return {
    id: `f-${n}`,
    lote: 'lote-1',
    fila: n,
    datos: { direccion: `Calle ${10 + n}`, inquilino: { nombre: `Inquilino ${n}`, correo: 'a@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: ['propietario'],
    contractId: null,
  } as FilaDeMigracion
}

describe('<MigrarContratos> — preparar', () => {
  it('🔴 un 5xx al preparar dice que fue de nuestro lado, con la referencia', async () => {
    vi.mocked(contractsApi.migracion.preparar).mockRejectedValue(ERROR_500())
    await subir(2)
    await revisar()
    expect(container.textContent).toContain(
      'No pudimos preparar la migración: algo falló de nuestro lado',
    )
    expect(container.textContent).toContain('ab12cd34')
    expect(container.textContent).not.toContain('Error interno del servidor')
  })

  it('🔴 más de 5.000 contratos se dice antes de subir, con la frase del back', async () => {
    await subir(5_001)
    await revisar()
    expect(contractsApi.migracion.preparar).not.toHaveBeenCalled()
    expect(container.textContent).toContain(M.demasiadosContratos)
  }, 30_000)
})

describe('<MigrarContratos> — la consignación automática dice por qué', () => {
  it('🔴 cada fila que no se pudo consignar dice su motivo, agrupado', async () => {
    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-1',
      estado: 'ENCOLADO',
      total: 3,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-1',
      estado: 'LISTO',
      total: 3,
      procesadas: 3,
      pendientes: 3,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-1',
      total: 3,
      pendientes: 3,
      listos: 0,
      activados: 0,
      descartados: 0,
      activables: 0,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: [filaDeMigracion(0), filaDeMigracion(1), filaDeMigracion(2)],
      total: 3,
      pagina: 1,
      porPagina: 25,
    })
    vi.mocked(contractsApi.migracion.registrarPropietario)
      .mockResolvedValueOnce(filaDeMigracion(0))
      .mockRejectedValueOnce(
        new ApiError(409, 'Ese inmueble ya tiene consignación con otro propietario.', 'YA_CONSIGNADO'),
      )
      .mockRejectedValueOnce(ERROR_500())

    await subir(3)
    await revisar()
    await esperar(20)

    const motivos = container.querySelector('[data-testid="motivos-de-la-asociacion"]')
    expect(motivos).not.toBeNull()
    const texto = motivos?.textContent ?? ''
    expect(texto).toContain('Fila 3: Ese inmueble ya tiene consignación con otro propietario.')
    expect(texto).toContain('Fila 4: No pudimos consignar al propietario: algo falló de nuestro lado')
    expect(texto).toContain('ab12cd34')
  })
})
