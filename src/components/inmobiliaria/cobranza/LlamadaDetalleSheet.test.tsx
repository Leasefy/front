/**
 * LlamadaDetalleSheet — el detalle de una llamada en cajón.
 *
 * Reglas que se protegen acá:
 *  · callId null → no se monta nada (el cajón vive cerrado)
 *  · con datos → cabecera enmascarada + QA + los paneles reales del detalle
 *  · el pie SIEMPRE enlaza la página completa (ahí vive el PDF)
 *  · error → aviso con reintento, nunca un cajón vacío en silencio
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { detalleMock } = vi.hoisted(() => ({ detalleMock: vi.fn() }))

vi.mock('@/lib/hooks/cobranza/use-call-detail', () => ({
  useCallDetail: (args: { callId: string }) => detalleMock(args),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1' } }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/inmobiliaria/cobranza/call/CallAudioPlayer', () => ({
  default: () => <div data-testid="panel-audio" />,
}))
vi.mock('@/components/inmobiliaria/cobranza/call/CallTranscript', () => ({
  default: () => <div data-testid="panel-transcript" />,
}))
vi.mock('@/components/inmobiliaria/cobranza/call/CallQAPanel', () => ({
  default: () => <div data-testid="panel-qa" />,
}))
vi.mock('@/components/inmobiliaria/cobranza/call/CallSummaryPanel', () => ({
  default: () => <div data-testid="panel-summary" />,
}))
vi.mock('@/components/inmobiliaria/cobranza/call/CallStateTracePanel', () => ({
  default: () => <div data-testid="panel-trace" />,
}))

import { LlamadaDetalleSheet } from './LlamadaDetalleSheet'

const DETALLE = {
  id: 'call-1',
  debtorId: 'deudor-1',
  debtorNameMasked: 'Ni•••ila',
  debtorCedulaMasked: '10•••567',
  direction: 'outbound',
  channel: 'voice',
  status: 'completed',
  outcome: 'completed',
  initiatedAt: '2026-08-24T12:00:00.000Z',
  startedAt: '2026-08-24T12:00:05.000Z',
  endedAt: '2026-08-24T12:01:00.000Z',
  durationSeconds: 55,
  qa: {
    overall: 72,
    empatia: 4,
    claridad: 4,
    adherencia: 3,
    objeciones: 3,
    compliance: true,
    violations: [],
    quality: 72,
  },
  complianceEvents: [],
  summary: null,
  hasRecording: true,
  hasTranscript: true,
  stateTrace: [],
  cost: { llmUsd: 0, voiceUsd: 0, platformUsd: 0, whatsappUsd: 0, totalUsd: 0 },
  generatedAt: '2026-08-25T00:00:00.000Z',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  detalleMock.mockReturnValue({ data: DETALLE, isLoading: false, error: null, refetch: vi.fn() })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render(callId: string | null) {
  act(() => {
    root.render(<LlamadaDetalleSheet callId={callId} onClose={() => {}} />)
  })
}

describe('LlamadaDetalleSheet', () => {
  it('cerrado (callId null) no monta nada — ni siquiera dispara el fetch', () => {
    render(null)
    expect(container.querySelector('[data-testid="sheet"]')).toBeNull()
    expect(detalleMock).not.toHaveBeenCalled()
  })

  it('con datos: cabecera enmascarada + QA + los paneles reales del detalle', () => {
    render('call-1')

    expect(container.textContent).toContain('Ni•••ila')
    expect(container.textContent).toContain('QA 72/100')
    for (const panel of ['panel-audio', 'panel-summary', 'panel-qa', 'panel-transcript', 'panel-trace']) {
      expect(container.querySelector(`[data-testid="${panel}"]`), panel).not.toBeNull()
    }
  })

  it('el pie enlaza la página completa de la llamada', () => {
    render('call-1')
    const enlaces = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(enlaces).toContain('/panel/inmobiliaria/ai/cobranza/llamadas/call-1')
  })

  it('error → aviso con reintento, nunca un cajón vacío en silencio', () => {
    detalleMock.mockReturnValue({ data: null, isLoading: false, error: 'HTTP 500', refetch: vi.fn() })
    render('call-1')

    const alerta = container.querySelector('[role="alert"]')
    expect(alerta).not.toBeNull()
    expect(alerta?.textContent).toContain('HTTP 500')
    expect(container.textContent).toContain('inmobiliaria.ai.cobranza.call.errorRetry')
  })
})
