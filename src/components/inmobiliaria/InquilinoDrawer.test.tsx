/**
 * El cajón del inquilino. Nico (2026-09-03): «al dar clic se abra un drawer y
 * muestre todo el detalle del inquilino… pagos, etc.»
 *
 * Lo que se protege acá es que el cajón no MIENTA:
 *   - 🔴 lo que debe sale del ESTADO DE CUENTA (las cuotas del contrato), nunca
 *     de sumar cobros: con cero cobros y cuotas pendientes, la deuda se ve
 *     (Nico, 2026-09-15: la deuda nace con el contrato);
 *   - al día · vencido, en plazo · en cartera, con la frontera que trae el back
 *     y no con los días de mora del cobro;
 *   - una deuda que no llegó se muestra «—», nunca «$0» (que se lee «al día»);
 *   - cuando falta el detalle de un contrato se dice, en vez de sumar a medias;
 *   - los arriendos terminados también aparecen.
 *
 * Y desde el glow-up del 2026-09-04, que el VACÍO valga tanto como el lleno:
 *   - quien no tiene arriendos ve UN vacío que dice qué falta y cómo salir de
 *     ahí, no tres ceros y dos carteles grises;
 *   - mientras se buscan sus arriendos terminados NO se declara que no tiene;
 *   - el correo y el teléfono se accionan y se copian, no son texto muerto.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Inquilino, ArriendoDeInquilino } from '@/lib/api/inquilinos.service'
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types'
import type { DetalleDeInquilino } from '@/lib/hooks/use-inquilino-detalle'
import type { ResumenDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const toastExito = vi.fn()
const toastFallo = vi.fn()

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
    locale: 'es',
  }),
}))
// El botón «Enviar mensaje» de la cabecera navega con el router de Next, que
// en un test sin App Router no existe.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Copiar un dato de contacto avisa con un toast; el cajón no lo pinta él mismo.
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toastExito(m),
    error: (m: string) => toastFallo(m),
  },
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { CuerpoDelCajon, inicialesDe, resumirPagos } from './InquilinoDrawer'

/** La única variante de `/contratos/nuevo` que carga sin postulación. */
const RUTA_MANUAL = '/panel/inmobiliaria/contratos/nuevo?modo=manual'

/** happy-dom no trae portapapeles: se le pone uno para poder mirar qué se copió. */
const copiado: string[] = []
Object.defineProperty(globalThis.navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: (texto: string) => {
      copiado.push(texto)
      return Promise.resolve()
    },
  },
})

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: 'l1',
    contractId: 'c1',
    estado: 'ACTIVE',
    desde: '2025-09-04',
    hasta: '2026-09-04',
    canonCop: 3_750_000,
    inmueble: { id: 'i1', title: 'Apto', address: 'Carrera 30a #25A-20', city: 'Bogotá' },
    ...p,
  }
}

function persona(p: Partial<Inquilino> = {}): Inquilino {
  return {
    tenantId: 't1',
    nombre: 'Esteban López Quintero',
    email: 'esteban.lopez@example.com',
    telefono: '3010082450',
    documento: '1020304050',
    arriendos: [arriendo()],
    ...p,
  }
}

function cobro(p: Partial<CobroConDesglose> = {}): CobroConDesglose {
  return {
    id: 'co1',
    leaseId: 'l1',
    consignacionId: 'cs1',
    propertyId: 'i1',
    propietarioId: 'p1',
    tenantId: 't1',
    agenteId: 'a1',
    propertyTitle: 'Apto',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López Quintero',
    tenantEmail: 'esteban.lopez@example.com',
    tenantPhone: '3010082450',
    month: '2026-08',
    rentAmount: 3_750_000,
    adminAmount: 0,
    totalAmount: 3_750_000,
    lateFee: 0,
    totalWithFees: 3_750_000,
    status: 'paid',
    dueDate: '2026-08-05',
    paidDate: '2026-08-03',
    paidAmount: 3_750_000,
    pendingAmount: 0,
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-03',
    ...p,
  }
}

