/**
 * MemosTab — la memoria del caso.
 *
 * Reglas que se protegen acá:
 *  · el memo del agente y la nota del equipo se distinguen a la vista
 *  · nada de slugs crudos: desenlace por vocabulario, emoción etiquetada,
 *    promesa con COP y fecha
 *  · la objeción literal viaja textual y el memo con llamada la enlaza
 *  · guardar una nota hace POST al agente y refresca la lista
 *  · 403 (VIEWER) → mensaje honesto, no un error críptico
 *  · vacío → explica POR QUÉ (el memo lo escribe el workflow post-llamada)
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { memosMock, fetchMock } = vi.hoisted(() => ({
  memosMock: vi.fn(),
  fetchMock: vi.fn(),
}))

vi.mock('@/lib/hooks/cobranza/use-debtor-memos', () => ({
  useDebtorMemos: () => memosMock(),
}))

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: (...args: unknown[]) => fetchMock(...args),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1' } }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
    <button type={(rest.type as 'submit' | 'button') ?? 'button'} disabled={Boolean(rest.disabled)}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/inmobiliaria/cobranza/LlamadaDetalleSheet', () => ({
  LlamadaDetalleSheet: ({ callId }: { callId: string | null }) =>
    callId ? <div data-testid="cajon-llamada">{callId}</div> : null,
}))

import { MemosTab } from './MemosTab'

const MEMO_AGENTE = {
  id: 'memo-1',
  body: 'El deudor confirma identidad y promete pagar.',
  last_outcome: 'no_resolution',
  last_emotional_state: 'cooperative',
  last_objection_literal: 'No tengo plata este mes',
  open_ptp_amount_cop: 1_850_000,
  open_ptp_date: '2026-08-27T00:00:00.000Z',
  call_id: 'call-9',
  created_at: '2026-08-25T15:00:00.000Z',
}

const NOTA_EQUIPO = {
  id: 'memo-2',
  body: 'Habló al fijo: promete pagar el viernes.',
  last_outcome: 'manual_note',
  last_emotional_state: null,
  last_objection_literal: null,
  open_ptp_amount_cop: null,
  open_ptp_date: null,
  call_id: null,
  created_at: '2026-08-25T16:00:00.000Z',
}

function conMemos(memos: unknown[], extra?: { isLoading?: boolean; error?: string | null }) {
  memosMock.mockReturnValue({
    data: { memos, nextCursor: null, generatedAt: '2026-08-25T00:00:00.000Z' },
    isLoading: extra?.isLoading ?? false,
    error: extra?.error ?? null,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  // Sin esta env `guardarNota` retorna temprano y el POST jamás sale.
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://agent.test')
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
  vi.unstubAllEnvs()
})

function render() {
  act(() => {
    root.render(<MemosTab debtorId="deudor-1" />)
  })
}

async function escribirYGuardar(texto: string) {
  const area = container.querySelector('textarea') as HTMLTextAreaElement
  // React 18: el setter nativo + evento input para que onChange dispare.
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  )?.set
  act(() => {
    setter?.call(area, texto)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const form = container.querySelector('form') as HTMLFormElement
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('MemosTab', () => {
  it('distingue memo del agente y nota del equipo, sin slugs crudos', () => {
    conMemos([MEMO_AGENTE, NOTA_EQUIPO])
    render()

    expect(container.textContent).toContain('Memo del agente')
    expect(container.textContent).toContain('Nota del equipo')
    // Desenlace por vocabulario y emoción etiquetada — nunca el slug.
    expect(container.textContent).toContain('Sin acuerdo')
    expect(container.textContent).toContain('Cooperativo')
    expect(container.textContent).not.toContain('no_resolution')
    expect(container.textContent).not.toContain('manual_note')
    // Objeción textual + promesa formateada.
    expect(container.textContent).toContain('«No tengo plata este mes»')
    expect(container.textContent).toContain('1.850.000')
  })

  it('el memo con llamada la enlaza y abre el cajón; la nota manual no', () => {
    conMemos([MEMO_AGENTE, NOTA_EQUIPO])
    render()

    const enlaces = container.querySelectorAll('[data-testid^="memo-ver-llamada-"]')
    expect(enlaces.length).toBe(1)
    act(() => {
      ;(enlaces[0] as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="cajon-llamada"]')?.textContent).toBe('call-9')
  })

  it('guardar una nota hace POST al agente y refresca la lista', async () => {
    conMemos([])
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => NOTA_EQUIPO })
    render()

    await escribirYGuardar('Habló al fijo: promete pagar el viernes.')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/cobranza/debtors/deudor-1/memos')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      body: 'Habló al fijo: promete pagar el viernes.',
    })
    expect(memosMock.mock.results.at(-1)?.value.refetch).toHaveBeenCalled()
  })

  it('403 → mensaje honesto de rol, no un error críptico', async () => {
    conMemos([])
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) })
    render()

    await escribirYGuardar('nota')

    expect(container.textContent).toContain('Tu rol no puede escribir notas.')
  })

  it('vacío → explica por qué, y el formulario de nota sigue disponible', () => {
    conMemos([])
    render()

    expect(container.textContent).toContain('inmobiliaria.ai.cobranza.detail.memos.empty')
    expect(container.textContent).toContain('después de cada llamada')
    expect(container.querySelector('[data-testid="memo-nota-form"]')).not.toBeNull()
  })
})
