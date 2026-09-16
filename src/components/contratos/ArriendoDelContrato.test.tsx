/**
 * El bloque del arriendo (Nico, 2026-09-16: «esto debe verse más unificado…
 * no uses ese tono verde… que se entienda mejor cuando uno lo vaya a leer»).
 *
 * Se prueba con los datos de la ficha que Nico estaba mirando: canon
 * $1.650.000, del 21-ago-2025 al 20-ago-2027, paga el 21 con 2 días de plazo,
 * $19.214.516 por pagar. Y con el MISMO contrato en los tres estados de la
 * deuda, moviendo sólo el día de hoy.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { Contract } from '@/lib/types/contract'
import type { ContratoDelEstadoDeCuenta, FilaDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta'
import type { UsoDeLaCuenta } from '@/lib/hooks/use-cuenta-del-contrato'
import { vigenciaDelContrato } from '@/lib/contratos/vigencia'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { uso } = vi.hoisted(() => ({
  uso: { valor: null as unknown as UsoDeLaCuenta },
}))

vi.mock('@/lib/hooks/use-cuenta-del-contrato', () => ({
  useCuentaDelContrato: () => uso.valor,
}))

import { ArriendoDelContrato, AvisoDelContrato } from './ArriendoDelContrato'

// ── Datos ────────────────────────────────────────────────────────────────────

function contrato(p: Partial<Contract> = {}): Contract {
  return {
    id: 'c-1686',
    propertyId: 'prop-1',
    tenantId: null,
    tenantDocument: '71234567',
    status: 'active',
    monthlyRent: 1_650_000,
    startDate: '2025-08-21T00:00:00.000Z',
    endDate: '2027-08-20T00:00:00.000Z',
    paymentDueDay: 21,
    diasDePlazo: 2,
    ...p,
  } as Contract
}

/** 24 cuotas del 21 de cada mes; pagadas las anteriores a `pagadasHasta`. */
function estadoDeCuenta(pagadasHasta = '2026-09-01'): ContratoDelEstadoDeCuenta {
  const arriendos: FilaDelEstadoDeCuenta[] = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 7 + i, 21))
    const fecha = d.toISOString().slice(0, 10)
    const pagada = fecha < pagadasHasta
    return {
      concepto: `Arriendo ${fecha}`,
      estado: pagada ? 'CANCELADA' : 'PENDIENTE',
      fechaDePago: pagada ? fecha : null,
      valorBruto: 1_650_000,
      iva: 0,
      retencion: 0,
      reteIva: 0,
      reteIca: 0,
      valorNeto: 1_650_000,
      fechaVencimiento: fecha,
      documentoDePago: null,
      parcial: false,
      cuotaId: `q-${i}`,
    }
  })
  return {
    id: 'c-1686',
    numero: '1686',
    rol: 'INQUILINO',
    inmueble: { direccion: 'Cra 76 # 32-11' },
    vigente: true,
    secciones: { arriendos, otrosConceptos: [] },
    // El número del back (canon + administración + impuestos), tal cual.
    totales: { cancelado: 21_450_000, pendiente: 0, restaPorPagar: 19_214_516 },
    cortes: [],
  }
}

function listo(extra: Partial<UsoDeLaCuenta> = {}): UsoDeLaCuenta {
  return {
    cuenta: { estado: 'listo', contrato: estadoDeCuenta(), tenantRef: '71234567' },
    agencia: null,
    esperandoAgencia: false,
    reintentar: vi.fn(),
    ...extra,
  }
}

// ── Montaje ──────────────────────────────────────────────────────────────────

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  uso.valor = listo()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function pintar(c: Contract, hoy: string, props: Partial<React.ComponentProps<typeof ArriendoDelContrato>> = {}) {
  const vigencia = vigenciaDelContrato(
    { status: c.status, endDate: c.endDate, terminadoEn: c.terminadoEn ?? null },
    new Date(`${hoy}T12:00:00.000Z`),
  )
  await act(async () => {
    root.render(<ArriendoDelContrato contract={c} vigencia={vigencia} hoy={hoy} {...props} />)
  })
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => r(null)))
  })
}

const $ = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)
const texto = (testid: string) => $(testid)?.textContent?.replace(/\s+/g, ' ').trim()

// ── Pruebas ──────────────────────────────────────────────────────────────────

