/**
 * La portada de Pagos, después de la corrección de Nico (2026-09-16).
 *
 * Lo que se protege acá, y por qué cada cosa:
 *
 *  1. 🔴 **La pantalla no gira alrededor de «generar los cobros».** La acción
 *     principal es registrar un pago, y en ninguna parte se ofrece generar un
 *     cobro ni se dice «todavía no hay cobros»: «el cobro ya está generado»
 *     —la deuda nace con el contrato y se difiere por mes—, así que con
 *     contratos vigentes SÍ hay deuda.
 *  2. 🔴 **Los números salen de las CUOTAS**, que existen aunque no haya un
 *     solo `Cobro` emitido. Es lo que hacía que la inmobiliaria migrada viera
 *     0, $0, $0 y 0 sobre $8.446 millones.
 *  3. 🔴 **Los tres cajones no se mezclan** y suman lo que falta: por vencer ·
 *     vencido en plazo · cartera. Un solo «pendiente» manda a la cobranza a
 *     perseguir plata que nadie debe todavía, con la Ley 2300 de por medio.
 *  4. La franja habla del MES entero aunque haya filtro puesto, y lo dice.
 *  5. Un fallo del back no se pinta como un mes en cero.
 *  6. Sin `cobros:create` el botón queda a la vista y deshabilitado, con el
 *     porqué: esconderlo se lee como «falta la función».
 *  7. 🔴 **Cada fila abre el ESTADO DE CUENTA de su cliente** (Nico, más tarde
 *     el mismo día: «eso va atado al estado de cuenta»). Con la cuenta del
 *     portal si la tiene, si no con el DOCUMENTO; sin ninguno, sin enlace.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { CarteraDelMes, FilaDeLaCuotaDelMes } from '@/lib/api/cartera.types'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const carteraMock = vi.fn()
const permisoMock = vi.fn(() => true)

vi.mock('@/lib/hooks/use-cartera', () => ({
  useCarteraDelMes: (mes: string) => carteraMock(mes),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    locale: 'es',
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('@/components/inmobiliaria/permiso-de-recibo', () => ({
  MOTIVO_SIN_PERMISO_DE_RECIBO: 'Necesitas permiso para crear cobros.',
  usePuedeHacerRecibo: () => permisoMock(),
}))
vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: { crearPorCliente: vi.fn() },
}))
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error, queEs }: { error: unknown; queEs?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'fallo-de-carga' },
      `${queEs}: ${error instanceof Error ? error.message : String(error)}`,
    ),
}))
// El recibo de caja es un overlay enorme: acá sólo interesa si está abierto.
vi.mock('@/components/inmobiliaria/RegistrarPagoModal', () => ({
  RegistrarPagoModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'recibo-de-caja' }) : null,
}))
// El Select del DS monta un portal de Radix: se reduce a un <select> nativo.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children?: React.ReactNode
  }) =>
    React.createElement(
      'select',
      {
        value,
        onChange: (e: { target: { value: string } }) => onValueChange(e.target.value),
        'data-testid': 'select-mes',
      },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement('option', { value }, children),
}))

import { DeudaDelMesPanel, filtrarCuotas, mesActual, mesesRecientes } from './DeudaDelMesPanel'

function fila(p: Partial<FilaDeLaCuotaDelMes> = {}): FilaDeLaCuotaDelMes {
  return {
    cuotaId: 'q1',
    // 🔴 Sin cobro: es el estado de TODAS las 30.951 cuotas de la migrada.
    cobroId: null,
    contractId: 'ct1',
    contrato: '1686',
    contratoDeLeasefy: 'Leasefy #1839',
    inquilino: 'Nicolás Rojas',
    // Sin cuenta del portal: lo normal en lo migrado. Lo identifica el documento.
    tenantId: null,
    documento: '70814637',
    telefono: null,
    inmueble: 'Apartamento 302',
    mes: '2026-09',
    vence: '2026-09-05',
    estado: 'PENDIENTE',
    cajon: 'CARTERA',
    diasDeMora: 5,
    diasDePlazo: 5,
    esVencida: true,
    enMora: true,
    enSiniestro: false,
    totalCop: 2_000_000,
    pagadoCop: 0,
    pendienteCop: 2_000_000,
    ...p,
  }
}

const EN_CARTERA = fila()
const EN_PLAZO = fila({
  cuotaId: 'q2',
  contractId: 'ct2',
  contrato: '#94',
  contratoDeLeasefy: null,
  inquilino: 'Marta Gómez',
  documento: '43111222',
  inmueble: 'Casa en Laureles',
  vence: '2026-09-12',
  cajon: 'VENCIDA_EN_PLAZO',
  diasDeMora: 0,
  esVencida: true,
  enMora: false,
  totalCop: 1_000_000,
  pendienteCop: 1_000_000,
})
const POR_VENCER = fila({
  cuotaId: 'q3',
  contractId: 'ct3',
  contrato: '#95',
  contratoDeLeasefy: null,
  inquilino: 'Ana Ruiz',
  documento: '52000111',
  inmueble: 'Local 7',
  vence: '2026-09-28',
  cajon: 'POR_VENCER',
  diasDeMora: 0,
  esVencida: false,
  enMora: false,
  totalCop: 3_000_000,
  pendienteCop: 3_000_000,
})
const PAGADA = fila({
  cuotaId: 'q4',
  contractId: 'ct4',
  contrato: '#96',
  contratoDeLeasefy: null,
  inquilino: 'Luis Pérez',
  documento: '11222333',
  inmueble: 'Apartamento 101',
  estado: 'CANCELADA',
  cajon: 'SIN_DEUDA',
  diasDeMora: 0,
  esVencida: true,
  enMora: false,
  totalCop: 1_500_000,
  pagadoCop: 1_500_000,
  pendienteCop: 0,
})

const FILAS = [EN_CARTERA, EN_PLAZO, POR_VENCER, PAGADA]

function mes(p: Partial<CarteraDelMes> = {}): CarteraDelMes {
  return {
    generadoEn: '2026-09-15T17:00:00.000Z',
    hoy: '2026-09-15',
    mes: '2026-09',
    totales: {
      cuotas: 4,
      contratos: 4,
      inquilinos: 4,
      totalCop: 7_500_000,
      pagadoCop: 1_500_000,
      pendienteCop: 6_000_000,
      porVencerCop: 3_000_000,
      vencidaEnPlazoCop: 1_000_000,
      carteraCop: 2_000_000,
      cuotasEnCartera: 1,
      enSiniestroCop: 0,
      sinCuadrarCop: 0,
    },
    filas: FILAS,
    contratosSinCuotas: 0,
    excluidas: [],
    avisos: [],
    ...p,
  }
}

function conMes(datos: CarteraDelMes | null, extra: Record<string, unknown> = {}) {
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
    root.render(<DeudaDelMesPanel mesInicial="2026-09" />)
  })
}

const $ = (sel: string) => host.querySelector(sel) as HTMLElement
const todos = (sel: string) => [...host.querySelectorAll(sel)] as HTMLElement[]
const pesos = (sel: string) => Number(($(sel).textContent ?? '').replace(/\D/g, ''))
const clic = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

beforeEach(() => {
  carteraMock.mockReset()
  permisoMock.mockReturnValue(true)
  conMes(mes())
})

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
})

describe('filtrarCuotas', () => {
  /*
   * 🔴 Antes el tercer argumento era `soloCartera: boolean` y este test se
   * llamaba «Sólo cartera filtra por el CAJÓN». El interruptor se fue el
   * 18-09 (Nico: «eso de prender o apagar algo debe sí o sí ser otra forma,
   * quizás con un switch tab como manejamos otras tablas»): un booleano sólo
   * sabe decir dos estados y los cajones son tres, así que «por vencer» y
   * «vencido, en plazo» no tenían forma de mirarse solos aunque cada uno
   * tuviera su propia cifra en pantalla. Lo que el test protege NO cambió:
   * se filtra por el CAJÓN, no por «tiene saldo».
   */
  it('🔴 filtra por el CAJÓN: lo vencido en plazo NO es cartera', () => {
    expect(filtrarCuotas(FILAS, '', 'CARTERA').map((f) => f.cuotaId)).toEqual(['q1'])
    expect(filtrarCuotas(FILAS, '', 'VENCIDA_EN_PLAZO').map((f) => f.cuotaId)).toEqual(['q2'])
  })

  it('cada cajón se puede mirar solo, no sólo la cartera', () => {
    // Lo que el interruptor no podía hacer.
    expect(filtrarCuotas(FILAS, '', 'POR_VENCER').map((f) => f.cuotaId)).toEqual(['q3'])
  })

  it('busca por inquilino, documento, contrato e inmueble, sin tildes', () => {
    expect(filtrarCuotas(FILAS, 'nicolas', 'TODAS').map((f) => f.cuotaId)).toEqual(['q1'])
    expect(filtrarCuotas(FILAS, '43111222', 'TODAS').map((f) => f.cuotaId)).toEqual(['q2'])
    expect(filtrarCuotas(FILAS, '1686', 'TODAS').map((f) => f.cuotaId)).toEqual(['q1'])
    expect(filtrarCuotas(FILAS, 'laureles', 'TODAS').map((f) => f.cuotaId)).toEqual(['q2'])
  })

  it('la búsqueda y el cajón se combinan', () => {
    expect(filtrarCuotas(FILAS, 'nicolas', 'POR_VENCER')).toHaveLength(0)
  })

  /*
   * 🔴 19-09 · Este test decía «sin búsqueda ni cajón devuelve todo» y esperaba
   * las CUATRO filas. Estaba mal, y se vio en el navegador con los 105 de la
   * agencia de QA: la pestaña cantaba «Todo lo que falta · 105 cuotas» mientras
   * los tres momentos que promete contener sumaban 101, porque metía adentro
   * las 4 ya saldadas. El dinero sí cuadraba, o sea la cifra hablaba de la
   * deuda y el conteo del mes. `TODAS` no es «todo el mes»: es «todo lo que
   * falta», y una cuota pagada del todo no falta.
   */
  it('🔴 TODAS es «todo lo que falta»: deja fuera lo ya saldado', () => {
    const vistas = filtrarCuotas(FILAS, '  ', 'TODAS')
    expect(vistas.map((f) => f.cuotaId)).toEqual(['q1', 'q2', 'q3'])
    expect(vistas.some((f) => f.cajon === 'SIN_DEUDA')).toBe(false)
  })

  it('🔴 y lo saldado sigue estando: tiene su propio cajón', () => {
    // Sin esto, buscar a alguien que YA PAGÓ devolvería «ningún resultado»,
    // que es la pantalla afirmando que esa cuota no existe.
    expect(filtrarCuotas(FILAS, '', 'SIN_DEUDA').map((f) => f.cuotaId)).toEqual(['q4'])
    expect(filtrarCuotas(FILAS, 'luis', 'SIN_DEUDA').map((f) => f.cuotaId)).toEqual(['q4'])
  })

  it('los tres momentos más lo saldado reconstruyen el mes', () => {
    const n = (c: Parameters<typeof filtrarCuotas>[2]) => filtrarCuotas(FILAS, '', c).length
    expect(n('POR_VENCER') + n('VENCIDA_EN_PLAZO') + n('CARTERA')).toBe(n('TODAS'))
    expect(n('TODAS') + n('SIN_DEUDA')).toBe(FILAS.length)
  })

  /*
   * 🔴 19-09 · Las tres cifras de arriba también son filtros (Nico: «yo
   * debería de poder dar clic a cada una de ellas si es que quiero ampliar
   * información de cada una»), y cada una tiene que abrir EXACTAMENTE las
   * filas que la componen. Si no, el clic enseña un número distinto del que
   * se tocó, que es peor que no poder tocarlo.
   */
  it('🔴 MES es el mes ENTERO: no descarta ni lo ya saldado', () => {
    expect(filtrarCuotas(FILAS, '', 'MES').map((f) => f.cuotaId)).toEqual([
      'q1',
      'q2',
      'q3',
      'q4',
    ])
  })

  it('🔴 PAGADO es «entró plata», e incluye el ABONO PARCIAL', () => {
    /*
     * Ésta es la razón de que `PAGADO` no sea `SIN_DEUDA`: la cifra «Pagado»
     * del resumen suma los abonos de cuotas que TODAVÍA deben, así que
     * mandar el clic al cajón de las saldadas mostraría menos filas de las
     * que hacen ese número. Con $400.000 abonados sobre la cuota en cartera,
     * esa fila pertenece a «Pagado» y sigue perteneciendo a «Cartera».
     */
    const conAbono = FILAS.map((f) =>
      f.cuotaId === 'q1' ? { ...f, pagadoCop: 400_000, pendienteCop: 1_600_000 } : f,
    )
    expect(filtrarCuotas(conAbono, '', 'PAGADO').map((f) => f.cuotaId)).toEqual(['q1', 'q4'])
    expect(filtrarCuotas(conAbono, '', 'SIN_DEUDA').map((f) => f.cuotaId)).toEqual(['q4'])
    expect(filtrarCuotas(conAbono, '', 'CARTERA').map((f) => f.cuotaId)).toEqual(['q1'])
  })

  it('MES y PAGADO también respetan la búsqueda', () => {
    expect(filtrarCuotas(FILAS, 'luis', 'MES').map((f) => f.cuotaId)).toEqual(['q4'])
    expect(filtrarCuotas(FILAS, 'nicolas', 'PAGADO')).toHaveLength(0)
  })
})

