/**
 * ConfigExtractoMensual.test.tsx — el extracto mensual automático en Configuración.
 *
 * Cubre: el switch escribe `{ extractoMensualAutomatico }` por el mismo `onSave`
 * del perfil (y vuelve atrás si el PUT falla), el día sólo se ve con el switch
 * prendido y se guarda al confirmar (1..28), el bloque «Último mes» pinta el
 * resumen real, y «Enviar ahora» pide confirmación ANTES de tocar el endpoint
 * (manda correos reales) y después lista a los que no salieron con su motivo.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: toastMock }))

const { extractosResumenMock, enviarExtractosDelMesMock } = vi.hoisted(() => ({
  extractosResumenMock: vi.fn(),
  enviarExtractosDelMesMock: vi.fn(),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: {
    extractosResumen: extractosResumenMock,
    enviarExtractosDelMes: enviarExtractosDelMesMock,
  },
}))

import { ConfigExtractoMensual, mesAnterior } from './ConfigExtractoMensual'
import type { AgencyProfile, ResumenDeExtractos } from '@/lib/types/inmobiliaria'

const AGENCY: AgencyProfile = {
  id: 'ag-1',
  name: 'Inmobiliaria ABC',
  memberRole: 'ADMIN',
  extractoMensualAutomatico: false,
  extractoMensualDia: 1,
}

const RESUMEN_CON_ENVIOS: ResumenDeExtractos = {
  month: '2026-08',
  enviados: 12,
  fallidos: 1,
  omitidos: 2,
  ultimoEnvioAt: '2026-09-01T12:30:00.000Z',
  propietariosConActividad: 15,
}

const RESUMEN_VACIO: ResumenDeExtractos = {
  month: '2026-08',
  enviados: 0,
  fallidos: 0,
  omitidos: 0,
  ultimoEnvioAt: null,
  propietariosConActividad: 15,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  extractosResumenMock.mockResolvedValue(RESUMEN_CON_ENVIOS)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

/** Deja correr las promesas del fetch y los efectos que disparan. */
async function flush() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0))
  })
}

async function render(props: Partial<React.ComponentProps<typeof ConfigExtractoMensual>> = {}) {
  const defaultProps: React.ComponentProps<typeof ConfigExtractoMensual> = {
    agency: AGENCY,
    onSave: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
    ...props,
  }
  await act(async () => {
    root.render(<ConfigExtractoMensual {...defaultProps} />)
  })
  await flush()
  return defaultProps
}

