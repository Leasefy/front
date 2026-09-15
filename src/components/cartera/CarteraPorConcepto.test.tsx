/**
 * La cartera por concepto (Nico, 2026-09-12): «cuánto debe POR MES, cuánto EN
 * TOTAL, y dividido por CONCEPTO».
 *
 * Lo que se protege:
 *  - una fila por inquilino con su total por concepto, y al abrirla una fila
 *    por MES con el mismo desglose;
 *  - **los números cierran**: la suma de las columnas de concepto es el saldo
 *    de la fila, el de cada inquilino es la suma de sus meses, y el pie es la
 *    suma de lo que se ve. Se mide LEYENDO LA TABLA, no el objeto: es la tabla
 *    la que tiene que cuadrar;
 *  - «Sin desglose» sólo existe cuando alguna fila no cuadra (el cobro de QA
 *    con la línea de interés escrita dos veces), y esa fila queda marcada;
 *  - el pie sigue a lo filtrado, no al total general;
 *  - un fallo del back no se pinta como una cartera en $0.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type {
  CarteraDeInquilinos,
  FilaDeCarteraDelInquilino,
  InquilinoEnCartera,
} from '@/lib/api/cartera.types'
import { formatCurrency } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const carteraMock = vi.fn()

vi.mock('@/lib/hooks/use-cartera', () => ({
  useCarteraDeInquilinos: () => carteraMock(),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga' },
      `${queEs}: ${error instanceof Error ? error.message : String(error)}`,
    ),
}))

import { CarteraPorConcepto, rotuloDelContrato } from './CarteraPorConcepto'

function fila(p: Partial<FilaDeCarteraDelInquilino> = {}): FilaDeCarteraDelInquilino {
  const base: FilaDeCarteraDelInquilino = {
    cobroId: 'co1',
    contractId: 'ct1',
    contrato: '1686',
    inmueble: 'Apartamento 302',
    month: '2026-07',
    vence: '2026-07-05',
    status: 'LATE',
    diasDeMora: 68,
    enMora: true,
    enSiniestro: false,
    porConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 95_200, GASTO_ADMINISTRATIVO: 210_000 },
    saldoPorConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 95_200, GASTO_ADMINISTRATIVO: 210_000 },
    facturadoCop: 2_405_200,
    sinDesgloseCop: 0,
    abonadoCop: 0,
    saldoCop: 2_405_200,
  }
  return { ...base, ...p }
}

/** Nicolás debe tres meses; el de agosto con un abono ya imputado. */
const NICOLAS: InquilinoEnCartera = (() => {
  const filas = [
    fila(),
    fila({
      cobroId: 'co2',
      month: '2026-08',
      vence: '2026-08-05',
      diasDeMora: 38,
      // Abonó 100.000: se imputan primero a los intereses (art. 1653 C.C.).
      porConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 53_200, GASTO_ADMINISTRATIVO: 210_000 },
      saldoPorConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 0, GASTO_ADMINISTRATIVO: 163_200 },
      facturadoCop: 2_363_200,
      abonadoCop: 100_000,
      saldoCop: 2_263_200,
    }),
    fila({
      cobroId: 'co3',
      month: '2026-09',
      vence: '2026-09-05',
      diasDeMora: 7,
      porConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 9_800 },
      saldoPorConcepto: { CANON: 2_100_000, INTERES_DE_MORA: 9_800 },
      facturadoCop: 2_109_800,
      saldoCop: 2_109_800,
    }),
  ]
  return {
    clave: 'documento:70814637',
    nombre: 'Nicolás Rojas',
    documento: '70814637',
    telefono: '3010082450',
    contratos: [
      { contractId: 'ct1', contrato: '1686', contratoDeLeasefy: 'Leasefy #1839', inmueble: 'Apartamento 302' },
    ],
    filas,
    totales: {
      porConcepto: { CANON: 6_300_000, INTERES_DE_MORA: 158_200, GASTO_ADMINISTRATIVO: 420_000 },
      saldoPorConcepto: { CANON: 6_300_000, INTERES_DE_MORA: 105_000, GASTO_ADMINISTRATIVO: 373_200 },
      facturadoCop: 6_878_200,
      sinDesgloseCop: 0,
      abonadoCop: 100_000,
      saldoCop: 6_778_200,
      enMoraCop: 6_778_200,
      porVencerCop: 0,
      enSiniestroCop: 0,
      cobros: 3,
    },
  }
})()

