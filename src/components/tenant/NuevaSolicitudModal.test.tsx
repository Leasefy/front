/**
 * NuevaSolicitudModal — la cáscara es el `Dialog` canónico (DESIGN.md §17).
 *
 * Antes era una capa `fixed inset-0` hecha a mano: el clic en el fondo cerraba
 * salvo mientras enviaba, y la ✕ y Cancelar se apagaban mientras enviaba. Ese
 * bloqueo ahora vive en el `onOpenChange` (Esc, el velo y la ✕ pasan por ahí):
 * acá se prueba que siga en pie.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  create: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/api/pqrs.service', () => ({
  pqrsApi: { create: h.create },
  PqrsUnavailableError: class PqrsUnavailableError extends Error {},
}))

import { NuevaSolicitudModal } from './NuevaSolicitudModal'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
  vi.clearAllMocks()
})

function montar(onClose = vi.fn()) {
  act(() => {
    raiz.render(<NuevaSolicitudModal open onClose={onClose} />)
  })
  return onClose
}

/** Radix pinta el diálogo en un portal sobre `document.body`. */
function dialogo(): HTMLElement {
  const d = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!d) throw new Error('El diálogo no está abierto')
  return d
}

const boton = (texto: string) => {
  const b = Array.from(dialogo().querySelectorAll('button')).find(
    (el) => el.textContent?.trim() === texto,
  )
  if (!b) throw new Error(`No está el botón «${texto}»`)
  return b as HTMLButtonElement
}

function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

function esc() {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  })
}

