/**
 * QA-INQ (03-10-2026) · el cajón del inquilino.
 *
 *  · I-12: el interruptor de WhatsApp y «Enviar mensaje» reciben SÓLO una
 *    cuenta del portal (`User.id`); la identidad sintética `doc:…` daba 400.
 *  · I-22: sin cuenta, el cajón lo DICE («Sin cuenta en el portal»); no invita.
 *  · Un solo encabezado con el nombre (había dos `h2`).
 *  · I-14: el NIT con su dígito de verificación.
 *  · E-09: «Al día» no se dice con intereses de mora sin pagar; sin reglas de
 *    mora, se avisa con el enlace a configurarlas.
 *  · I-10: los cobros en grilla (valor y saldo en su columna, a la derecha).
 *  · I-08 / I-15: número gramatical.
 *  · I-28: las cifras de plata no se cortan con «…».
 *  · E-16: «Editar datos».
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

describe('I-12 / I-22 · lo que habla con una cuenta recibe SÓLO una cuenta', () => {
  it('🔴 con la identidad sintética `doc:…` el interruptor de WhatsApp no recibe nada (era un 400)', () => {
    montar(detalle({ persona: persona({ tenantId: 'doc:1020304050' }) }))
    expect(q('[data-testid="interruptor"]')!.getAttribute('data-persona')).toBe('NINGUNA')
    expect(q('[data-testid="enviar-mensaje"]')).toBeNull()
    expect(q('[data-testid="inquilino-sin-cuenta"]')!.textContent).toContain('inquilinos.cajon.sinCuentaDelPortal')
  })

  it('con cuenta, el interruptor y «Enviar mensaje» reciben su User.id', () => {
    montar(detalle())
    expect(q('[data-testid="interruptor"]')!.getAttribute('data-persona')).toBe(CUENTA)
    expect(q('[data-testid="enviar-mensaje"]')!.getAttribute('data-a')).toBe(CUENTA)
    expect(q('[data-testid="inquilino-sin-cuenta"]')).toBeNull()
  })

  it('🔴 si el back dice que NO tiene cuenta, manda el back aunque el id parezca una cuenta (ficha de tercero)', () => {
    montar(detalle({ persona: persona({ tieneCuentaDelPortal: false }) }))
    expect(q('[data-testid="interruptor"]')!.getAttribute('data-persona')).toBe('NINGUNA')
    expect(q('[data-testid="inquilino-sin-cuenta"]')).not.toBeNull()
  })

  it('I-22: no ofrece «Invitar al portal» (Nico: sólo desde el contrato)', () => {
    montar(detalle({ persona: persona({ tenantId: 'doc:1' }) }))
    expect(texto().toLowerCase()).not.toContain('invitar')
  })
})

describe('la cabecera', () => {
  it('🔴 UN solo encabezado con el nombre: el cuerpo no pinta otro h2 (el accesible es el SheetTitle)', () => {
    montar(detalle())
    expect(container!.querySelectorAll('h2')).toHaveLength(0)
    expect(q('[data-testid="inquilino-cajon-nombre"]')!.textContent).toBe('Ana Sofía Restrepo de la Cuesta')
  })

  it('I-28: el nombre se ajusta en renglones, no se corta con «…»', () => {
    montar(detalle())
    expect(q('[data-testid="inquilino-cajon-nombre"]')!.className).not.toContain('truncate')
  })

  it('🔴 I-14: el NIT se muestra con su dígito de verificación', () => {
    montar(detalle({ persona: persona({ documento: '900777888', tipoDocumento: 'NIT' }) }))
    // 900777888 → DV 2 (algoritmo DIAN). El «-1» con que se cargó en el
    // laboratorio estaba MAL y el back lo descartó en silencio.
    expect(texto()).toContain('900777888-2')
  })

  it('una cédula se muestra tal cual', () => {
    montar(detalle({ persona: persona({ documento: '1020304050', tipoDocumento: 'CC' }) }))
    expect(texto()).toContain('1020304050')
    expect(texto()).not.toContain('1020304050-')
  })

  it('🔴 I-15: «1 arriendo · 0 vigentes», no «0 vigente»', () => {
    montar(detalle({ persona: persona({ arriendos: [arriendo({ estado: 'ENDED' })] }) }))
    expect(texto()).toContain('inquilinos.conteoArriendoUno:inquilinos.tabla.nVigentes:0')
  })

  it('🔴 I-15: «2 arriendos · 1 vigente», no «1 vigentes»', () => {
    montar(
      detalle({
        persona: persona({
          arriendos: [arriendo(), arriendo({ contractId: 'c2', estado: 'ENDED' })],
        }),
      }),
    )
    expect(texto()).toContain('inquilinos.conteoArriendos:2,inquilinos.tabla.nVigentesUno')
  })

  it('E-16: «Editar datos» abre el formulario con esa persona', () => {
    const onEditar = vi.fn()
    montar(detalle(), onEditar)
    act(() => {
      q('[data-testid="inquilino-editar"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onEditar).toHaveBeenCalledWith(expect.objectContaining({ tenantId: CUENTA }))
  })

  it('sin `onEditar` no hay botón', () => {
    montar(detalle())
    expect(q('[data-testid="inquilino-editar"]')).toBeNull()
  })
})

describe('E-09 · intereses de mora y reglas de mora', () => {
  it('🔴 con lo vencido en cero pero intereses sin pagar, NO dice «Al día»', () => {
    montar(detalle({ cuenta: cuenta({ interesDeMora: 42_000 }) }))
    expect(franja()).not.toContain('inquilinos.cajon.alDia')
    expect(franja()).toContain('inquilinos.cajon.interesesSinPagar:$42.000')
  })

  it('sin intereses, sigue diciendo «Al día»', () => {
    montar(detalle({ cuenta: cuenta({ interesDeMora: 0 }) }))
    expect(franja()).toContain('inquilinos.cajon.alDia')
  })

  it('🔴 en cartera y sin reglas de mora, lo avisa con el enlace a configurarlas', () => {
    montar(
      detalle({
        cuenta: cuenta({ pendiente: 1_000_000, enMora: { dias: 20, monto: 1_000_000 }, sinReglasDeMora: true }),
      }),
    )
    const aviso = q('[data-testid="inquilino-sin-reglas-de-mora"]')!
    expect(aviso.textContent).toContain('inquilinos.cajon.sinReglasDeMora')
    expect(aviso.querySelector('a')!.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cartera/reglas-de-mora')
  })

  it('con reglas de mora, no hay aviso', () => {
    montar(detalle({ cuenta: cuenta({ enMora: { dias: 20, monto: 1 }, pendiente: 1, sinReglasDeMora: false }) }))
    expect(q('[data-testid="inquilino-sin-reglas-de-mora"]')).toBeNull()
  })
})

describe('I-10 / I-28 · las cifras', () => {
  it('🔴 cada cobro es una grilla: a la izquierda mes, estado y vencimiento; a la derecha valor y saldo', () => {
    montar(detalle({ cobros: [cobro(), cobro({ id: 'co2', month: '2026-10', status: 'pending', pendingAmount: 1_850_000, paidAmount: 0 })] }))
    const filas = Array.from(container!.querySelectorAll('[data-testid="cobro-del-cajon"]'))
    expect(filas).toHaveLength(2)
    for (const fila of filas) {
      expect(fila.className).toContain('grid')
      const [izquierda, derecha] = Array.from(fila.children)
      expect(izquierda.textContent).toContain('inquilinos.cajon.vencimiento')
      expect(derecha.textContent).toContain('$1.850.000')
      expect(derecha.textContent).toContain('inquilinos.cajon.saldoDelCobro')
      // Valor y saldo alineados a la derecha, en su columna.
      for (const cifra of Array.from(derecha.children)) {
        if (cifra.textContent) expect(cifra.className).toContain('text-right')
      }
    }
  })

  it('🔴 las tres cifras de plata no se cortan con «…»', () => {
    montar(detalle({ cuenta: cuenta({ restaPorPagar: 39_600_000, pendiente: 9_250_000 }) }))
    const cifras = Array.from(container!.querySelectorAll('[data-testid="inquilino-cajon-deuda"] dd'))
    expect(cifras.length).toBeGreaterThanOrEqual(3)
    for (const dd of cifras) expect(dd.className).not.toContain('truncate')
  })

  it('🔴 I-08: «y 1 cobro más», «1 recordatorio»', () => {
    const muchos = Array.from({ length: 13 }, (_, i) =>
      cobro({ id: `co${i}`, month: `2026-${String((i % 12) + 1).padStart(2, '0')}`, remindersSent: i === 0 ? 1 : 0, lastReminderDate: i === 0 ? '2026-09-10' : null } as Partial<CobroConDesglose>),
    )
    montar(detalle({ cobros: muchos }))
    expect(texto()).toContain('inquilinos.cajon.yMasCobrosUno')
    expect(texto()).toContain('inquilinos.cajon.recordatoriosUno:2026-09-10')
  })
})