/** Marta todavía no vence: plata que va a entrar, no mora. */
const MARTA: InquilinoEnCartera = {
  clave: 'documento:43111222',
  nombre: 'Marta Gómez',
  documento: '43111222',
  telefono: null,
  contratos: [{ contractId: 'ct2', contrato: '#94', inmueble: 'Casa en Laureles' }],
  filas: [
    fila({
      cobroId: 'co4',
      contractId: 'ct2',
      contrato: '#94',
      inmueble: 'Casa en Laureles',
      month: '2026-10',
      vence: '2026-10-05',
      status: 'COBRO_PENDING',
      diasDeMora: 0,
      enMora: false,
      porConcepto: { CANON: 1_900_000 },
      saldoPorConcepto: { CANON: 1_900_000 },
      facturadoCop: 1_900_000,
      saldoCop: 1_900_000,
    }),
  ],
  totales: {
    porConcepto: { CANON: 1_900_000 },
    saldoPorConcepto: { CANON: 1_900_000 },
    facturadoCop: 1_900_000,
    sinDesgloseCop: 0,
    abonadoCop: 0,
    saldoCop: 1_900_000,
    enMoraCop: 0,
    porVencerCop: 1_900_000,
    enSiniestroCop: 0,
    cobros: 1,
  },
}

function cartera(over: Partial<CarteraDeInquilinos> = {}): CarteraDeInquilinos {
  const inquilinos = over.inquilinos ?? [NICOLAS, MARTA]
  return {
    generadoEn: '2026-09-12T22:00:00.000Z',
    hoy: '2026-09-12',
    conceptos: ['CANON', 'INTERES_DE_MORA', 'GASTO_ADMINISTRATIVO'],
    totales: {
      porConcepto: { CANON: 8_200_000, INTERES_DE_MORA: 158_200, GASTO_ADMINISTRATIVO: 420_000 },
      saldoPorConcepto: {
        CANON: 8_200_000,
        INTERES_DE_MORA: 105_000,
        GASTO_ADMINISTRATIVO: 373_200,
      },
      facturadoCop: 8_778_200,
      sinDesgloseCop: 0,
      abonadoCop: 100_000,
      saldoCop: 8_678_200,
      enMoraCop: 6_778_200,
      porVencerCop: 1_900_000,
      enSiniestroCop: 0,
      cobros: 4,
    },
    ...over,
    inquilinos,
  }
}

function conCartera(datos: CarteraDeInquilinos | null, extra: Record<string, unknown> = {}) {
  carteraMock.mockReturnValue({
    datos,
    cargando: false,
    error: null,
    recargar: vi.fn(),
    ...extra,
  })
}

let host: HTMLDivElement
let root: Root

function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<CarteraPorConcepto />)
  })
}

const $ = (sel: string) => {
  const el = host.querySelector<HTMLElement>(sel)
  if (!el) throw new Error(`No está: ${sel}`)
  return el
}
const todos = (sel: string) => Array.from(host.querySelectorAll<HTMLElement>(sel))
const clic = (el: HTMLElement) => act(() => el.click())

/**
 * La cifra de cada celda, en orden. Un «—» es un cero de verdad; la celda del
 * saldo lleva además el abono debajo, y la que cuenta es la PRIMERA.
 */