describe('ArriendoDelContrato — un contrato AL DÍA, de arriba abajo', () => {
  beforeEach(async () => {
    await pintar(contrato(), '2026-09-16')
  })

  it('1 · la etapa, en palabras', () => {
    expect(texto('etapa-del-arriendo')).toBe('Arriendo en curso')
  })

  it('2 · cuánto va: «Mes 13 de 24», lo que queda y la línea inicio · hoy · fin', () => {
    expect(texto('avance-titular')).toBe('Mes 13 de 24')
    expect(texto('avance-a-la-derecha')).toBe('Quedan 11 meses')
    expect(texto('fecha-de-inicio')).toBe('21 ago 2025')
    expect(texto('fecha-de-fin')).toBe('20 ago 2027')

    const barra = container.querySelector('[role="progressbar"]')!
    expect(barra.getAttribute('aria-valuemin')).toBe('0')
    expect(barra.getAttribute('aria-valuemax')).toBe('24')
    expect(barra.getAttribute('aria-valuenow')).toBe('13')
    expect(barra.getAttribute('aria-valuetext')).toBe('Mes 13 de 24 · del 21 ago 2025 al 20 ago 2027')
    expect(barra.children).toHaveLength(24)
    expect($('marca-de-hoy')).not.toBeNull()
  })

  it('3 · cuánto paga y cuándo, sin «Día 21 / +2 de plazo»', () => {
    expect(texto('canon-del-arriendo')).toBe('$1.650.000 al mes')
    expect(texto('ritmo-de-pago')).toBe('Paga el 21 de cada mes, con 2 días de plazo.')
    expect(container.textContent).not.toContain('+2 de plazo')
  })

  it('4 · cómo va con la plata, desde el estado de cuenta', () => {
    expect(texto('resta-por-pagar')).toBe('$19.214.516')
    expect(texto('cuotas-pagadas')).toBe('13 de 24 cuotas pagadas')
    expect(texto('proxima-cuota')).toBe('21 sep 2026')
    expect(container.textContent).toContain('$1.650.000 · en 5 días')
    expect($('estado-de-la-deuda')!.getAttribute('data-estado')).toBe('AL_DIA')
    expect(texto('estado-nombre')).toBe('Al día')
    expect(texto('estado-detalle')).toBe('Nada vencido')
  })

  it('4 · el estado de cuenta es la puerta principal, y vuelve a este contrato', () => {
    const puerta = $('ver-estado-de-cuenta') as HTMLAnchorElement
    expect(puerta.textContent).toContain('Ver estado de cuenta')
    expect(puerta.getAttribute('href')).toBe(
      `/panel/inmobiliaria/estado-de-cuenta/inquilino/71234567?volver=${encodeURIComponent('/panel/inmobiliaria/contratos/c-1686')}`,
    )
  })

  it('🔴 una sola forma de escribir las fechas, y ningún verde', () => {
    const bloque = $('arriendo-del-contrato')!
    expect(bloque.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(bloque.innerHTML).not.toMatch(/success/)
  })
})

describe('ArriendoDelContrato — los TRES estados de la deuda', () => {
  it('VENCIDO, EN PLAZO: debe, pero todavía no es cartera', async () => {
    await pintar(contrato(), '2026-09-22')

    expect($('estado-de-la-deuda')!.getAttribute('data-estado')).toBe('VENCIDO_EN_PLAZO')
    expect(texto('estado-nombre')).toBe('Vencido, en plazo')
    expect(texto('estado-detalle')).toBe('$1.650.000 vencido · le queda 1 día de plazo')
    expect(texto('proxima-cuota')).toBe('21 oct 2026')
  })

  it('el último día de plazo se dice así', async () => {
    await pintar(contrato(), '2026-09-23')
    expect(texto('estado-detalle')).toBe('$1.650.000 vencido · hoy es su último día de plazo')
  })

  it('EN CARTERA: pasó el plazo, con los días de mora', async () => {
    await pintar(contrato(), '2026-10-05')

    expect($('estado-de-la-deuda')!.getAttribute('data-estado')).toBe('EN_CARTERA')
    expect(texto('estado-nombre')).toBe('En cartera')
    expect(texto('estado-detalle')).toBe('$1.650.000 en cartera · 12 días de mora')
  })

  it('cartera y algo en plazo a la vez: dice cuánto es cartera y cuánto va vencido en total', async () => {
    uso.valor = listo({
      cuenta: { estado: 'listo', contrato: estadoDeCuenta('2026-08-01'), tenantRef: '71234567' },
    })
    await pintar(contrato(), '2026-09-22')

    expect(texto('estado-nombre')).toBe('En cartera')
    expect(texto('estado-detalle')).toBe('$1.650.000 en cartera · 30 días de mora $3.300.000 vencido en total')
  })

  it('con el plazo heredado todavía por llegar, no afirma ningún estado', async () => {
    uso.valor = listo({ esperandoAgencia: true })
    await pintar(contrato({ diasDePlazo: null }), '2026-09-22')

    expect($('estado-de-la-deuda')).toBeNull()
    expect($('arriendo-del-contrato')!.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })

  it('con el plazo heredado de la inmobiliaria, lo usa y lo dice', async () => {
    uso.valor = listo({ agencia: { diasDePlazo: 5, diaDePago: 5 } })
    await pintar(contrato({ diasDePlazo: null }), '2026-09-25')

    expect(texto('ritmo-de-pago')).toBe('Paga el 21 de cada mes, con 5 días de plazo (los de tu inmobiliaria).')
    // 25-sep con 5 días de plazo sobre el 21: todavía en plazo.
    expect($('estado-de-la-deuda')!.getAttribute('data-estado')).toBe('VENCIDO_EN_PLAZO')
  })

  it('si el plazo heredado no se pudo saber, dice «Vencido» y por qué no dice más', async () => {
    await pintar(contrato({ diasDePlazo: null }), '2026-10-05')

    expect($('estado-de-la-deuda')!.getAttribute('data-estado')).toBe('VENCIDO_SIN_PLAZO')
    expect(texto('estado-nombre')).toBe('Vencido')
    expect(texto('estado-detalle')).toContain('no se sabe si ya es cartera')
  })
})

describe('ArriendoDelContrato — cuando el estado de cuenta no está', () => {
  it('cargando: esqueleto, nunca un cero', async () => {
    uso.valor = listo({ cuenta: { estado: 'cargando' } })
    await pintar(contrato(), '2026-09-16')

    expect($('cuenta-cargando')).not.toBeNull()
    expect($('resta-por-pagar')).toBeNull()
    expect(container.textContent).not.toContain('$0')
  })

  it('fallo: lo dice y deja reintentar', async () => {
    const reintentar = vi.fn()
    uso.valor = listo({ cuenta: { estado: 'fallo', sinPermiso: false }, reintentar })
    await pintar(contrato(), '2026-09-16')

    expect(texto('cuenta-mensaje')).toContain('No se pudo traer el estado de cuenta de este contrato.')
    const boton = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Reintentar'))!
    await act(async () => boton.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('Al día')
  })

  it('sin permiso: lo dice sin ofrecer reintentar', async () => {
    uso.valor = listo({ cuenta: { estado: 'fallo', sinPermiso: true } })
    await pintar(contrato(), '2026-09-16')

    expect(texto('cuenta-mensaje')).toBe('Tu rol no puede ver el estado de cuenta.')
    expect(container.textContent).not.toContain('Reintentar')
  })

  it('sin cuenta ni documento del inquilino, explica por qué no hay estado de cuenta', async () => {
    uso.valor = listo({ cuenta: { estado: 'sin-inquilino' } })
    await pintar(contrato(), '2026-09-16')

    expect(texto('cuenta-mensaje')).toContain('no tiene la cuenta ni el documento del inquilino')
    expect($('ver-estado-de-cuenta')).toBeNull()
  })

  it('un contrato firmado sin activar: el estado de cuenta nace al activarlo', async () => {
    uso.valor = listo({ cuenta: { estado: 'no-aplica' } })
    await pintar(contrato({ status: 'signed' }), '2026-09-16')

    expect(texto('etapa-del-arriendo')).toBe('Firmado, falta activarlo')
    expect(texto('cuenta-mensaje')).toBe(
      'Cuando actives el contrato se arman sus cuotas y nace su estado de cuenta.',
    )
  })
})

describe('ArriendoDelContrato — las otras etapas', () => {
  it('vencido sin renovar: la línea se cumplió y dice hace cuánto', async () => {
    await pintar(contrato({ endDate: '2026-09-13T00:00:00.000Z', startDate: '2025-09-14' }), '2026-09-16', {
      aviso: <div data-testid="aviso-de-prueba" />,
    })

    expect(texto('etapa-del-arriendo')).toBe('Vencido sin renovar')
    expect(texto('avance-titular')).toBe('Se cumplieron los 12 meses')
    expect(texto('avance-a-la-derecha')).toBe('Venció hace 3 días')
    expect($('marca-de-hoy')).toBeNull()
    // El aviso va debajo de la etapa y antes de la línea.
    expect($('aviso-de-prueba')!.compareDocumentPosition($('linea-del-contrato')!) & 4).toBe(4)
  })

  it('terminado antes de tiempo: se dibuja sobre lo pactado y dice en qué mes terminó', async () => {
    await pintar(
      contrato({
        status: 'expired',
        terminadoEn: '2026-09-30',
        endDate: '2026-09-30T00:00:00.000Z',
        finPactadoOriginal: '2027-08-20',
      }),
      '2026-10-10',
    )

    expect(texto('etapa-del-arriendo')).toBe('Terminado antes de tiempo')
    expect(texto('avance-titular')).toBe('Terminó en el mes 14 de 24')
    expect(texto('avance-a-la-derecha')).toBe('El 30 sep 2026')
    expect(container.textContent).toContain('Fin pactado')
  })

  it('por empezar: cuánto falta y cuánto dura', async () => {
    uso.valor = listo({ cuenta: { estado: 'no-aplica' } })
    await pintar(contrato({ status: 'draft', startDate: '2026-10-01', endDate: '2027-09-30' }), '2026-09-16')

    expect(texto('etapa-del-arriendo')).toBe('Contrato por firmar')
    expect(texto('avance-titular')).toBe('Empieza en 15 días')
    expect(texto('avance-a-la-derecha')).toBe('Dura 12 meses')
  })

  it('sin fechas no inventa una línea', async () => {
    await pintar(contrato({ startDate: null, endDate: null }), '2026-09-16')

    expect(container.querySelector('[role="progressbar"]')).toBeNull()
    expect(texto('linea-del-contrato')).toContain('no tiene cargadas sus fechas de inicio y fin')
  })

  it('las acciones van al pie, y sin acciones no hay pie', async () => {
    await pintar(contrato(), '2026-09-16')
    expect($('acciones-del-arriendo')).toBeNull()

    await pintar(contrato(), '2026-09-16', { acciones: <button>Terminar el arriendo</button> })
    expect(texto('acciones-del-arriendo')).toBe('Terminar el arriendo')
  })
})

describe('ArriendoDelContrato — la barra y el movimiento', () => {
  it('con movimiento reducido la barra nace llena y sin transición animada', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) => ({ matches: q.includes('reduce'), media: q }) as MediaQueryList,
    )
    await act(async () => {
      root.render(
        <ArriendoDelContrato
          contract={contrato()}
          vigencia={vigenciaDelContrato({ status: 'active', endDate: '2027-08-20' }, new Date('2026-09-16T12:00:00Z'))}
          hoy="2026-09-16"
        />,
      )
    })

    const tramos = container.querySelectorAll('[role="progressbar"] > div > div')
    expect((tramos[0] as HTMLElement).style.width).toBe('100%')
    expect((tramos[23] as HTMLElement).style.width).toBe('0%')
    // La transición sólo existe bajo `motion-safe:`.
    expect((tramos[0] as HTMLElement).className).not.toMatch(/(^|\s)transition-/)
  })
})

