/**
 * QA-CONT CR-31 (SEGUIMIENTO-FRONT, 03-10-2026; back 2a681c93): con la
 * inmobiliaria SIN sus días de plazo fijados no corre interés (Nico, J-13). El
 * resumen trae `plazoSinFijar`; el cajón lo dice con el camino para fijarlos, y
 * no dice «sin reglas de mora» (lo que falta es otra cosa). Preparación copiada
 * de `InquilinoDrawer.qa-inq.test.tsx`.
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
const franja = () => q('[data-testid="inquilino-cajon-deuda"]')?.textContent ?? ''

describe('CR-31 · plazo sin fijar', () => {
  it('🔴 en cartera y sin plazo fijado: lo avisa con «Fijar los días de plazo», no con las reglas de mora', () => {
    montar(
      detalle({
        cuenta: cuenta({ pendiente: 1_000_000, enMora: { dias: 20, monto: 1_000_000 }, sinReglasDeMora: true, plazoSinFijar: true }),
      }),
    )
    const aviso = q('[data-testid="inquilino-plazo-sin-fijar"]')!
    expect(aviso.textContent).toContain('inquilinos.cajon.plazoSinFijar')
    expect(aviso.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')
    expect(q('[data-testid="inquilino-sin-reglas-de-mora"]')).toBeNull()
  })

  it('con el plazo fijado no hay aviso de plazo', () => {
    montar(detalle({ cuenta: cuenta({ enMora: { dias: 20, monto: 1 }, pendiente: 1, plazoSinFijar: false }) }))
    expect(q('[data-testid="inquilino-plazo-sin-fijar"]')).toBeNull()
  })
})
