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

  it('sin búsqueda ni cajón devuelve todo', () => {
    expect(filtrarCuotas(FILAS, '  ', 'TODAS')).toHaveLength(4)
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
    montar()
    const filas = todos('[data-testid="cuota-fila"]')
    expect(filas).toHaveLength(4)
    expect(filas[0]!.textContent).toContain('Nicolás Rojas')
    expect(filas[0]!.textContent).toContain('Cartera')
    expect(filas[0]!.textContent).toContain('5 días de mora')
    expect(filas[1]!.textContent).toContain('Vencido, en plazo')
    expect(filas[2]!.textContent).toContain('Por vencer')
    expect(filas[3]!.textContent).toContain('Pagada')
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
    expect(todos('[data-testid="cuota-fila"]')).toHaveLength(4)
    expect($('[data-testid="cajon-todas"]').getAttribute('aria-selected')).toBe('true')
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

  describe('🔴 la puerta al estado de cuenta', () => {
    it('sin cuenta del portal, el nombre abre el estado de cuenta POR DOCUMENTO', () => {
      montar()
      const enlace = todos('[data-testid="cuota-fila"]')[0]!.querySelector(
        '[data-testid="cuota-estado-de-cuenta"]',
      )
      expect(enlace?.getAttribute('href')).toBe(
        '/panel/inmobiliaria/estado-de-cuenta/inquilino/70814637?volver=%2Fpanel%2Finmobiliaria%2Fpagos',
      )
      expect(enlace?.textContent).toBe('Nicolás Rojas')
    })

    it('con cuenta del portal, la cuenta manda sobre el documento', () => {
      conMes(mes({ filas: [fila({ tenantId: 'u-77' })] }))
      montar()
      expect($('[data-testid="cuota-estado-de-cuenta"]').getAttribute('href')).toBe(
        '/panel/inmobiliaria/estado-de-cuenta/inquilino/u-77?volver=%2Fpanel%2Finmobiliaria%2Fpagos',
      )
    })

    it('sin cuenta ni documento no se ofrece una puerta que da 404, pero el nombre sigue', () => {
      conMes(mes({ filas: [fila({ tenantId: null, documento: null })] }))
      montar()
      expect(host.querySelector('[data-testid="cuota-estado-de-cuenta"]')).toBeNull()
      expect($('[data-testid="cuota-fila"]').textContent).toContain('Nicolás Rojas')
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
    expect($('[data-testid="mes-falta-con-intereses"]').textContent).toBe(
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
