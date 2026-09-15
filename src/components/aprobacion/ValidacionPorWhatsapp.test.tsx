/**
 * ValidacionPorWhatsapp — la espera después del pago (Nico, 2026-09-15).
 *
 * El servicio se mockea: su mapeo de errores se prueba en
 * `validacion-del-estudio.service.test.ts`. Acá importa qué ve la persona
 * según lo que responde «Ya la validé» y «Reenviar la validación».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const svc = vi.hoisted(() => {
  class ValidacionError extends Error {}
  return { verificarValidacion: vi.fn(), reenviarValidacion: vi.fn(), ValidacionError }
})

vi.mock('@/lib/api/validacion-del-estudio.service', () => ({
  verificarValidacion: (...a: unknown[]) => svc.verificarValidacion(...a),
  reenviarValidacion: (...a: unknown[]) => svc.reenviarValidacion(...a),
  ValidacionError: svc.ValidacionError,
}))

import { ValidacionPorWhatsapp } from './ValidacionPorWhatsapp'

let container: HTMLDivElement
let root: Root
let onActualizar: ReturnType<typeof vi.fn<() => void>>

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  onActualizar = vi.fn<() => void>()
  svc.verificarValidacion.mockReset()
  svc.reenviarValidacion.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(evaluationStatus: string | null, pagoConfirmado = false) {
  act(() => {
    root.render(
      <ValidacionPorWhatsapp
        evaluationStatus={evaluationStatus}
        onActualizar={onActualizar}
        pagoConfirmado={pagoConfirmado}
      />,
    )
  })
}

function boton(testId: string): HTMLButtonElement {
  return container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement
}

async function clic(testId: string) {
  await act(async () => {
    boton(testId).click()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('<ValidacionPorWhatsapp>', () => {
  it('esperando: explica los pasos, que puede volver y que le recordamos', () => {
    montar('awaiting_authorization', true)
    const t = container.textContent ?? ''
    expect(t).toContain('Pago confirmado')
    expect(t).toContain('Valida tu identidad por WhatsApp')
    expect(t).toContain('Abre el WhatsApp de Fianly')
    expect(t).toContain('Vuelve aquí y toca «Ya la validé»')
    expect(t).toContain('te recordamos por correo dónde quedaste')
    expect(boton('ya-la-valide').disabled).toBe(false)
  })

  it('todavía no sale el WhatsApp: lo dice y no deja tocar «Ya la validé»', () => {
    montar('started')
    expect(container.textContent).toContain('Estamos preparando tu validación')
    expect(boton('ya-la-valide').disabled).toBe(true)
    expect(boton('reenviar-validacion').disabled).toBe(true)
  })

  it('«Ya la validé» sin validar: dice que no la vemos y deja reenviarla', async () => {
    svc.verificarValidacion.mockResolvedValue('pendiente')
    svc.reenviarValidacion.mockResolvedValue({ reenviosRestantes: 4 })
    montar('awaiting_authorization')

    await clic('ya-la-valide')

    expect(container.querySelector('[data-testid="validacion-pendiente"]')?.textContent).toContain(
      'Todavía no vemos tu validación',
    )

    await clic('reenviar-validacion')

    expect(svc.reenviarValidacion).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('Te enviamos la validación de nuevo')
    expect(boton('reenviar-validacion').disabled).toBe(true)
    expect(boton('reenviar-validacion').textContent).toContain('Validación reenviada')
  })

  it('«Ya la validé» validada: avisa que la recibimos y que consultamos', async () => {
    svc.verificarValidacion.mockResolvedValue('validada')
    montar('awaiting_authorization')

    await clic('ya-la-valide')

    expect(container.querySelector('[data-testid="validacion-recibida"]')?.textContent).toContain(
      '¡Recibimos tu validación!',
    )
  })

  it('«Ya la validé» con el estudio listo: le pide al padre ir a la respuesta', async () => {
    svc.verificarValidacion.mockResolvedValue('lista')
    montar('awaiting_authorization')

    await clic('ya-la-valide')

    expect(onActualizar).toHaveBeenCalledTimes(1)
  })

  it('si no se puede revisar, muestra el motivo', async () => {
    svc.verificarValidacion.mockRejectedValue(new svc.ValidacionError('No pudimos revisar tu validación.'))
    montar('awaiting_authorization')

    await clic('ya-la-valide')

    expect(container.querySelector('[role="alert"]')?.textContent).toBe('No pudimos revisar tu validación.')
  })

  it('si el reenvío falla, muestra el mensaje del back', async () => {
    svc.reenviarValidacion.mockRejectedValue(
      new svc.ValidacionError('Acabamos de reenviarte la validación. Espera un par de minutos antes de pedirla otra vez.'),
    )
    montar('awaiting_authorization')

    await clic('reenviar-validacion')

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Espera un par de minutos')
  })
})