describe('el mes', () => {
  it('mesActual usa la hora LOCAL (no corre el mes por el huso)', () => {
    expect(mesActual(new Date(2026, 0, 1, 0, 30))).toBe('2026-01')
  })

  it('mesesRecientes va del más nuevo al más viejo y cruza el año', () => {
    expect(mesesRecientes(3, new Date(2026, 1, 15))).toEqual(['2026-02', '2026-01', '2025-12'])
  })
})

describe('DeudaDelMesPanel — la deuda del mes, no los cobros', () => {
  it('🔴 la acción principal es registrar un pago, no generar cobros', () => {
    montar()
    const boton = $('[data-testid="abrir-recibo-de-caja"]')
    expect(boton.textContent).toContain('Registrar un pago')
    expect(host.textContent).not.toContain('Generar los cobros')
    // Y abre el recibo de caja, que se le hace a un CLIENTE.
    expect(host.querySelector('[data-testid="recibo-de-caja"]')).toBeNull()
    clic(boton)
    expect(host.querySelector('[data-testid="recibo-de-caja"]')).not.toBeNull()
  })

  it('🔴 dice lo que se debe, lo pagado y lo que falta, con cero cobros emitidos', () => {
    montar()
    expect(FILAS.every((f) => f.cobroId === null)).toBe(true)
    expect(pesos('[data-testid="mes-se-debe"]')).toBe(7_500_000)
    expect(pesos('[data-testid="mes-pagado"]')).toBe(1_500_000)
    expect(pesos('[data-testid="mes-falta"]')).toBe(6_000_000)
  })

  it('🔴 los tres cajones van por separado y suman lo que falta', () => {
    montar()
    const porVencer = pesos('[data-testid="mes-por-vencer"]')
    const enPlazo = pesos('[data-testid="mes-vencido-en-plazo"]')
    const cartera = pesos('[data-testid="mes-cartera"]')
    expect([porVencer, enPlazo, cartera]).toEqual([3_000_000, 1_000_000, 2_000_000])
    expect(porVencer + enPlazo + cartera).toBe(pesos('[data-testid="mes-falta"]'))
  })

  it('usa las MISMAS palabras que la cartera por concepto', () => {
    montar()
    const pestanas = $('[data-testid="cajones-del-mes"]').textContent ?? ''
    expect(pestanas).toContain('Por vencer')
    expect(pestanas).toContain('Vencido, en plazo')
    expect(pestanas).toContain('Cartera')
  })

  /*
   * 🔴 Las explicaciones de cada cajón vivían debajo de su ficha, las tres a la
   * vez. Con los cajones convertidos en pestañas (18-09) no caben ahí, así que
   * se dice la del cajón ELEGIDO, encima de la tabla. Esto es MÁS fuerte que el
   * test viejo: antes bastaba con que las frases estuvieran en el DOM; ahora
   * tiene que ser la que corresponde a lo que se está mirando. Sin esta línea,
   * «vencido, en plazo» y «cartera» se leen como sinónimos y la cobranza
   * termina persiguiendo a alguien que usa el plazo que le dieron.
   */
  it('🔴 la explicación sigue al cajón elegido, con las palabras de cartera', () => {
    montar()
    const dice = () => $('[data-testid="que-es-este-cajon"]').textContent ?? ''
    expect(dice()).toContain('Todo lo que falta por pagar de este mes')
    clic($('[data-testid="cajon-por-vencer"]'))
    expect(dice()).toBe('Todavía no vence. Es deuda, no cartera.')
    clic($('[data-testid="cajon-vencido-en-plazo"]'))
    expect(dice()).toBe('Venció, pero el plazo del contrato sigue corriendo.')
    clic($('[data-testid="cajon-cartera"]'))
    expect(dice()).toBe('Pasó el plazo. Es lo único que la cobranza persigue.')
  })

  it('la tabla es de CUOTAS del mes, con su cajón dicho', () => {
    // 🔴 19-09: abre en «Todo lo que falta», que son los TRES momentos. La
    // cuarta fila —ya saldada— no falta, y por eso no está acá; vive en su
    // propia pestaña, que es el test de abajo.
    montar()
    const filas = todos('[data-testid="cuota-fila"]')
    expect(filas).toHaveLength(3)
    expect(filas[0]!.textContent).toContain('Nicolás Rojas')
    expect(filas[0]!.textContent).toContain('Cartera')
    expect(filas[0]!.textContent).toContain('5 días de mora')
    expect(filas[1]!.textContent).toContain('Vencido, en plazo')
    expect(filas[2]!.textContent).toContain('Por vencer')
  })

  it('🔴 «Pagadas» es la quinta pestaña, y ahí sí está la saldada', () => {
    montar()
    clic($('[data-testid="cajon-pagadas"]'))
    const filas = todos('[data-testid="cuota-fila"]')
    expect(filas).toHaveLength(1)
    expect(filas[0]!.textContent).toContain('Luis Pérez')
    expect(filas[0]!.textContent).toContain('Pagada')
    expect($('[data-testid="que-es-este-cajon"]').textContent).toContain('ya están pagadas del todo')
  })

  it('🔴 la franja cuadra consigo misma: los tres momentos suman «todo lo que falta»', () => {
    /*
     * El defecto que se vio en el navegador: «Todo lo que falta · 105 cuotas»
     * con 0 + 8 + 93 = 101 al lado. El primero contaba el mes entero
     * (`totales.cuotas`) y el último la cartera del back
     * (`totales.cuotasEnCartera`): dos fuentes distintas, y nada que las
     * obligara a cuadrar. Ahora los cinco conteos salen de las filas.
     */
    montar()
    const cuotas = (id: string) => {
      const m = $(`[data-testid="${id}"]`).textContent!.match(/(\d+)\s+cuotas?/)
      return Number(m![1])
    }
    expect(
      cuotas('cajon-por-vencer') + cuotas('cajon-vencido-en-plazo') + cuotas('cajon-cartera'),
    ).toBe(cuotas('cajon-todas'))
    expect(cuotas('cajon-todas') + cuotas('cajon-pagadas')).toBe(4)
  })

  it('🔴 el vacío NO dice «todavía no hay cobros»: si no hay cuota, nadie la generó', () => {
    conMes(
      mes({
        filas: [],
        totales: {
          cuotas: 0,
          contratos: 0,
          inquilinos: 0,
          totalCop: 0,
          pagadoCop: 0,
          pendienteCop: 0,
          porVencerCop: 0,
          vencidaEnPlazoCop: 0,
          carteraCop: 0,
          cuotasEnCartera: 0,
          enSiniestroCop: 0,
          sinCuadrarCop: 0,
        },
      }),
    )
    montar()
    const vacio = $('[data-testid="pagos-cuotas-tabla"]').textContent ?? ''
    expect(vacio).toContain('Ningún contrato tiene cuota de este mes')
    expect(vacio).toContain('La deuda nace con el contrato')
    expect(vacio).not.toContain('cobro')
  })

  /*
   * 🔴 Era «Sólo cartera deja sólo la cartera». Cambió el CONTROL —de un
   * interruptor a pestañas (Nico, 18-09)— y no lo que se protege: el número es
   * ahora el filtro, y las cifras siguen siendo las del MES completo aunque la
   * tabla esté filtrada. Se agrega lo que el interruptor no podía: elegir
   * cualquiera de los tres cajones, y volver a todas.
   */
  it('🔴 la pestaña del cajón filtra la tabla, y las cifras siguen siendo del MES', () => {
    montar()
    clic($('[data-testid="cajon-cartera"]'))
    expect($('[data-testid="cajon-cartera"]').getAttribute('aria-selected')).toBe('true')
    expect(todos('[data-testid="cuota-fila"]')).toHaveLength(1)
    // Las cifras NO se mueven: son del mes completo, y se dice cuántas se ven.
    expect(pesos('[data-testid="mes-falta"]')).toBe(6_000_000)
    expect(pesos('[data-testid="mes-cartera"]')).toBe(2_000_000)
    expect($('[data-testid="alcance-de-la-tabla"]').textContent).toContain('1 de 4 cuotas')

    clic($('[data-testid="cajon-por-vencer"]'))
    expect(todos('[data-testid="cuota-fila"]')).toHaveLength(1)
    expect($('[data-testid="cajon-cartera"]').getAttribute('aria-selected')).toBe('false')

    clic($('[data-testid="limpiar-filtros"]'))
    // Vuelve a «todo lo que falta»: los tres momentos, sin la saldada.
    expect(todos('[data-testid="cuota-fila"]')).toHaveLength(3)
    expect($('[data-testid="cajon-todas"]').getAttribute('aria-selected')).toBe('true')
  })

  /*
   * 🔴 Nico, 19-09, señalando las tres cifras del resumen: «yo debería de
   * poder dar clic a cada una de ellas si es que quiero ampliar información
   * de cada una». Era el MISMO defecto que él ya había señalado un renglón
   * más abajo el 18 —un número de sólo lectura y el filtro en otro control—,
   * sólo que arriba.
   */
  describe('🔴 las tres cifras del resumen abren sus filas', () => {
    it('«Se debe» deja la tabla en el mes entero, con la ya saldada adentro', () => {
      montar()
      // De arranque se ve «todo lo que falta»: 3 de 4.
      expect(todos('[data-testid="cuota-fila"]')).toHaveLength(3)

      clic($('[data-testid="abrir-mes-se-debe"]'))
      expect(todos('[data-testid="cuota-fila"]')).toHaveLength(4)
      expect($('[data-testid="abrir-mes-se-debe"]').getAttribute('aria-pressed')).toBe('true')
      expect($('[data-testid="alcance-de-la-tabla"]').textContent).toContain('4 de 4 cuotas')
      // Y la línea de abajo explica qué se está mirando.
      expect($('[data-testid="que-es-este-cajon"]').textContent).toContain('pagadas y sin pagar')
    })

    it('«Pagado» deja las filas en las que entró plata', () => {
      montar()
      clic($('[data-testid="abrir-mes-pagado"]'))
      expect(todos('[data-testid="cuota-fila"]')).toHaveLength(1)
      expect($('[data-testid="abrir-mes-pagado"]').getAttribute('aria-pressed')).toBe('true')
      // Ninguna pestaña de cajón queda encendida: «Pagado» no es un cajón.
      for (const cajon of ['cajon-todas', 'cajon-cartera', 'cajon-pagadas']) {
        expect($(`[data-testid="${cajon}"]`).getAttribute('aria-selected')).toBe('false')
      }
    })

    it('🔴 «Falta por pagar» y la pestaña «Todo lo que falta» son el mismo filtro', () => {
      /*
       * Son literalmente el mismo número ($6.000.000 en las dos). Si se
       * encendieran por separado, la pantalla estaría diciendo que son dos
       * cosas distintas.
       */
      montar()
      clic($('[data-testid="abrir-mes-se-debe"]'))
      expect($('[data-testid="cajon-todas"]').getAttribute('aria-selected')).toBe('false')

      clic($('[data-testid="abrir-mes-falta"]'))
      expect($('[data-testid="cajon-todas"]').getAttribute('aria-selected')).toBe('true')
      expect($('[data-testid="abrir-mes-falta"]').getAttribute('aria-pressed')).toBe('true')
      expect(pesos('[data-testid="mes-falta"]')).toBe(pesos('[data-testid="mes-falta-pestana"]'))
      expect(todos('[data-testid="cuota-fila"]')).toHaveLength(3)
    })

    it('las cifras NO se mueven al tocarlas: siguen siendo las del mes', () => {
      montar()
      clic($('[data-testid="abrir-mes-pagado"]'))
      expect(pesos('[data-testid="mes-se-debe"]')).toBe(7_500_000)
      expect(pesos('[data-testid="mes-pagado"]')).toBe(1_500_000)
      expect(pesos('[data-testid="mes-falta"]')).toBe(6_000_000)
    })
  })

  it('🔴 el alcance describe la TABLA también sin filtros puestos', () => {
    /*
     * Visto en el navegador: decía «105 cuotas en Septiembre de 2026» encima
     * de una tabla de 101, porque el caso «sin filtros» cantaba el total del
     * mes en vez de lo que estaba mostrando.
     */
    montar()
    expect($('[data-testid="alcance-de-la-tabla"]').textContent).toContain('3 de 4 cuotas')
  })

  /*
   * 🔴 Lo que Nico señaló con el dedo: «esto tiene que hacer parte de la
   * tabla», por el renglón del mes y las seis fichas; «y el buscador igual
   * dentro de la tabla». Una sola tarjeta, y la tabla sin marco propio adentro
   * —dos bordes anidados a 1 px se leen como dos cajas—.
   */
  it('🔴 el mes, las cifras, las pestañas y el buscador viven DENTRO de la tarjeta', () => {
    montar()
    const tarjeta = $('[data-testid="tarjeta-de-la-deuda"]')
    for (const parte of [
      'abrir-recibo-de-caja',
      'resumen-del-mes',
      'cajones-del-mes',
      'buscar-cuotas',
      'pagos-cuotas-tabla',
    ]) {
      expect(tarjeta.querySelector(`[data-testid="${parte}"]`)).not.toBeNull()
    }
    // Y el interruptor de antes ya no existe en ninguna parte.
    expect(host.querySelector('[data-testid="solo-cartera"]')).toBeNull()
    // La tabla no dibuja su propio borde: el marco es el de la tarjeta.
    expect($('[data-testid="pagos-cuotas-tabla"]').className).not.toContain('border-border')
  })

  it('🔴 dice lo que estos números NO cuentan', () => {
    conMes(
      mes({
        contratosSinCuotas: 195,
        avisos: ['195 contrato(s) vigente(s) todavía no tienen tabla de amortización.'],
      }),
    )
    montar()
    expect($('[data-testid="avisos-del-mes"]').textContent).toContain('195')
  })

  it('cambiar el mes vuelve a preguntar por ese mes', () => {
    montar()
    expect(carteraMock).toHaveBeenLastCalledWith('2026-09')
    act(() => {
      const select = $('[data-testid="select-mes"]') as HTMLSelectElement
      select.value = '2026-08'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(carteraMock).toHaveBeenLastCalledWith('2026-08')
  })

  it('un fallo del back no se pinta como un mes en cero', () => {
    conMes(null, { error: new Error('502 Bad Gateway') })
    montar()
    expect($('[data-testid="fallo-de-carga"]').textContent).toContain('502 Bad Gateway')
    expect(host.querySelector('[data-testid="resumen-del-mes"]')).toBeNull()
  })

  it('🔴 la columna «Período» dice el mes: el back manda `mes`, no `month`', () => {
    // El espejo del tipo decía `month` y el back siempre mandó `mes`: la
    // columna venía leyendo `undefined` y salía en blanco.
    montar()
    const celdas = todos('[data-testid="cuota-fila"]')[0]!.querySelectorAll('td')
    expect((celdas[2]!.textContent ?? '').trim()).not.toBe('')
    expect(celdas[2]!.textContent).toContain('2026')
  })

  /*
   * 🔴 ACTUALIZADO EL 21-09, y el porqué queda escrito: el estado de cuenta ya
   * NO se abre desde el nombre de la fila.
   *
   * Nico pidió dos cosas el 21-09 —«no le hiciste el detalle al dar clic en un
   * drawer» y «¿por qué no usas al lado derecho el kebab menu para agregar
   * acciones?»— y las dos empujan al mismo lado: la fila abre su cajón y las
   * acciones viven en el kebab. Un enlace dentro de una fila que también es
   * clicable es un segundo destino en el mismo clic, y nadie puede saber cuál
   * le va a tocar.
   *
   * Lo que estas pruebas cuidan NO cambió: con qué se identifica al inquilino
   * (cuenta del portal, si no el documento) y que sin ninguno de los dos la
   * puerta no se ofrezca. Lo que cambió es dónde está la puerta, así que hay
   * que abrir el menú para verla — el menú de Radix monta su contenido recién
   * al abrirse, y en un PORTAL sobre `document.body`, no dentro del host.
   */
  describe('🔴 la puerta al estado de cuenta', () => {
    /**
     * Abre el kebab de la primera fila y devuelve el enlace, si lo ofrece.
     *
     * El disparador de Radix abre con `pointerdown`, no con `click`: un
     * `.click()` no monta nada y la prueba pasaría por la razón equivocada.
     */
    function abrirElKebab(): Element | null {
      const kebab = todos('[data-testid="cuota-kebab"]')[0] as HTMLButtonElement
      act(() => {
        kebab.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId: 1,
          }),
        )
      })
      return document.body.querySelector('[data-testid="cuota-estado-de-cuenta"]')
    }

    it('sin cuenta del portal, el kebab abre el estado de cuenta POR DOCUMENTO', () => {
      montar()
      expect(abrirElKebab()?.getAttribute('href')).toBe(
        '/panel/inmobiliaria/estado-de-cuenta/inquilino/70814637?volver=%2Fpanel%2Finmobiliaria%2Fpagos',
      )
    })

    it('con cuenta del portal, la cuenta manda sobre el documento', () => {
      conMes(mes({ filas: [fila({ tenantId: 'u-77' })] }))
      montar()
      expect(abrirElKebab()?.getAttribute('href')).toBe(
        '/panel/inmobiliaria/estado-de-cuenta/inquilino/u-77?volver=%2Fpanel%2Finmobiliaria%2Fpagos',
      )
    })

    it('sin cuenta ni documento no se ofrece una puerta que da 404, pero el nombre sigue', () => {
      conMes(mes({ filas: [fila({ tenantId: null, documento: null })] }))
      montar()
      expect(abrirElKebab()).toBeNull()
      expect($('[data-testid="cuota-fila"]').textContent).toContain('Nicolás Rojas')
    })

    /*
     * 🔴 La fila entera abre el detalle. Es la razón por la que el enlace se
     * movió al kebab: sin esto, el cambio sería una acción escondida a cambio
     * de nada.
     */
    it('hacer clic en la fila abre el cajón con el detalle de la cuota', () => {
      montar()
      act(() => {
        ($('[data-testid="cuota-fila"]') as HTMLElement).click()
      })
      const cajon = document.body.querySelector('[data-testid="cajon-de-la-cuota"]')
      expect(cajon).not.toBeNull()
      expect(cajon?.textContent).toContain('Nicolás Rojas')
      // Y la plata del detalle es la de la fila, sin una lectura nueva.
      expect(cajon?.querySelector('[data-testid="cajon-se-debe"]')?.textContent).toContain(
        '2.000.000',
      )
    })

    it('el pie lo dice con palabras: cada fila es un mes del estado de cuenta', () => {
      montar()
      expect(host.textContent).toContain('estado de cuenta')
    })
  })

  /*
   * 🔴 El interés del mes (2026-09-16), con la MISMA lectura del back que la
   * cartera por concepto: «Falta por pagar» y los cajones siguen siendo
   * capital, y el interés va debajo. Una cuota ya pagada que lo sigue debiendo
   * tiene «falta $0» y su interés dicho.
   */
  it('🔴 el interés del mes va aparte del capital, también el de una cuota ya pagada', () => {
    const interes = (pendienteCop: number) => ({
      liquidadoCop: pendienteCop,
      abonadoCop: 0,
      pendienteCop,
      origen: 'CUOTA' as const,
      pagadaEnMora: false,
      diasDeMora: 20,
      motivo: null,
      sinReglas: false,
    })
    const filas = FILAS.map((f) =>
      f === EN_CARTERA
        ? { ...f, interes: interes(40_000), totalConInteresCop: f.pendienteCop + 40_000 }
        : f === PAGADA
          ? { ...f, cajon: 'CARTERA' as const, enMora: true, interes: interes(12_000) }
          : f,
    )
    conMes(
      mes({
        filas,
        totales: {
          ...mes().totales,
          interesCop: 52_000,
          totalConInteresCop: 6_052_000,
          cuotasPagadasEnMora: 1,
        },
      }),
    )
    montar()

    // Las cifras grandes no cambian: siguen siendo capital.
    expect($('[data-testid="mes-falta"]').textContent).toBe('$6.000.000')
    expect($('[data-testid="mes-cartera"]').textContent).toBe('$2.000.000')
    expect($('[data-testid="mes-intereses"]').textContent).toBe(
      'cartera.interes.masIntereses:$52.000',
    )
    // `toContain` y no `toBe` desde el 21-09: el resumen del mes dejó de ser
    // tres fichas y pasó a ser una frase, así que este renglón vive dentro de
    // ella y trae el espacio y el punto de la oración. Lo que la prueba cuida
    // es que el interés se diga aparte del capital, no la puntuación.
    expect($('[data-testid="mes-falta-con-intereses"]').textContent).toContain(
      'cartera.interes.conIntereses:$6.052.000',
    )
    expect(todos('[data-testid="cuota-intereses"]').map((e) => e.textContent)).toEqual(
      expect.arrayContaining([
        'cartera.interes.masIntereses:$40.000',
        'cartera.interes.masIntereses:$12.000',
      ]),
    )
  })

  it('sin interés no hay líneas en cero; sin reglas de mora el aviso lleva a configurarlas', () => {
    conMes(
      mes({
        sinReglasDeMora: true,
        avisos: ['La inmobiliaria no tiene reglas de mora activas: la cartera se muestra SIN intereses.'],
      }),
    )
    montar()
    expect(host.querySelector('[data-testid="mes-intereses"]')).toBeNull()
    expect(host.querySelector('[data-testid="cuota-intereses"]')).toBeNull()
    expect($('[data-testid="mes-configurar-reglas"]').getAttribute('href')).toBe(
      '/panel/inmobiliaria/pagos/cartera/reglas-de-mora',
    )
  })

  it('sin permiso de recibo el botón queda a la vista, deshabilitado y con el porqué', () => {
    permisoMock.mockReturnValue(false)
    montar()
    const boton = $('[data-testid="abrir-recibo-de-caja"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.parentElement?.getAttribute('title')).toContain('permiso')
  })
})
