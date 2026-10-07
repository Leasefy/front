import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · La solicitud ARCO con el sistema de errores. Antes todo lo que
 * no era un 429 decía el mismo «no pudimos enviar» (también un dato mal
 * escrito o la red caída). Ahora: el dato se ataja antes con la frase del
 * micro, un 400 va a su campo con el foco, un 5xx dice «de nuestro lado» con
 * la referencia y sólo la falta de respuesta habla de la conexión.
 */

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

vi.mock('@/components/ui/select', () => {
  const Ctx = React.createContext<(v: string) => void>(() => undefined)
  return {
    Select: ({ onValueChange, children }: { onValueChange: (v: string) => void; children?: React.ReactNode }) => (
      <Ctx.Provider value={onValueChange}>{children}</Ctx.Provider>
    ),
    SelectTrigger: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...rest}>
        {children}
      </button>
    ),
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const elegir = React.useContext(Ctx)
      return (
        <button type="button" data-opcion={value} onClick={() => elegir(value)}>
          {children}
        </button>
      )
    },
  }
})

import { ArcoFormClient } from './ArcoFormClient'
import { MENSAJES_DEL_ARCO } from './limites-del-arco'

const fetchMock = vi.fn()
let container: HTMLDivElement
let root: Root
const urlOriginal = process.env.NEXT_PUBLIC_AGENT_URL

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'https://agente.test'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<ArcoFormClient />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  process.env.NEXT_PUBLIC_AGENT_URL = urlOriginal
})

function escribir(sel: string, valor: string) {
  const el = container.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  act(() => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function enviar(datos: { nombre?: string; cedula?: string; correo?: string } = {}) {
  escribir('#arco-name', datos.nombre ?? 'Laura López')
  escribir('#arco-cedula', datos.cedula ?? '12345678')
  escribir('#arco-email', datos.correo ?? 'laura@example.com')
  await act(async () => {
    ;(container.querySelector('[data-opcion="acceso"]') as HTMLElement).click()
  })
  await act(async () => {
    ;(container.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await Promise.resolve()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function respuesta(status: number, cuerpo: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
}

const alerta = () => container.querySelector('[role="alert"]')?.textContent ?? ''

describe('ArcoFormClient — errores', () => {
  it('🔴 un dato mal escrito se ataja antes de mandar, con la frase del micro', async () => {
    await enviar({ nombre: 'L' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(container.querySelector('#arco-name-error')?.textContent).toBe(MENSAJES_DEL_ARCO.nombreFalta)
    expect(document.activeElement?.id).toBe('arco-name')
  })

  it('🔴 un 400 con campos pinta el error en su campo y le da el foco', async () => {
    fetchMock.mockResolvedValue(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [MENSAJES_DEL_ARCO.correo],
        campos: [{ campo: 'requester_email', regla: 'correo', mensaje: MENSAJES_DEL_ARCO.correo }],
      }),
    )
    await enviar()
    expect(container.querySelector('#arco-email-error')?.textContent).toBe(MENSAJES_DEL_ARCO.correo)
    expect(document.activeElement?.id).toBe('arco-email')
    expect(container.querySelector('.text-danger[role="alert"]')).toBeTruthy()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    fetchMock.mockResolvedValue(
      respuesta(500, { code: 'ERROR_INTERNO', message: 'Internal Server Error', requestId: 'ab12cd34-0000-0000' }),
    )
    await enviar()
    expect(alerta()).toMatch(/No pudimos enviar tu solicitud: algo falló de nuestro lado/)
    expect(alerta()).toContain('ab12cd34')
    expect(alerta()).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await enviar()
    expect(alerta()).toMatch(/conexión/)
  })

  it('el 429 sigue con su aviso propio', async () => {
    fetchMock.mockResolvedValue(respuesta(429, { error: 'rate_limit_exceeded' }))
    await enviar()
    expect(alerta()).toContain('inmobiliaria.ai.arco.public.rateLimitBody')
  })
})
