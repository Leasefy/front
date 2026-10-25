/**
 * CompromisosTab — lo que el deudor tiene comprometido.
 *
 * Reglas que se protegen acá:
 *  · la promesa de pago EXISTE en la pestaña (faltaba entera: 46/46 deudores
 *    con promesa veían «Sin compromisos»)
 *  · la promesa abierta ya vencida lo dice con todas las letras y en rojo
 *  · nada de slugs crudos ni montos sin formato
 *  · la promesa nacida en una llamada la enlaza (cajón)
 *  · vacío → explica qué aparecería acá
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { compromisosMock, historialMock } = vi.hoisted(() => ({
  compromisosMock: vi.fn(),
  historialMock: vi.fn(async () => ({ historial: [] as unknown[] })),
}))

vi.mock('@/lib/api/cobranza-manual.service', () => ({
  cobranzaManualApi: { historial: (...a: unknown[]) => historialMock(...(a as [])) },
}))

vi.mock('@/lib/hooks/cobranza/use-debtor-compromisos', () => ({
  useDebtorCompromisos: () => compromisosMock(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/components/ui', () => ({
  // Reenvía las props al <button>: «Ver la llamada donde la hizo» pasó a ser un
  // <Button> del DS y el test lo busca por `data-testid` y lo clickea.
  Button: ({
    children,
    hideArrow: _hideArrow,
    isLoading: _isLoading,
    ...props
  }: React.ComponentProps<'button'> & { hideArrow?: boolean; isLoading?: boolean }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/inmobiliaria/cobranza/LlamadaDetalleSheet', () => ({
  LlamadaDetalleSheet: ({ callId }: { callId: string | null }) =>
    callId ? <div data-testid="cajon-llamada">{callId}</div> : null,
}))

import { CompromisosTab } from './CompromisosTab'

const PROMESA_VENCIDA = {
  id: 'ptp-1',
  status: 'open',
  amount_cop: 1_950_000,
  due_date: '2026-01-15T00:00:00.000Z',
  channel: 'voice',
  conditions: null,
  call_id: 'call-7',
  created_at: '2026-01-06T09:30:00.000Z',
  resolved_at: null,
}

const CARTA = {
  id: 'carta-1',
  kind: 'pre_judicial_letter',
  status: 'pending_human_review',
  generated_at: '2026-08-10T00:00:00.000Z',
  approved_at: null,
  sent_at: null,
  physical_send_method: null,
}

function conDatos(extra?: Partial<Record<'paymentPromises' | 'paymentPlans' | 'insuranceClaims' | 'legalArtifacts', unknown[]>>) {
  compromisosMock.mockReturnValue({
    data: {
      paymentPromises: extra?.paymentPromises ?? [],
      paymentPlans: extra?.paymentPlans ?? [],
      insuranceClaims: extra?.insuranceClaims ?? [],
      legalArtifacts: extra?.legalArtifacts ?? [],
      generatedAt: '2026-08-25T00:00:00.000Z',
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render() {
  act(() => {
    root.render(<CompromisosTab debtorId="deudor-1" />)
  })
}

describe('CompromisosTab', () => {
  it('la promesa abierta y vencida se muestra formateada, etiquetada y en rojo', () => {
    conDatos({ paymentPromises: [PROMESA_VENCIDA] })
    render()

    expect(container.textContent).toContain('Promesas de pago')
    expect(container.textContent).toContain('1.950.000')
    expect(container.textContent).toContain('Abierta')
    expect(container.textContent).toContain('vencida hace')
    expect(container.textContent).toContain('por Voz')
    expect(container.textContent).not.toContain('open')
  })

  it('la promesa nacida en una llamada la enlaza y abre el cajón', () => {
    conDatos({ paymentPromises: [PROMESA_VENCIDA] })
    render()

    const enlace = container.querySelector('[data-testid="compromiso-ver-llamada-ptp-1"]')
    expect(enlace).not.toBeNull()
    act(() => {
      ;(enlace as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="cajon-llamada"]')?.textContent).toBe('call-7')
  })

  it('las cartas van con tipo y estado en palabras, no slugs', () => {
    conDatos({ legalArtifacts: [CARTA] })
    render()

    expect(container.textContent).toContain('Carta prejurídica')
    expect(container.textContent).toContain('Espera tu aprobación')
    expect(container.textContent).not.toContain('pre_judicial_letter')
    expect(container.textContent).not.toContain('pending_human_review')
  })

  it('vacío → explica qué aparecería aquí', () => {
    conDatos()
    render()

    expect(container.textContent).toContain('inmobiliaria.ai.cobranza.detail.compromisos.empty')
    expect(container.textContent).toContain('promesas de pago')
  })
})

// QA-AGENTES 16-10 (lab): la promesa que registró el EQUIPO (gestión del back)
// no salía acá: «Sin compromisos registrados» con una promesa pendiente.
describe('las promesas que registró el equipo', () => {
  it('salen en la pestaña aunque el agente no tenga ninguna', async () => {
    conDatos()
    historialMock.mockResolvedValueOnce({
      historial: [
        {
          id: 'g1',
          origen: 'equipo',
          cuando: '2026-10-16T13:43:00.000Z',
          tipo: 'LLAMADA',
          tipoTexto: 'Llamada',
          resultado: 'PROMETIO_PAGAR',
          resultadoTexto: 'Prometió pagar',
          comentario: null,
          quien: 'Ana Administradora Lab',
          promesa: { fecha: '2026-10-19', montoCop: 1_400_000, estado: 'PENDIENTE', abonadoCop: 0, faltaCop: 1_400_000 },
        },
        { id: 'g2', origen: 'equipo', cuando: '2026-10-16T13:00:00.000Z', tipo: 'NOTA', tipoTexto: 'Nota', resultado: null, resultadoTexto: null, comentario: 'x', quien: 'Ana', promesa: null },
      ],
    })
    render()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    const t = container.textContent ?? ''
    expect(t).toContain('Promesas que registró tu equipo')
    expect(t).toContain('19 de octubre de 2026')
    expect(t).toContain('Pendiente')
    expect(t).not.toContain('inmobiliaria.ai.cobranza.detail.compromisos.empty')
    expect(container.querySelectorAll('[data-testid="compromisos-del-equipo"] li')).toHaveLength(1)
  })
})