/** Un resumen del estado de cuenta: por defecto, un contrato y al día en todo. */
function cuenta(p: Partial<ResumenDelEstadoDeCuenta> = {}): ResumenDelEstadoDeCuenta {
  return {
    restaPorPagar: 0,
    pendiente: 0,
    proximaCuota: null,
    enMora: null,
    contratos: 1,
    ...p,
  }
}

function detalle(p: Partial<DetalleDeInquilino> = {}): DetalleDeInquilino {
  return {
    persona: persona(),
    cargandoArriendos: false,
    arriendosIncompletos: false,
    cobros: [],
    cargandoPagos: false,
    errorPagos: false,
    pagosIncompletos: false,
    cuenta: cuenta(),
    cargandoCuenta: false,
    errorCuenta: false,
    refDeCuenta: 't1',
    reintentar: vi.fn(),
    ...p,
  }
}

// Los tests de la función pura no montan nada: el desmontaje lo tolera.
let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  container = undefined
  root = undefined
  copiado.length = 0
  toastExito.mockClear()
  toastFallo.mockClear()
})

function montar(d: DetalleDeInquilino) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(<CuerpoDelCajon detalle={d} />)
  })
}

const texto = () => container!.textContent ?? ''

/** Lo que dice la franja de la deuda, sin la lista de cobros. */
const franja = () =>
  container!.querySelector('[data-testid="inquilino-cajon-deuda"]')?.textContent ?? ''

/** El `href` de todos los enlaces pintados. */
const enlaces = () =>
  Array.from(container!.querySelectorAll('a')).map((a) => a.getAttribute('href'))

describe('resumirPagos', () => {
  it('🔴 de los cobros NO sale ni saldo ni mora: sólo su historia como documentos', () => {
    const r = resumirPagos([
      cobro({ id: 'a', status: 'late', pendingAmount: 1_000_000, daysLate: 12 }),
    ])
    expect(Object.keys(r).sort()).toEqual(['recordatorios', 'ultimoPago', 'ultimoRecordatorio'])
  })

  it('el último pago y el último recordatorio son los MÁS RECIENTES, no el último de la lista', () => {
    const r = resumirPagos([
      cobro({ id: 'a', paidDate: '2026-08-03', remindersSent: 2, lastReminderDate: '2026-08-01' }),
      cobro({ id: 'b', paidDate: '2026-06-02', remindersSent: 1, lastReminderDate: '2026-06-01' }),
    ])
    expect(r.ultimoPago).toBe('2026-08-03')
    expect(r.recordatorios).toBe(3)
    expect(r.ultimoRecordatorio).toBe('2026-08-01')
  })

  it('sin cobros no inventa nada', () => {
    expect(resumirPagos([])).toEqual({
      ultimoPago: null,
      recordatorios: 0,
      ultimoRecordatorio: null,
    })
  })
})

describe('inicialesDe', () => {
  it('son dos letras, nunca el nombre entero', () => {
    expect(inicialesDe('Esteban López Quintero')).toBe('EL')
    expect(inicialesDe('Ana')).toBe('A')
  })
})