function q<T extends Element = HTMLElement>(testId: string, scope: ParentNode = container): T | null {
  return scope.querySelector<T>(`[data-testid="${testId}"]`)
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('mesAnterior', () => {
  it('cruza el año en enero', () => {
    expect(mesAnterior(new Date(2026, 0, 15))).toBe('2025-12')
    expect(mesAnterior(new Date(2026, 8, 2))).toBe('2026-08')
  })
})

describe('ConfigExtractoMensual — switch y día', () => {
  it('prender el switch manda { extractoMensualAutomatico: true } y nada más', async () => {
    const props = await render()
    expect(q('extracto-mensual-dia')).toBeNull()

    await act(async () => {
      q('extracto-mensual-automatico')!.click()
    })

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith({ extractoMensualAutomatico: true })
    // Con el switch prendido aparece el día.
    expect(q<HTMLInputElement>('extracto-mensual-dia')).toBeTruthy()
  })

  it('si el PUT falla, el switch vuelve a como estaba', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('403'))
    await render({ onSave })

    await act(async () => {
      q('extracto-mensual-automatico')!.click()
    })
    await flush()

    expect(q('extracto-mensual-automatico')!.getAttribute('aria-checked')).toBe('false')
    expect(q('extracto-mensual-dia')).toBeNull()
  })

  it('el día sólo se ve prendido, se guarda al confirmar y rechaza fuera de 1..28', async () => {
    const props = await render({ agency: { ...AGENCY, extractoMensualAutomatico: true, extractoMensualDia: 5 } })
    const input = q<HTMLInputElement>('extracto-mensual-dia')!
    expect(input.value).toBe('5')

    act(() => {
      setInputValue(input, '15')
    })
    await act(async () => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).toHaveBeenCalledWith({ extractoMensualDia: 15 })

    // 31 no existe en todos los meses: error y vuelve al guardado, sin PUT.
    ;(props.onSave as ReturnType<typeof vi.fn>).mockClear()
    act(() => {
      setInputValue(input, '31')
    })
    await act(async () => {
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).not.toHaveBeenCalled()
    expect(input.value).toBe('5')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('sin permiso de admin el switch queda deshabilitado y no hay «Enviar ahora»', async () => {
    await render({ canEdit: false })
    expect((q('extracto-mensual-automatico') as HTMLButtonElement).disabled).toBe(true)
    expect(q('extracto-mensual-enviar-ahora')).toBeNull()
  })
})

describe('ConfigExtractoMensual — último mes', () => {
  it('pinta el resumen del mes anterior con conteos y último envío', async () => {
    await render()
    expect(extractosResumenMock).toHaveBeenCalledWith()
    const resumen = q('extracto-mensual-resumen')!
    expect(resumen.textContent).toContain('Agosto de 2026')
    expect(resumen.textContent).toContain('12 enviados')
    expect(resumen.textContent).toContain('1 fallidos')
    expect(resumen.textContent).toContain('2 omitidos')
    expect(resumen.textContent).toContain('último envío')
    expect(resumen.textContent).toContain('15 propietarios')
  })

  it('sin huellas dice que todavía no se mandó', async () => {
    extractosResumenMock.mockResolvedValue(RESUMEN_VACIO)
    await render()
    expect(q('extracto-mensual-resumen')!.textContent).toContain('Todavía no se ha enviado el extracto de agosto de 2026')
  })

  it('si el resumen falla, lo dice y no rompe', async () => {
    extractosResumenMock.mockRejectedValue(new Error('500 del back'))
    await render()
    expect(q('extracto-mensual-error')!.textContent).toContain('500 del back')
  })
})

describe('ConfigExtractoMensual — enviar ahora', () => {
  it('pide confirmación antes de llamar al endpoint, y después lista a los que no salieron', async () => {
    enviarExtractosDelMesMock.mockResolvedValue({
      month: '2026-08',
      enviados: 1,
      fallidos: 1,
      omitidos: 1,
      detalle: [
        { propietarioId: 'p1', nombre: 'Ana', estado: 'ENVIADO' },
        { propietarioId: 'p2', nombre: 'Beto', estado: 'FALLIDO', motivo: 'SMTP 550' },
        { propietarioId: 'p3', nombre: 'Carla', estado: 'OMITIDO', motivo: 'sin correo registrado' },
      ],
    })
    await render()

    const boton = q<HTMLButtonElement>('extracto-mensual-enviar-ahora')!
    expect(boton.textContent).toContain('agosto de 2026')
    await act(async () => {
      boton.click()
    })

    // El AlertDialog sale por portal a document.body; todavía no se mandó nada.
    const dialogo = document.querySelector('[role="alertdialog"]')
    expect(dialogo).toBeTruthy()
    expect(dialogo!.textContent).toContain('15 con movimientos')
    expect(enviarExtractosDelMesMock).not.toHaveBeenCalled()

    await act(async () => {
      q('extracto-mensual-confirmar', document.body)!.click()
    })
    await flush()

    expect(enviarExtractosDelMesMock).toHaveBeenCalledWith('2026-08', true)
    expect(toastMock.success).toHaveBeenCalledTimes(1)
    // Se relee el resumen después de mandar.
    expect(extractosResumenMock).toHaveBeenCalledTimes(2)

    const resultado = q('extracto-mensual-resultado')!
    expect(resultado.textContent).toContain('1 enviados · 1 fallidos · 1 omitidos')

    await act(async () => {
      q('extracto-mensual-ver-detalle')!.click()
    })
    const detalle = q('extracto-mensual-detalle')!
    const filas = Array.from(detalle.querySelectorAll('li')).map((li) => li.textContent)
    expect(filas).toHaveLength(2)
    expect(filas[0]).toContain('Beto')
    expect(filas[0]).toContain('SMTP 550')
    expect(filas[1]).toContain('Carla')
    expect(filas[1]).toContain('sin correo registrado')
    expect(detalle.textContent).not.toContain('Ana')
  })

  it('si el envío falla avisa con el mensaje del back', async () => {
    enviarExtractosDelMesMock.mockRejectedValue(new Error('Resend caído'))
    await render()

    await act(async () => {
      q('extracto-mensual-enviar-ahora')!.click()
    })
    await act(async () => {
      q('extracto-mensual-confirmar', document.body)!.click()
    })
    await flush()

    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect((toastMock.error.mock.calls[0] as unknown[])[1]).toEqual({ description: 'Resend caído' })
    expect(q('extracto-mensual-resultado')).toBeNull()
  })
})