describe('<NuevaSolicitudModal>', () => {
  it('es el Dialog canónico: título en la cabecera, una sola ✕ y las acciones en el pie', () => {
    montar()
    expect(dialogo().querySelector('h2')?.textContent).toBe('Nueva solicitud')
    expect(document.querySelectorAll('[aria-label="Cerrar"]')).toHaveLength(1)
    expect(boton('Cancelar')).toBeTruthy()
    expect(boton('Enviar solicitud')).toBeTruthy()
  })

  it('sin envío en curso, Esc cierra', () => {
    const onClose = montar()
    esc()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('🔴 mientras envía no se sale: ni Esc ni la ✕ cierran, y Cancelar queda apagado', async () => {
    // El back nunca responde: el formulario se queda enviando.
    h.create.mockReturnValue(new Promise(() => {}))
    const onClose = montar()

    act(() => {
      escribir(dialogo().querySelector('#solicitud-asunto') as HTMLInputElement, 'Fuga en el baño')
      escribir(
        dialogo().querySelector('#solicitud-descripcion') as HTMLTextAreaElement,
        'Gotea el lavamanos',
      )
    })
    await act(async () => {
      boton('Enviar solicitud').click()
      await Promise.resolve()
    })

    expect(h.create).toHaveBeenCalledTimes(1)
    esc()
    act(() => (document.querySelector('[aria-label="Cerrar"]') as HTMLElement).click())
    expect(onClose).not.toHaveBeenCalled()
    expect(boton('Cancelar').disabled).toBe(true)
  })
})

/**
 * 🔴 02-10-2026 · Sistema de errores: lo que falta o el back rechaza va bajo
 * SU campo; los demás fallos pasan por el traductor (antes, un genérico fijo).
 */
describe('<NuevaSolicitudModal> — errores (02-10-2026)', () => {
  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    return Object.assign(new Error(Array.isArray(cuerpo.message) ? cuerpo.message.join(' · ') : String(cuerpo.message ?? '')), {
      name: 'ApiError',
      status,
      code: cuerpo.code,
      messages: Array.isArray(cuerpo.message) ? cuerpo.message : undefined,
      detalle: cuerpo,
    })
  }

  async function enviarCon(asunto: string, descripcion: string) {
    montar()
    act(() => escribir(dialogo().querySelector('#solicitud-asunto') as HTMLInputElement, asunto))
    act(() => escribir(dialogo().querySelector('#solicitud-descripcion') as HTMLTextAreaElement, descripcion))
    await act(async () => {
      boton('Enviar solicitud').click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('sin asunto, el error va bajo el asunto (no un toast)', async () => {
    await enviarCon('', 'Se mete el agua por la ventana')
    expect(document.getElementById('solicitud-asunto-error')?.textContent).toBe('Escribe el asunto.')
    expect(h.create).not.toHaveBeenCalled()
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('🔴 un 400 con campos pinta el error bajo su campo', async () => {
    const LARGO = 'El asunto puede tener hasta 120 caracteres.'
    h.create.mockRejectedValue(
      errorDelBack(400, {
        code: 'DATOS_INVALIDOS',
        message: [LARGO],
        campos: [{ campo: 'asunto', regla: 'longitud_maxima', mensaje: LARGO }],
      }),
    )
    await enviarCon('Fuga en el baño', 'Se mete el agua')
    expect(document.getElementById('solicitud-asunto-error')?.textContent).toBe(LARGO)
    expect(dialogo().querySelector('#solicitud-asunto')?.getAttribute('aria-invalid')).toBe('true')
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia', async () => {
    h.create.mockRejectedValue(
      errorDelBack(500, { code: 'ERROR_INTERNO', message: 'Internal server error', referencia: 'ab12cd34' }),
    )
    await enviarCon('Fuga en el baño', 'Se mete el agua')
    const dicho = String(h.toast.error.mock.calls[0][0])
    expect(dicho).toMatch(/^No pudimos enviar tu solicitud: algo falló de nuestro lado/)
    expect(dicho).toContain('ab12cd34')
  })

  it('sin respuesta: habla de la conexión', async () => {
    h.create.mockRejectedValue(new TypeError('Failed to fetch'))
    await enviarCon('Fuga en el baño', 'Se mete el agua')
    expect(String(h.toast.error.mock.calls[0][0])).toMatch(/conexión/)
  })
})

/*
 * ARREGLOS-2 (03-10-2026, Nico Q4 a): `POST /pqrs` radica sobre el contrato
 * vigente. Con uno, va ése; con varios, la persona elige sobre cuál.
 */
describe('<NuevaSolicitudModal> — sobre cuál contrato (03-10-2026)', () => {
  const C1 = { contratoId: 'contrato-1', inmueble: 'Apto 101 · Cra 43A #1-50' }
  const C2 = { contratoId: 'contrato-2', inmueble: 'Local 2' }

  function montarCon(contratos: typeof C1[]) {
    act(() => {
      raiz.render(<NuevaSolicitudModal open onClose={vi.fn()} contratos={contratos} />)
    })
  }

  async function llenarYEnviar() {
    act(() => escribir(dialogo().querySelector('#solicitud-asunto') as HTMLInputElement, 'Fuga en el baño'))
    act(() =>
      escribir(dialogo().querySelector('#solicitud-descripcion') as HTMLTextAreaElement, 'Se mete el agua'),
    )
    await act(async () => {
      boton('Enviar solicitud').click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('con UN contrato vigente no pregunta y radica sobre ése', async () => {
    h.create.mockResolvedValue({ id: 'pqrs-1' })
    montarCon([C1])
    expect(dialogo().querySelector('#solicitud-contrato')).toBeNull()
    await llenarYEnviar()
    expect(h.create).toHaveBeenCalledWith({
      tipo: 'reparacion',
      asunto: 'Fuga en el baño',
      descripcion: 'Se mete el agua',
      contratoId: 'contrato-1',
    })
  })

  it('con DOS pregunta sobre cuál: sin elegir no envía y lo dice bajo el campo', async () => {
    montarCon([C1, C2])
    const select = dialogo().querySelector('#solicitud-contrato') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Elige el inmueble',
      'Apto 101 · Cra 43A #1-50',
      'Local 2',
    ])
    await llenarYEnviar()
    expect(h.create).not.toHaveBeenCalled()
    expect(document.getElementById('solicitud-contrato-error')?.textContent).toBe(
      'Elige sobre cuál contrato es tu solicitud.',
    )
  })

  it('con DOS, elegido el segundo, radica sobre ése', async () => {
    h.create.mockResolvedValue({ id: 'pqrs-2' })
    montarCon([C1, C2])
    const select = dialogo().querySelector('#solicitud-contrato') as HTMLSelectElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, 'contrato-2')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await llenarYEnviar()
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ contratoId: 'contrato-2' }))
    expect(h.toast.success).toHaveBeenCalled()
  })

  it('un 400 ELIGE_EL_CONTRATO del back va bajo el campo del contrato', async () => {
    const mensaje = 'Tienes más de un contrato vigente: elige sobre cuál es tu solicitud.'
    h.create.mockRejectedValue(
      Object.assign(new Error(mensaje), {
        name: 'ApiError',
        status: 400,
        code: 'ELIGE_EL_CONTRATO',
        detalle: {
          statusCode: 400,
          code: 'ELIGE_EL_CONTRATO',
          message: mensaje,
          campos: [{ campo: 'contratoId', regla: 'requerido', mensaje }],
        },
      }),
    )
    montarCon([C1, C2])
    const select = dialogo().querySelector('#solicitud-contrato') as HTMLSelectElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, 'contrato-1')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await llenarYEnviar()
    expect(document.getElementById('solicitud-contrato-error')?.textContent).toBe(mensaje)
  })
})