describe('<CuerpoDelCajon>', () => {
  it('la cabecera trae nombre, correo y teléfono', () => {
    montar(detalle())
    expect(texto()).toContain('Esteban López Quintero')
    expect(texto()).toContain('esteban.lopez@example.com')
    expect(texto()).toContain('3010082450')
  })

  it('el correo y el teléfono se accionan: mailto y tel, no texto muerto', () => {
    montar(detalle())
    expect(enlaces()).toContain('mailto:esteban.lopez@example.com')
    expect(enlaces()).toContain('tel:3010082450')
  })

  it('cada dato de contacto se copia — también el documento, que no tiene a dónde ir', () => {
    montar(detalle())
    const copiadores = Array.from(container!.querySelectorAll('button')).filter((b) =>
      (b.getAttribute('aria-label') ?? '').startsWith('inquilinos.cajon.copiar'),
    )
    // Correo, teléfono y documento.
    expect(copiadores).toHaveLength(3)

    act(() => copiadores[0].click())
    expect(copiado).toEqual(['esteban.lopez@example.com'])

    // El documento sólo se copia: no hay `mailto:` ni `tel:` que abrirle.
    expect(texto()).toContain('1020304050')
  })

  it('sin correo ni teléfono lo dice en la cabecera: es a quién no se le puede cobrar', () => {
    montar(detalle({ persona: persona({ email: null, telefono: null }) }))
    expect(texto()).toContain('inquilinos.sinContacto')
  })

  it('muestra TODOS los arriendos, también los terminados, con enlace a su contrato', () => {
    montar(
      detalle({
        persona: persona({
          arriendos: [
            arriendo({ leaseId: 'vivo', contractId: 'c-vivo' }),
            arriendo({
              leaseId: 'viejo',
              contractId: 'c-viejo',
              estado: 'ENDED',
              inmueble: { id: 'i2', title: 'Casa', address: 'Calle 80 #10-20', city: 'Cali' },
            }),
          ],
        }),
      }),
    )
    // El encabezado de la sección lleva su conteo al lado del título.
    expect(texto()).toContain('inquilinos.cajon.arriendos')
    expect(texto()).toContain('Carrera 30a #25A-20')
    expect(texto()).toContain('Calle 80 #10-20')
    expect(texto()).toContain('inquilinos.estados.terminado')
    expect(enlaces()).toContain('/panel/inmobiliaria/contratos/c-vivo')
    expect(enlaces()).toContain('/panel/inmobiliaria/contratos/c-viejo')
  })

  it('pinta los cobros emitidos con su estado y el saldo del documento, sin días de mora del cobro', () => {
    montar(
      detalle({
        cobros: [
          cobro({ id: 'a', month: '2026-08', status: 'late', pendingAmount: 1_200_000, daysLate: 12, paidDate: undefined, totalWithFees: 3_900_000 }),
          cobro({ id: 'b', month: '2026-07' }),
        ],
      }),
    )
    const pagos = container!.querySelector('[data-testid="inquilino-cajon-pagos"]')!.textContent ?? ''
    expect(pagos).toContain('inquilinos.cajon.cobrosEmitidos')
    expect(pagos).toContain('inmobiliaria.cobros.status.late')
    expect(pagos).toContain('inmobiliaria.cobros.status.paid')
    expect(pagos).toContain('inquilinos.cajon.saldoDelCobro:$1.200.000')
    expect(pagos).toContain('inquilinos.cajon.vencimiento:2026-08-05')
    // `daysLate` del cobro no resta el plazo del contrato: no se pinta.
    expect(pagos).not.toContain(':12')
    // El total incluye la mora ya causada, no el canon pelado.
    expect(pagos).toContain('$3.900.000')
  })

  it('🔴 con CERO cobros y cuotas pendientes, la deuda se ve: resta por pagar, lo vencido y la cartera', () => {
    montar(
      detalle({
        cobros: [],
        cuenta: cuenta({
          restaPorPagar: 15_000_000,
          pendiente: 2_500_000,
          proximaCuota: { fecha: '2026-10-05', monto: 1_250_000 },
          enMora: { dias: 37, monto: 1_250_000 },
        }),
      }),
    )
    expect(franja()).toContain('inquilinos.cajon.restaPorPagar')
    expect(franja()).toContain('$15.000.000')
    expect(franja()).toContain('inquilinos.cajon.proximaCuota:2026-10-05,$1.250.000')
    expect(franja()).toContain('inquilinos.cajon.vencidoSinPagar')
    expect(franja()).toContain('$2.500.000')
    expect(franja()).toContain('inquilinos.cajon.enCartera:37')
    expect(franja()).not.toContain('—')
    expect(franja()).not.toContain('inquilinos.cajon.alDia')
    // Y el vacío de cobros no se lee como «no debe nada».
    const pagos = container!.querySelector('[data-testid="inquilino-cajon-pagos"]')!.textContent ?? ''
    expect(pagos).toContain('inquilinos.cajon.sinCobrosTitulo')
  })

  it('🔴 el saldo NO sale de los cobros: un cobro en mora no pinta cartera si el estado de cuenta dice al día', () => {
    montar(
      detalle({
        cobros: [cobro({ status: 'late', pendingAmount: 9_999_999, daysLate: 40, paidDate: undefined })],
        cuenta: cuenta({ restaPorPagar: 0, pendiente: 0, enMora: null }),
      }),
    )
    expect(franja()).toContain('inquilinos.cajon.alDia')
    expect(franja()).not.toContain('$9.999.999')
    expect(franja()).not.toContain('enCartera')
  })

  it('vencido dentro del plazo no es cartera: lo dice con las palabras de Pagos', () => {
    montar(detalle({ cuenta: cuenta({ restaPorPagar: 5_000_000, pendiente: 1_250_000 }) }))
    expect(franja()).toContain('inquilinos.cajon.vencidoEnPlazo')
    expect(franja()).not.toContain('enCartera')
    expect(franja()).not.toContain('inquilinos.cajon.alDia')
  })

  it('un día en cartera va en singular', () => {
    montar(detalle({ cuenta: cuenta({ pendiente: 100, enMora: { dias: 1, monto: 100 } }) }))
    expect(franja()).toContain('inquilinos.cajon.enCarteraUnDia')
  })

  it('🔴 con el estado de cuenta sin llegar la deuda es «—», nunca $0 — un cero se lee «al día»', () => {
    montar(detalle({ cargandoCuenta: true, cuenta: null }))
    expect(franja()).toContain('inquilinos.cajon.restaPorPagar—')
    expect(franja()).toContain('inquilinos.cajon.vencidoSinPagar—')
    expect(franja()).not.toContain('$0')
    expect(franja()).not.toContain('inquilinos.cajon.alDia')

    // Y con el pedido caído, tampoco: lo dice y ofrece reintentar.
    const reintentar = vi.fn()
    act(() =>
      root!.render(
        <CuerpoDelCajon detalle={detalle({ errorCuenta: true, cuenta: null, reintentar })} />,
      ),
    )
    expect(franja()).toContain('inquilinos.cajon.errorCuenta')
    expect(franja()).toContain('—')
    expect(franja()).not.toContain('inquilinos.cajon.alDia')
    const boton = Array.from(
      container!.querySelector('[data-testid="inquilino-cajon-deuda"]')!.querySelectorAll('button'),
    ).find((b) => (b.textContent ?? '').includes('inquilinos.cajon.reintentar'))
    act(() => boton!.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
  })

  it('con arriendos pero ningún contrato en su estado de cuenta, no afirma un cero: lo dice', () => {
    montar(detalle({ cuenta: cuenta({ contratos: 0 }), refDeCuenta: null }))
    expect(franja()).toContain('inquilinos.cajon.sinEstadoDeCuenta')
    expect(franja()).toContain('—')
    expect(franja()).not.toContain('inquilinos.cajon.alDia')
  })

  it('al día en lo vencido, aunque deba cuotas futuras: la deuda del contrato no es mora', () => {
    montar(detalle({ cuenta: cuenta({ restaPorPagar: 30_000_000, pendiente: 0 }) }))
    expect(franja()).toContain('$30.000.000')
    expect(franja()).toContain('inquilinos.cajon.alDia')
  })

  it('desde el cajón se abre su estado de cuenta, y vuelve a Inquilinos', () => {
    montar(detalle({ refDeCuenta: '1020304050' }))
    const enlace = container!.querySelector('[data-testid="inquilino-cajon-estado-de-cuenta"]')
    expect(enlace?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/estado-de-cuenta/inquilino/1020304050?volver=%2Fpanel%2Finmobiliaria%2Finquilinos',
    )

    // Sin con qué abrirlo, no hay enlace a un 404.
    act(() => root!.render(<CuerpoDelCajon detalle={detalle({ refDeCuenta: null })} />))
    expect(container!.querySelector('[data-testid="inquilino-cajon-estado-de-cuenta"]')).toBeNull()
  })

  it('el error de pagos ofrece reintentar, y reintentar llama al hook', () => {
    const reintentar = vi.fn()
    montar(detalle({ errorPagos: true, reintentar }))
    const boton = Array.from(container!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('inquilinos.cajon.reintentar'),
    )
    expect(boton).toBeDefined()
    act(() => boton!.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
  })

  it('si un contrato no contestó, lo dice en vez de dejar creer que ése es todo el saldo', () => {
    montar(detalle({ cobros: [cobro()], pagosIncompletos: true }))
    expect(texto()).toContain('inquilinos.cajon.pagosIncompletos')
  })

  it('si el detalle de la persona falló, avisa que puede faltar un arriendo terminado', () => {
    montar(detalle({ arriendosIncompletos: true }))
    expect(texto()).toContain('inquilinos.cajon.arriendosIncompletos')
  })

  it('con contratos pero sin cobros, el vacío dice que un cobro es un documento y lleva al estado de cuenta', () => {
    montar(detalle())
    const pagos = container!.querySelector('[data-testid="inquilino-cajon-pagos"]')!
    expect(pagos.textContent).toContain('inquilinos.cajon.sinCobrosTitulo')
    expect(pagos.textContent).toContain('inquilinos.cajon.sinCobros')
    expect(
      Array.from(pagos.querySelectorAll('a')).map((a) => a.getAttribute('href')),
    ).toContain('/panel/inmobiliaria/estado-de-cuenta/inquilino/t1?volver=%2Fpanel%2Finmobiliaria%2Finquilinos')
    // El vacío es el de la casa: círculo gris, no un cartel improvisado.
    expect(pagos.querySelector('[data-testid="empty-state"]')).toBeTruthy()
  })

  it('sin estado de cuenta que abrir, el vacío de cobros cae al contrato', () => {
    montar(detalle({ refDeCuenta: null }))
    const pagos = container!.querySelector('[data-testid="inquilino-cajon-pagos"]')!
    expect(
      Array.from(pagos.querySelectorAll('a')).map((a) => a.getAttribute('href')),
    ).toContain('/panel/inmobiliaria/contratos/c1')
  })

  it('🔴 sin arriendos el cuerpo es UN vacío que dice qué falta y ofrece crear el contrato', () => {
    montar(detalle({ persona: persona({ arriendos: [] }) }))

    expect(texto()).toContain('inquilinos.cajon.sinArriendosTitulo')
    expect(texto()).toContain('inquilinos.cajon.sinContratos')
    expect(texto()).toContain('inquilinos.crearSuContrato')
    expect(enlaces()).toContain(RUTA_MANUAL)

    // Nada de resumir en cero lo que no existe: sin contrato no hay canon ni
    // deuda. Y una segunda sección de cobros vacía sería decir dos veces lo
    // mismo.
    expect(texto()).not.toContain('inquilinos.cajon.canonVigente')
    expect(texto()).not.toContain('inquilinos.cajon.restaPorPagar')
    expect(container!.querySelector('[data-testid="inquilino-cajon-pagos"]')).toBeNull()
  })

  it('🔴 mientras busca sus arriendos terminados NO declara que no tiene ninguno', () => {
    montar(detalle({ persona: persona({ arriendos: [] }), cargandoArriendos: true }))
    expect(texto()).toContain('inquilinos.cajon.cargandoArriendos')
    expect(texto()).not.toContain('inquilinos.cajon.sinArriendosTitulo')
  })

  it('sin arriendos y con el detalle caído, avisa antes de afirmar que no tiene', () => {
    montar(detalle({ persona: persona({ arriendos: [] }), arriendosIncompletos: true }))
    expect(texto()).toContain('inquilinos.cajon.arriendosIncompletos')
  })

  it('con más cobros de los que caben, dice cuántos quedaron y enlaza al contrato', () => {
    const muchos = Array.from({ length: 15 }, (_, i) =>
      cobro({ id: `co${i}`, month: `2026-${String(12 - (i % 12)).padStart(2, '0')}` }),
    )
    montar(detalle({ cobros: muchos }))
    expect(texto()).toContain('inquilinos.cajon.yMasCobros:3')
    expect(texto()).toContain('inquilinos.cajon.verCobrosDelContrato')
  })
})
