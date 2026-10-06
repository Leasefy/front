/**
 * 🔴 QA-FACT-CONTA-95 r2 · CB-C-13 (main 06-10, con la recomendada): los
 * informes que el contador firma no se podían bajar (CB-R29). Ahora los seis
 * —balance de prueba, mayor, auxiliar, auxiliar por tercero, estado de cuenta
 * del tercero, P&G y balance general— ofrecen Excel e impresión.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  filasDelExcel,
  nombreDelArchivoDelInforme,
  periodoEnPalabras,
} from './informe-descargable'
import { tablasDelAuxiliar, tablasDelBalanceDePrueba, tablasDelBalanceGeneral } from './tablas-de-los-informes'

const escritos: { nombre: string; filas: unknown[][] }[] = []
vi.mock('xlsx', async (importOriginal) => {
  const real = await importOriginal<typeof import('xlsx')>()
  return {
    ...real,
    writeFile: (libro: import('xlsx').WorkBook, nombre: string) => {
      const hoja = libro.Sheets[libro.SheetNames[0]]
      escritos.push({ nombre, filas: real.utils.sheet_to_json(hoja, { header: 1, raw: true }) as unknown[][] })
    },
  }
})
vi.mock('@/lib/auth/auth-context', async () => {
  const { createContext } = await import('react')
  return { AuthContext: createContext({ agency: { id: 'ag-1', name: 'Inmobiliaria Laboratorio S.A.S.' } }) }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const balance = {
  desde: '2026-10-01',
  hasta: '2026-10-31',
  filas: Array.from({ length: 60 }, (_, i) => ({
    cuentaId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    codigo: String(110505 + i),
    nombre: `Cuenta ${i}`,
    naturaleza: 'DEBITO' as const,
    saldoAnteriorCop: 1_000,
    debitosCop: 2_500_000.29,
    creditosCop: 0,
    saldoFinalCop: 2_501_000.29,
  })),
  totalDebitosCop: 150_000_017.4,
  totalCreditosCop: 150_000_017.4,
  cuadra: true,
  diferenciaCop: 0,
}

let raiz: Root | null = null
let contenedor: HTMLDivElement | null = null
async function montar(nodo: React.ReactNode) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz!.render(nodo)
  })
}
const porTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
async function esperar(condicion: () => boolean, ms = 3000) {
  const fin = Date.now() + ms
  while (!condicion()) {
    if (Date.now() > fin) throw new Error('no llegó a tiempo')
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
  }
}

afterEach(() => {
  escritos.length = 0
  act(() => raiz?.unmount())
  contenedor?.remove()
  raiz = null
  contenedor = null
})

describe('CB-C-13 · el archivo: nombre, período y cifras', () => {
  it('el nombre es el informe y su período, sin tildes ni UUID', () => {
    expect(nombreDelArchivoDelInforme('Balance de prueba', { desde: '2026-10-01', hasta: '2026-10-31' }, 'xlsx')).toBe(
      'balance-de-prueba-del-2026-10-01-al-2026-10-31.xlsx',
    )
    expect(nombreDelArchivoDelInforme('Estado de resultados (P&G)', { desde: '2026-10-01', hasta: '2026-10-31' }, 'pdf')).toBe(
      'estado-de-resultados-p-g-del-2026-10-01-al-2026-10-31.pdf',
    )
    expect(nombreDelArchivoDelInforme('Balance general', { hasta: '2026-10-31' }, 'xlsx')).toBe('balance-general-al-2026-10-31.xlsx')
    expect(nombreDelArchivoDelInforme('Libro auxiliar 28150505', {}, 'xlsx')).toBe('libro-auxiliar-28150505.xlsx')
  })

  it('el período en palabras', () => {
    expect(periodoEnPalabras({ desde: '2026-10-01', hasta: '2026-10-31' })).toBe('Del 1 de octubre de 2026 al 31 de octubre de 2026')
    expect(periodoEnPalabras({ hasta: '2026-10-31' })).toBe('Al 31 de octubre de 2026')
  })

  it('el balance de prueba trae TODAS las cuentas (la pantalla pagina de a 25), con la plata como número y el código como texto', () => {
    const filas = filasDelExcel(
      { inmobiliaria: 'Inmobiliaria Laboratorio S.A.S.', informe: 'Balance de prueba', periodo: { desde: '2026-10-01', hasta: '2026-10-31' } },
      tablasDelBalanceDePrueba(balance),
    )
    expect(filas[0]).toEqual(['Inmobiliaria Laboratorio S.A.S.'])
    expect(filas[2]).toEqual(['Del 1 de octubre de 2026 al 31 de octubre de 2026'])
    const cuentas = filas.filter((f) => typeof f[0] === 'string' && /^1105\d\d$|^11\d{4}$/.test(f[0] as string))
    expect(cuentas).toHaveLength(60)
    expect(cuentas[0]).toEqual(['110505', 'Cuenta 0', 'Débito', 1_000, 2_500_000.29, 0, 2_501_000.29])
    expect(filas.at(-1)).toEqual(['Totales del período', null, null, null, 150_000_017.4, 150_000_017.4, null])
    expect(JSON.stringify(filas)).not.toMatch(UUID)
  })

  it('el auxiliar: saldo inicial, cada renglón con su tercero por nombre y el saldo final', () => {
    const t = tablasDelAuxiliar({
      cuenta: { id: 'c', codigo: '28150505', nombre: 'Canon', naturaleza: 'CREDITO' },
      desde: '2026-10-01',
      hasta: '2026-10-31',
      saldoInicialCop: 100,
      renglones: [
        { asientoId: 'a', numero: 7, fecha: '2026-10-05T00:00:00.000Z', descripcionAsiento: 'Causación', descripcion: 'Canon', terceroTipo: 'PROPIETARIO', terceroId: 'p', terceroNombre: 'Paula Ruiz', terceroDocumento: 'CC 52123456', debitoCop: 0, creditoCop: 2_000_000, saldoCop: 2_000_100 },
      ],
      debitosCop: 0,
      creditosCop: 2_000_000,
      saldoFinalCop: 2_000_100,
    })
    expect(t[0].filas[1]).toEqual(['2026-10-05', 'N.º 7', 'Canon', 'Paula Ruiz · CC 52123456', 0, 2_000_000, 2_000_100])
    expect(t[0].pie?.[0]).toEqual(['', '', 'Saldo final', '', 0, 2_000_000, 2_000_100])
  })

  it('el balance general: los tres lados con sus grupos y cuentas, y el resultado del ejercicio', () => {
    const lado = (total: number) => ({ totalCop: total, grupos: [{ codigo: '11', nombre: 'Disponible', totalCop: total, cuentas: [{ codigo: '1105', nombre: 'Caja', totalCop: total }] }] })
    const t = tablasDelBalanceGeneral({ hasta: '2026-10-31', activo: lado(10), pasivo: lado(7), patrimonio: lado(3), resultadoDelEjercicioCop: 0, cuadra: true, diferenciaCop: 0, avisos: [] })
    expect(t.map((x) => x.titulo ?? '—')).toEqual(['Activo', 'Pasivo', 'Patrimonio', '—'])
    expect(t[0].pie?.[0]).toEqual(['Total activo', null, 10])
  })
})

describe('CB-C-13 · la pieza de las pantallas', () => {
  it('«Descargar en Excel» baja un .xlsx con todas las filas y la plata como número', async () => {
    const { DescargarElInforme } = await import('@/components/contabilidad/reportes/DescargarElInforme')
    await montar(
      <DescargarElInforme
        informe="Balance de prueba"
        periodo={{ desde: '2026-10-01', hasta: '2026-10-31' }}
        tablas={() => tablasDelBalanceDePrueba(balance)}
      />,
    )
    await act(async () => {
      porTestId('informe-excel')!.click()
    })
    await esperar(() => escritos.length === 1)
    expect(escritos[0].nombre).toBe('balance-de-prueba-del-2026-10-01-al-2026-10-31.xlsx')
    const fila = escritos[0].filas.find((f) => f[0] === '110505')
    expect(fila).toEqual(['110505', 'Cuenta 0', 'Débito', 1_000, 2_500_000.29, 0, 2_501_000.29])
  })

  it('«Imprimir o guardar en PDF» arma la hoja con el encabezado y abre la impresión', async () => {
    const { DescargarElInforme } = await import('@/components/contabilidad/reportes/DescargarElInforme')
    let hoja = ''
    let filasImpresas = 0
    const print = vi.fn(() => {
      const h = porTestId('informe-impreso')
      hoja = h?.textContent ?? ''
      filasImpresas = h?.querySelectorAll('tbody tr').length ?? 0
    })
    vi.stubGlobal('print', print)
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0))
    await montar(
      <DescargarElInforme informe="Balance general" periodo={{ hasta: '2026-10-31' }} tablas={() => tablasDelBalanceDePrueba(balance)} />,
    )
    await act(async () => {
      porTestId('informe-imprimir')!.click()
    })
    await esperar(() => print.mock.calls.length === 1)
    expect(hoja).toContain('Inmobiliaria Laboratorio S.A.S.')
    expect(hoja).toContain('Balance general')
    expect(hoja).toContain('Al 31 de octubre de 2026')
    expect(filasImpresas).toBe(60)
    vi.unstubAllGlobals()
  })

  it('está en las seis pantallas que el contador firma', () => {
    const raiz = join(__dirname, '..', '..', 'components', 'contabilidad')
    for (const archivo of [
      'reportes/BalanceDePrueba.tsx',
      'reportes/LibroMayor.tsx',
      'reportes/LibroAuxiliar.tsx',
      'reportes/AuxiliarPorTercero.tsx',
      'reportes/EstadoDeCuenta.tsx',
      'estados-financieros/EstadosFinancieros.tsx',
    ]) {
      expect({ archivo, usa: /<DescargarElInforme\b/.test(readFileSync(join(raiz, archivo), 'utf8')) }).toEqual({ archivo, usa: true })
    }
  })
})
