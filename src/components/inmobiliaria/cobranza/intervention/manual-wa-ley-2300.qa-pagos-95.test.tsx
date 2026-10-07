/**
 * 🔴 CB-10 (QA-PAGOS-95 r2, 06-10-2026): el WhatsApp manual.
 *
 * Antes: «Enviar» se podía apretar con los datos del mensaje vacíos («Hola ,
 * debes $»), al mandar el modal se cerraba sin decir nada, y el micro no
 * miraba la Ley 2300. Decisiones de Nico para el clic de una persona: fuera del
 * horario se avisa y se deja mandar con «¿mandarlo igual?»; el opt-out del
 * canal se bloquea siempre, con su frase.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { agentFetchMock, toastOk } = vi.hoisted(() => ({ agentFetchMock: vi.fn(), toastOk: vi.fn() }))

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: (...a: unknown[]) => agentFetchMock(...a),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1', name: 'Inmobiliaria QA' } }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: (...a: unknown[]) => toastOk(...a), error: vi.fn() },
}))
vi.mock('@/components/ui/dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    Dialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    DialogContent: Pasa,
    DialogHeader: Pasa,
    DialogTitle: Pasa,
    DialogDescription: Pasa,
    DialogFooter: Pasa,
  }
})

import { ManualWAModal, variablesVacias } from './ManualWAModal'

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
}

const PLANTILLAS = {
  templates: [
    { id: 'reminder_soft_co', label: 'Recordatorio amable', variables: ['deudor', 'monto'], body: 'Hola {deudor}, debes {monto}.' },
  ],
}

let contenedor: HTMLDivElement
let root: Root
const onSuccess = vi.fn()

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  agentFetchMock.mockReset()
  toastOk.mockReset()
  onSuccess.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar(prefill: Record<string, string> = {}) {
  await act(async () => {
    root.render(
      <ManualWAModal open onClose={vi.fn()} debtorId="deudor-1" debtorName="Ana Pérez" prefill={prefill} onSuccess={onSuccess} />,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const enviar = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="wa-enviar"]')!

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

/** Las llamadas al envío (la primera llamada es la lista de plantillas). */
const envios = () => agentFetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/wa-send'))

describe('🔴 CB-10: el WhatsApp manual', () => {
  it('variablesVacias dice cuáles faltan (espacios cuentan como vacío)', () => {
    expect(variablesVacias(['deudor', 'monto'], { deudor: 'Ana', monto: '  ' })).toEqual(['monto'])
  })

  it('🔴 con un dato del mensaje vacío, «Enviar» está apagado y lo dice', async () => {
    agentFetchMock.mockResolvedValueOnce(json(200, PLANTILLAS))
    await montar({ monto: '' })
    expect(enviar().disabled).toBe(true)
    expect(contenedor.querySelector('[data-testid="wa-faltan-datos"]')?.textContent).toContain('Falta 1 dato del mensaje')
    expect(envios()).toHaveLength(0)
  })

  it('🔴 al mandar, avisa con un toast (y si es simulado, lo dice)', async () => {
    agentFetchMock.mockResolvedValueOnce(json(200, PLANTILLAS)).mockResolvedValueOnce(json(200, { ok: true, providerMessageId: null, simulado: true }))
    await montar({ monto: '$ 1.500.000' })
    expect(enviar().disabled).toBe(false)
    await clic(enviar())
    expect(envios()).toHaveLength(1)
    expect(toastOk).toHaveBeenCalledWith(expect.stringContaining('simulado'))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('🔴 fuera del horario: pregunta «¿mandarlo igual?» y sólo con «Mandarlo igual» lo reenvía confirmado', async () => {
    agentFetchMock
      .mockResolvedValueOnce(json(200, PLANTILLAS))
      .mockResolvedValueOnce(
        json(409, {
          statusCode: 409,
          code: 'FUERA_DEL_HORARIO_DE_LEY',
          message: 'Estás fuera del horario de ley; ¿mandarlo igual? No salió nada: confírmalo para mandarlo.',
          error: 'Estás fuera del horario de ley; ¿mandarlo igual? No salió nada: confírmalo para mandarlo.',
          valla: 'horario',
          motivo: 'outside_hours',
        }),
      )
      .mockResolvedValueOnce(json(200, { ok: true, providerMessageId: 'wamid.1' }))
    await montar({ monto: '$ 1.500.000' })
    await clic(enviar())
    const caja = contenedor.querySelector('[data-testid="wa-confirmar"]')
    expect(caja?.textContent).toContain('Estás fuera del horario de ley; ¿mandarlo igual?')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(enviar().disabled).toBe(true)
    await clic(contenedor.querySelector<HTMLButtonElement>('[data-testid="wa-mandar-igual"]')!)
    expect(envios()).toHaveLength(2)
    expect(JSON.parse(String(envios()[1][1].body))).toMatchObject({ fueraDelHorarioConfirmado: true })
    expect(toastOk).toHaveBeenCalledWith('WhatsApp enviado a Ana Pérez.')
  })

  it('🔴 opt-out del canal: dice la frase y NO ofrece mandarlo igual', async () => {
    agentFetchMock.mockResolvedValueOnce(json(200, PLANTILLAS)).mockResolvedValueOnce(
      json(409, {
        statusCode: 409,
        code: 'VALLA_OPT_OUT',
        message: 'Este deudor pidió que no le escribieran por WhatsApp. El mensaje no salió.',
        error: 'Este deudor pidió que no le escribieran por WhatsApp. El mensaje no salió.',
        valla: 'opt_out',
        motivo: 'channel_listed_in_debtor_row',
      }),
    )
    await montar({ monto: '$ 1.500.000' })
    await clic(enviar())
    expect(contenedor.querySelector('[data-testid="intervencion-error"]')?.textContent).toContain('no le escribieran por WhatsApp')
    expect(contenedor.querySelector('[data-testid="wa-mandar-igual"]')).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(toastOk).not.toHaveBeenCalled()
  })
})