function pesosDe(fila: HTMLElement): number[] {
  return Array.from(fila.querySelectorAll('td')).flatMap((td) => {
    const texto = (td.textContent ?? '').trim()
    if (texto === '—') return [0]
    const m = /\$(-?[\d.]+)/.exec(texto)
    return m ? [Number(m[1]!.replace(/\./g, ''))] : []
  })
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  carteraMock.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('CarteraPorConcepto', () => {
  it('una fila por inquilino con su total por concepto, y la franja de toda la cartera', () => {
    conCartera(cartera())
    montar()

    const resumen = $('[data-testid="resumen-por-concepto"]').textContent ?? ''
    expect(resumen).toContain(formatCurrency(8_678_200))
    expect(resumen).toContain(formatCurrency(6_778_200))
    expect(resumen).toContain(formatCurrency(1_900_000))
    expect(resumen).toContain('4 cobros')

    const filas = todos('[data-testid="fila-inquilino"]')
    expect(filas).toHaveLength(2)
    expect(filas[0]!.textContent).toContain('Nicolás Rojas')
    expect(filas[0]!.textContent).toContain('3 meses')
    // El número de Nui primero y el nuestro rotulado: nunca un «#1839» pelado.
    expect(filas[0]!.textContent).toContain('contrato 1686 · Leasefy #1839')
    expect(filas[1]!.textContent).toContain('contrato #94')

    // Canon · intereses · gasto administrativo · debe (con el abono debajo).
    expect(pesosDe(filas[0]!)).toEqual([6_300_000, 105_000, 373_200, 6_778_200])
    expect(filas[0]!.textContent).toContain('abonó')
  })

  it('los números cierran: columnas = saldo de la fila, y meses = total del inquilino', () => {
    conCartera(cartera())
    montar()

    const filaDeNicolas = todos('[data-testid="fila-inquilino"]')[0]!
    const [canon, intereses, gasto, debe] = pesosDe(filaDeNicolas)
    expect(canon! + intereses! + gasto!).toBe(debe)

    clic(filaDeNicolas.querySelector('button')!)

    const meses = todos('[data-testid="fila-mes"]')
    expect(meses).toHaveLength(3)

    let sumaDeMeses = 0
    for (const mes of meses) {
      const cifras = pesosDe(mes)
      const saldoDelMes = cifras[cifras.length - 1]!
      // Las tres columnas de concepto suman el saldo del mes.
      expect(cifras[0]! + cifras[1]! + cifras[2]!).toBe(saldoDelMes)
      sumaDeMeses += saldoDelMes
    }
    expect(sumaDeMeses).toBe(debe)

    // Y el pie es la suma de los dos inquilinos.
    const pie = pesosDe($('[data-testid="totales-por-concepto"]'))
    expect(pie[pie.length - 1]).toBe(6_778_200 + 1_900_000)
    expect(pie[0]! + pie[1]! + pie[2]!).toBe(pie[pie.length - 1])
  })

  it('el mes con abono muestra el interés en cero: el pago fue primero a la mora', () => {
    conCartera(cartera())
    montar()
    clic(todos('[data-testid="fila-inquilino"]')[0]!.querySelector('button')!)

    const agosto = todos('[data-testid="fila-mes"]')[1]!
    expect(agosto.textContent).toContain('Agosto de 2026')
    expect(pesosDe(agosto)).toEqual([2_100_000, 0, 163_200, 2_263_200])
    expect(agosto.textContent).toContain('abonó')
  })

  it('sin diferencias no hay columna «Sin desglose»', () => {
    conCartera(cartera())
    montar()
    expect(($('[data-testid="tabla-por-concepto"]').textContent ?? '')).not.toContain(
      'Sin desglose',
    )
  })

  it('un cobro cuyas líneas no suman su saldo se delata, no se promedia', () => {
    // El caso real de QA: la línea de interés escrita dos veces (3.202+3.202
    // contra un `lateFee` de 3.202) deja −3.202 sin desglose.
    const torcida = fila({
      cobroId: 'co9',
      month: '2026-09',
      porConcepto: { CANON: 2_400_000, INTERES_DE_MORA: 6_404 },
      saldoPorConcepto: { CANON: 2_400_000, INTERES_DE_MORA: 6_404 },
      facturadoCop: 2_403_202,
      sinDesgloseCop: -3_202,
      saldoCop: 2_403_202,
    })
    const rota: InquilinoEnCartera = {
      ...MARTA,
      clave: 'documento:99',
      nombre: 'Andrés Muñoz',
      filas: [torcida],
      totales: {
        ...MARTA.totales,
        porConcepto: { CANON: 2_400_000, INTERES_DE_MORA: 6_404 },
        saldoPorConcepto: { CANON: 2_400_000, INTERES_DE_MORA: 6_404 },
        facturadoCop: 2_403_202,
        sinDesgloseCop: -3_202,
        saldoCop: 2_403_202,
        enMoraCop: 2_403_202,
        porVencerCop: 0,
      },
    }
    conCartera(
      cartera({
        inquilinos: [rota],
        conceptos: ['CANON', 'INTERES_DE_MORA'],
        totales: { ...cartera().totales, sinDesgloseCop: -3_202, saldoCop: 2_403_202 },
      }),
    )
    montar()

    expect($('[data-testid="tabla-por-concepto"]').textContent).toContain('Sin desglose')
    clic(todos('[data-testid="fila-inquilino"]')[0]!.querySelector('button')!)
    expect(todos('[data-testid="fila-mes"]')[0]!.textContent).toContain(
      'no suman su saldo',
    )
  })

  it('el buscador y «sólo en mora» achican la tabla, y el pie sigue a lo filtrado', () => {
    conCartera(cartera())
    montar()

    escribir($('[data-testid="buscar-por-concepto"]') as HTMLInputElement, 'laureles')
    expect(todos('[data-testid="fila-inquilino"]')).toHaveLength(1)
    let pie = pesosDe($('[data-testid="totales-por-concepto"]'))
    expect(pie[pie.length - 1]).toBe(1_900_000)
    expect($('[data-testid="totales-por-concepto"]').textContent).toContain(
      'Total de lo filtrado',
    )

    escribir($('[data-testid="buscar-por-concepto"]') as HTMLInputElement, '')
    clic($('[data-testid="solo-en-mora"]'))
    expect(todos('[data-testid="fila-inquilino"]')).toHaveLength(1)
    pie = pesosDe($('[data-testid="totales-por-concepto"]'))
    expect(pie[pie.length - 1]).toBe(6_778_200)
  })

  it('un fallo del back no se pinta como una cartera en $0', () => {
    conCartera(null, { error: new Error('502 Bad Gateway') })
    montar()

    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('502 Bad Gateway')
    expect(host.querySelector('[data-testid="resumen-por-concepto"]')).toBeNull()
  })

  it('sin deuda dice que nadie te debe nada, sin ofrecer quitar filtros', () => {
    conCartera(
      cartera({
        inquilinos: [],
        conceptos: [],
        totales: {
          porConcepto: {},
          saldoPorConcepto: {},
          facturadoCop: 0,
          sinDesgloseCop: 0,
          abonadoCop: 0,
          saldoCop: 0,
          enMoraCop: 0,
          porVencerCop: 0,
          enSiniestroCop: 0,
          cobros: 0,
        },
      }),
    )
    montar()

    expect($('[data-testid="tabla-por-concepto"]').textContent).toContain('Nadie te debe nada')
    expect(host.querySelector('[data-testid="totales-por-concepto"]')).toBeNull()
  })
})

describe('rotuloDelContrato — de quién es cada número', () => {
  it('migrado: el de la inmobiliaria y el nuestro rotulado', () => {
    expect(rotuloDelContrato({ contrato: '1686', contratoDeLeasefy: 'Leasefy #1839' })).toBe(
      ' · contrato 1686 · Leasefy #1839',
    )
  })
  it('nativo: sólo el nuestro', () => {
    expect(rotuloDelContrato({ contrato: '#94', contratoDeLeasefy: null })).toBe(' · contrato #94')
    expect(rotuloDelContrato({ contrato: '#94' })).toBe(' · contrato #94')
  })
  it('sin contrato: nada', () => {
    expect(rotuloDelContrato({ contrato: null })).toBe('')
  })
})
