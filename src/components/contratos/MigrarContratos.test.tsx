/**
 * El owner no puede exigir un archivo estándar: cualquier Excel tiene que
 * poder llegar a la lista de trabajo, columnas mapeadas o no. Antes de este
 * cambio, `OBLIGATORIOS`/`faltantes()` deshabilitaban el botón «Revisar» si
 * faltaba una sola de 8 columnas — el archivo real del owner no tenía
 * `diaDePago` ni `inquilinoCorreo`, así que nunca llegaba a revisar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // evita que el transform de JSX tree-shakee el import

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}))

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
      activar: vi.fn(),
      estadoDeLote: vi.fn(),
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
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(<MigrarContratos />)
  })
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

function subirArchivo(headers: string[], filas: Record<string, unknown>[]) {
  const rows = filas.map((fila, i) => ({ _rowIndex: i, ...fila }))
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers, sheetNames: ['Sheet1'] })
  const input = container.querySelector(
    '[data-testid="archivo-contratos"]',
  ) as HTMLInputElement
  const file = new File(['contenido'], 'contratos.csv', { type: 'text/csv' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  return act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

function botonRevisar() {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Revisar'),
  ) as HTMLButtonElement | undefined
}

describe('<MigrarContratos> — sin gate de columnas', () => {
  it('un archivo cuyas columnas no mapean nada igual llega a la lista de trabajo', async () => {
    render()
    await esperar()

    await subirArchivo(['Columna A', 'Columna B'], [{ 'Columna A': 'x', 'Columna B': 'y' }])

    const boton = botonRevisar()
    expect(boton).toBeTruthy()
    // Ni `diaDePago` ni `inquilinoCorreo` ni ningún otro campo bloquean el
    // botón — sólo si hay filas y no está cargando.
    expect(boton?.disabled).toBe(false)

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-servidor-1',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    // WU-4, ítem 1: `preparar()` sólo encola el job — el sondeo
    // (`useEstadoDeLote`) es quien decide cuándo ya hay lista de trabajo.
    // Resuelve LISTO directamente: este test cubre el payload enviado y el
    // arribo final a la lista de trabajo, no la espera intermedia (eso lo
    // cubre el test siguiente).
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-servidor-1',
      estado: 'LISTO',
      total: 1,
      procesadas: 1,
      pendientes: 1,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.resumen).mockResolvedValue({
      lote: 'lote-servidor-1',
      total: 1,
      pendientes: 1,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    vi.mocked(contractsApi.migracion.filas).mockResolvedValue({
      filas: [],
      total: 0,
      pagina: 1,
      porPagina: 25,
    })

    await act(async () => {
      boton?.click()
      // Varias vueltas de microtask: preparar() → efecto de sondeo →
      // estadoDeLote() → efecto de refrescar() → resumen()+filas().
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
    })

    // Server-issued lote: la fila que llega a `preparar()` no debe llevar un
    // `lote` armado en el cliente.
    expect(contractsApi.migracion.preparar).toHaveBeenCalledTimes(1)
    const [filasEnviadas] = vi.mocked(contractsApi.migracion.preparar).mock.calls[0]
    expect(filasEnviadas).toHaveLength(1)
    // Nada se inventó para lo que no se pudo mapear.
    expect(filasEnviadas[0].paymentDay).toBeUndefined()
    expect(filasEnviadas[0].monthlyRent).toBeUndefined()
    expect(filasEnviadas[0].usoInmueble).toBeUndefined()
    // Estructuralmente obligatorios: nunca se omiten, aunque vayan vacíos.
    expect(filasEnviadas[0].direccion).toBe('')
    expect(filasEnviadas[0].inquilino).toEqual({
      nombre: '',
      correo: '',
      telefono: undefined,
      documento: undefined,
    })

    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeTruthy()
  })

  it('mientras el lote sigue ENCOLADO/PROCESANDO, muestra progreso — nunca la lista de trabajo vacía', async () => {
    render()
    await esperar()
    await subirArchivo(['Columna A'], [{ 'Columna A': 'x' }])
    const boton = botonRevisar()

    vi.mocked(contractsApi.migracion.preparar).mockResolvedValue({
      lote: 'lote-servidor-2',
      estado: 'ENCOLADO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })
    // El job sigue corriendo — nunca resuelve LISTO en este test.
    vi.mocked(contractsApi.migracion.estadoDeLote).mockResolvedValue({
      lote: 'lote-servidor-2',
      estado: 'PROCESANDO',
      total: 1,
      procesadas: 0,
      pendientes: 0,
      listos: 0,
      activados: 0,
      descartados: 0,
    })

    await act(async () => {
      boton?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    // WU-1 dejó este hueco explícito: sin espera, acá se hubiera mostrado
    // una lista de trabajo con "0 pendientes" — indistinguible de "no queda
    // nada por hacer" cuando en realidad el job ni terminó.
    expect(container.querySelector('[data-testid="lote-progreso"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
    // `resumen()` no se llama para ESTE lote mientras no hay nada que
    // mostrar todavía.
    expect(contractsApi.migracion.resumen).not.toHaveBeenCalledWith('lote-servidor-2')
  })

  it('muestra un selector de remapeo por columna y un botón para restablecer', async () => {
    render()
    await esperar()

    await subirArchivo(['Propiedad', 'Canon de arrendamiento'], [
      { Propiedad: 'x', 'Canon de arrendamiento': '1000000' },
    ])

    // "Propiedad" está deliberadamente excluida del auto-mapeo (F5) — sigue
    // siendo elegible a mano, vía el selector.
    expect(container.querySelector('[data-testid="mapeo-Propiedad"]')).toBeTruthy()
    expect(
      container.querySelector('[data-testid="mapeo-Canon de arrendamiento"]'),
    ).toBeTruthy()

    const restablecer = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Restablecer'),
    )
    expect(restablecer).toBeTruthy()
  })
})