describe('AvisoDelContrato — el tono vive en el círculo, no en la caja', () => {
  it('atención en ámbar, un paso en cobalto; la caja siempre neutra', async () => {
    const principal = vi.fn()
    const secundaria = vi.fn()
    const Icono = () => <svg />
    await act(async () => {
      root.render(
        <>
          <AvisoDelContrato
            tono="atencion"
            icono={Icono}
            titulo="Vencido desde el 13 sep 2026"
            detalle="Pasaron 3 días"
            principal={{ label: 'Renovar contrato', icon: Icono, onClick: principal }}
            secundaria={{ label: 'Terminar el arriendo', icon: Icono, onClick: secundaria }}
          />
          <AvisoDelContrato tono="paso" icono={Icono} titulo="Contrato firmado" detalle="Actívalo" />
        </>,
      )
    })

    const [atencion, paso] = [...container.querySelectorAll('[data-testid="aviso-del-contrato"]')] as HTMLElement[]
    expect(atencion.className).not.toMatch(/bg-(warning|success|primary)/)
    expect(atencion.innerHTML).toContain('bg-warning-soft')
    expect(paso.innerHTML).toContain('bg-primary-soft')
    expect(paso.querySelector('button')).toBeNull()

    const botones = [...atencion.querySelectorAll('button')]
    await act(async () => botones.find((b) => b.textContent?.includes('Renovar'))!.click())
    await act(async () => botones.find((b) => b.textContent?.includes('Terminar'))!.click())
    expect(principal).toHaveBeenCalledTimes(1)
    expect(secundaria).toHaveBeenCalledTimes(1)
  })
})
