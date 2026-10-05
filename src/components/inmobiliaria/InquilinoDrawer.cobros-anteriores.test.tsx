/**
 * QA-INQ-95 (I-09 / F-24, 04-10-2026) · El cajón de Iván listaba los cobros de
 * junio y julio «Pendiente · Saldo $2.350.000» (sin cuota, anteriores a la
 * fecha de cartera 01-08) que «Resta por pagar» no suma. El back los marca
 * `anteriorALaCartera` y la fila lo dice sin pintar un saldo.
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ArriendoDeInquilino, Inquilino } from '@/lib/api/inquilinos.service'
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types'
import type { ResumenDelEstadoDeCuenta } from '@/lib/types/estado-de-cuenta'
import type { DetalleDeInquilino } from '@/lib/hooks/use-inquilino-detalle'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
    locale: 'es',
  }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
const permisosDelCajon = vi.hoisted(() => ({ valor: null as null | { canAccess: (m: string, a: string) => boolean } }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisosDelCajon.valor }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

/* Quién recibe el id: el doble publica lo que le llegó. */
vi.mock('@/components/messages/InterruptorDeWhatsapp', () => ({
  InterruptorDeWhatsapp: ({ personaId }: { personaId?: string | null }) => (
    <div data-testid="interruptor" data-persona={personaId ?? 'NINGUNA'} />
  ),
}))
vi.mock('@/components/messages/BotonEnviarMensaje', () => ({
  BotonEnviarMensaje: ({ counterpartId }: { counterpartId?: string }) => (
    <button type="button" data-testid="enviar-mensaje" data-a={counterpartId} />
  ),
}))

import { CuerpoDelCajon } from './InquilinoDrawer'

const CUENTA = '5b0c8a64-1d1e-4c39-9d0f-3f2b9a1c7e21'

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: null,
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
    tenantId: CUENTA,
    nombre: 'Ana Sofía Restrepo de la Cuesta',
    email: 'ana@correo.co',
    telefono: '3001234567',
    documento: '1020304050',
    arriendos: [arriendo()],
    ...p,
  }
}
function cuenta(p: Partial<ResumenDelEstadoDeCuenta> = {}): ResumenDelEstadoDeCuenta {
  return { restaPorPagar: 0, pendiente: 0, proximaCuota: null, enMora: null, contratos: 1, ...p }
}
function cobro(p: Partial<CobroConDesglose> = {}): CobroConDesglose {
  return {
    id: 'co1', leaseId: 'l1', consignacionId: 'cs1', propertyId: 'i1', propietarioId: 'p1', tenantId: 't1',
    agenteId: 'a1', propertyTitle: 'Apto', propertyAddress: 'Calle', tenantName: 'Ana', tenantEmail: null,
    tenantPhone: null, month: '2026-09', rentAmount: 1_850_000, adminAmount: 0, totalAmount: 1_850_000,
    lateFee: 0, totalWithFees: 1_850_000, status: 'partial', dueDate: '2026-09-05', paidDate: null,
    paidAmount: 1_000_000, pendingAmount: 850_000, daysLate: 0, remindersSent: 0,
    createdAt: '2026-09-01', updatedAt: '2026-09-01',
    ...p,
  } as CobroConDesglose
}
function detalle(p: Partial<DetalleDeInquilino> = {}): DetalleDeInquilino {
  return {
    persona: persona(), cargandoArriendos: false, arriendosIncompletos: false, cobros: [],
    cargandoPagos: false, errorPagos: false, pagosIncompletos: false, cuenta: cuenta(),
    cargandoCuenta: false, errorCuenta: false, refDeCuenta: CUENTA, reintentar: vi.fn(),
    ...p,
  }
}

let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  container = undefined
  root = undefined
})
function montar(d: DetalleDeInquilino, onEditar?: (p: Inquilino) => void) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(<CuerpoDelCajon detalle={d} onEditar={onEditar} />)
  })
}
const q = (sel: string) => container!.querySelector(sel)
const texto = () => container!.textContent ?? ''

describe('I-09 · cobros anteriores a la fecha de cartera', () => {
  it('no pinta su saldo como deuda: dice que es anterior a la cartera', () => {
    montar(
      detalle({
        cobros: [
          cobro({ id: 'oct', month: '2026-10', status: 'paid', paidAmount: 2_350_000, pendingAmount: 0, paidDate: '2026-10-04' }),
          cobro({ id: 'jul', month: '2026-07', status: 'pending', paidAmount: 0, pendingAmount: 2_350_000, anteriorALaCartera: true }),
        ],
      }),
    )
    const filas = [...container!.querySelectorAll('[data-testid="cobro-del-cajon"]')].map((f) => f.textContent ?? '')
    const julio = filas.find((f) => /jul/i.test(f)) ?? ''
    expect(julio).toContain('Antes de la cartera')
    expect(julio).toContain('No se cobra aquí')
    expect(julio).not.toContain('saldoDelCobro')
    expect(julio).not.toContain('inmobiliaria.cobros.status.pending')
  })

  it('un cobro normal pendiente sigue diciendo su saldo', () => {
    montar(detalle({ cobros: [cobro({ id: 'sep', month: '2026-09' })] }))
    const fila = container!.querySelector('[data-testid="cobro-del-cajon"]')?.textContent ?? ''
    expect(fila).toContain('saldoDelCobro')
    expect(fila).not.toContain('Antes de la cartera')
  })
})

describe('E-33 / F-29 · «En cobranza» con más de 60 días en cartera', () => {
  it('con 64 días en cartera la ficha lo marca', () => {
    montar(detalle({ cuenta: cuenta({ pendiente: 4_700_000, enMora: { dias: 64, monto: 4_700_000 } }) }))
    expect(container!.querySelector('[data-testid="inquilino-en-cobranza"]')?.textContent).toContain('En cobranza')
  })

  it('con 60 días o menos, o en plazo, no', () => {
    montar(detalle({ cuenta: cuenta({ pendiente: 2_350_000, enMora: { dias: 60, monto: 2_350_000 } }) }))
    expect(container!.querySelector('[data-testid="inquilino-en-cobranza"]')).toBeNull()
  })
})

describe('F-17 · sin permiso de ver la deuda (coordinador)', () => {
  it('dice que su rol no lo incluye y no ofrece «Reintentar»', () => {
    montar(detalle({ cuenta: null, errorCuenta: true, cuentaSinPermiso: true }))
    expect(container!.querySelector('[data-testid="inquilino-cuenta-sin-permiso"]')?.textContent).toContain('Tu rol no incluye')
    expect(texto()).not.toContain('reintentar')
  })

  it('otro fallo sí ofrece reintentar', () => {
    montar(detalle({ cuenta: null, errorCuenta: true }))
    expect(container!.querySelector('[data-testid="inquilino-cuenta-sin-permiso"]')).toBeNull()
    expect(texto()).toContain('reintentar')
  })
})

describe('E-19 · «Crear su contrato» respeta el permiso', () => {
  it('sin `contratos:create` el vacío de la ficha no ofrece el botón', () => {
    permisosDelCajon.valor = { canAccess: (m: string, a: string) => !(m === 'contratos' && a === 'create') }
    montar(detalle({ persona: persona({ arriendos: [] }) }))
    expect(texto()).not.toContain('inquilinos.crearSuContrato')
    permisosDelCajon.valor = null
  })
})
