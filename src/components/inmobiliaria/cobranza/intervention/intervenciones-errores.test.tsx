/**
 * Intervenciones manuales: qué se dice cuando no salen (02-10-2026, tanda 2
 * de errores, A6).
 *
 * Antes: «Min 5 characters» (en inglés), el status crudo («409», «500») y,
 * sin red, «Acción fallida — intenta de nuevo». Ahora el motivo se ataja
 * debajo de su campo, un 400 con `campos` va a su campo y le da el foco, una
 * valla legal dice cuál, un 5xx «de nuestro lado» con la referencia y la
 * conexión SÓLO si el `fetch` no salió.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { agentFetchMock } = vi.hoisted(() => ({ agentFetchMock: vi.fn() }))

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: (...a: unknown[]) => agentFetchMock(...a),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1' } }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => ({ canAccess: () => true, isAdmin: true }),
}))
// El diálogo de Radix va a un portal con su trampa de foco; acá alcanza con
// pintar el contenido en el lugar.
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

import { PauseModal } from './PauseModal'
import { ManualCallModal } from './ManualCallModal'

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
}

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  agentFetchMock.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function escribir(el: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function boton(texto: string): HTMLButtonElement {
  const b = [...contenedor.querySelectorAll('button')].find((x) => x.textContent?.includes(texto))
  if (!b) throw new Error(`No hay botón «${texto}»`)
  return b as HTMLButtonElement
}

async function montarPausa() {
  await act(async () => {
    root.render(
      <PauseModal open onClose={vi.fn()} debtorId="deudor-1" debtorName="Ana" onSuccess={vi.fn()} />,
    )
  })
  return contenedor.querySelector<HTMLTextAreaElement>('#pausa-motivo')!
}

async function confirmarPausa() {
  await act(async () => {
    boton('inmobiliaria.ai.cobranza.detail.acciones.pause.confirm').click()
  })
}

describe('Pausar la cobranza', () => {
  it('un motivo corto se ataja debajo del campo, en español y con el foco (no «Min 5 characters»)', async () => {
    const motivo = await montarPausa()
    await escribir(motivo, 'no')
    await confirmarPausa()
    expect(agentFetchMock).not.toHaveBeenCalled()
    expect(contenedor.querySelector('#pausa-motivo-error')?.textContent).toBe(
      'Escribe el motivo: al menos 5 caracteres.',
    )
    expect(motivo.getAttribute('aria-describedby')).toBe('pausa-motivo-error')
    expect(document.activeElement).toBe(motivo)
    expect(contenedor.textContent).not.toContain('Min 5 characters')
  })

  it('un 400 con `campos` pinta el error en su campo y le da el foco', async () => {
    agentFetchMock.mockResolvedValue(
      json(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El motivo puede tener hasta 500 caracteres.'],
        campos: [{ campo: 'reason', regla: 'longitud_maxima', mensaje: 'El motivo puede tener hasta 500 caracteres.' }],
      }),
    )
    const motivo = await montarPausa()
    await escribir(motivo, 'El deudor pidió una semana para pagar.')
    await confirmarPausa()
    expect(contenedor.querySelector('#pausa-motivo-error')?.textContent).toBe(
      'El motivo puede tener hasta 500 caracteres.',
    )
    expect(document.activeElement).toBe(motivo)
    expect(contenedor.querySelector('[data-testid="intervencion-error"]')).toBeNull()
  })

  it('un 5xx dice «de nuestro lado» con la referencia, no «500»', async () => {
    agentFetchMock.mockResolvedValue(
      json(500, { error: 'Audit log write failed — pause not applied', requestId: '1234abcd-0000-4000-8000-000000000000' }),
    )
    const motivo = await montarPausa()
    await escribir(motivo, 'El deudor pidió una semana para pagar.')
    await confirmarPausa()
    const alerta = contenedor.querySelector('[data-testid="intervencion-error"]')?.textContent ?? ''
    expect(alerta).toContain('No pudimos pausar la cobranza: algo falló de nuestro lado')
    expect(alerta).toContain('1234abcd')
    expect(alerta).not.toMatch(/^500$|Audit log/)
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    agentFetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const motivo = await montarPausa()
    await escribir(motivo, 'El deudor pidió una semana para pagar.')
    await confirmarPausa()
    expect(contenedor.querySelector('[data-testid="intervencion-error"]')?.textContent).toMatch(
      /conexi[oó]n/i,
    )
  })
})

describe('Llamada manual', () => {
  it('una valla legal (409) dice cuál, no «409»', async () => {
    agentFetchMock.mockResolvedValue(
      json(409, {
        error:
          'Fuera del horario que permite la Ley 2300 (lunes a viernes 7:00–19:00, sábados 8:00–15:00, hora de Bogotá). La llamada no se hizo.',
        valla: 'horario',
        motivo: 'outside_window',
      }),
    )
    await act(async () => {
      root.render(<ManualCallModal open onClose={vi.fn()} debtorId="deudor-1" debtorName="Ana" onSuccess={vi.fn()} />)
    })
    await escribir(contenedor.querySelector<HTMLTextAreaElement>('#llamada-manual-motivo')!, 'Llamar para confirmar el pago.')
    await act(async () => {
      boton('inmobiliaria.ai.cobranza.detail.acciones.manualCall.confirm').click()
    })
    const alerta = contenedor.querySelector('[data-testid="intervencion-error"]')?.textContent ?? ''
    expect(alerta).toContain('Fuera del horario que permite la Ley 2300')
    expect(alerta).not.toBe('409')
  })

  it('un 404 (sin teléfono) lo dice en español, no el inglés del micro', async () => {
    agentFetchMock.mockResolvedValue(json(404, { error: 'Debtor has no phone — cannot place manual call' }))
    await act(async () => {
      root.render(<ManualCallModal open onClose={vi.fn()} debtorId="deudor-1" debtorName="Ana" onSuccess={vi.fn()} />)
    })
    await escribir(contenedor.querySelector<HTMLTextAreaElement>('#llamada-manual-motivo')!, 'Llamar para confirmar el pago.')
    await act(async () => {
      boton('inmobiliaria.ai.cobranza.detail.acciones.manualCall.confirm').click()
    })
    const alerta = contenedor.querySelector('[data-testid="intervencion-error"]')?.textContent ?? ''
    expect(alerta).toBe('No encontramos a este deudor o no tiene un teléfono registrado.')
  })
})
