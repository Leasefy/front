/**
 * 02-10-2026 · La prórroga con el sistema de errores.
 *
 *  · El término fuera de 1-120 se dice DEBAJO del término (antes era un toast).
 *  · El aviso de no renovación: si el back rechaza el motivo, el diálogo queda
 *    abierto con lo escrito y el error debajo del motivo (antes se cerraba
 *    antes de saber la respuesta y el texto se perdía).
 *  · Lo que no tiene campo va al toast: un 5xx con la referencia; la conexión
 *    sólo sin respuesta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    prorroga: vi.fn(),
    prorrogar: vi.fn(),
    fijarMesesDeProrroga: vi.fn(),
    fijarNoSeProrroga: vi.fn(),
    registrarAvisoDeNoRenovacion: vi.fn(),
    retirarAvisoDeNoRenovacion: vi.fn(),
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { cicloDeVidaApi, type PlanDeLaProrroga } from '@/lib/api/ciclo-de-vida.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { ProrrogaDelContrato } from './ProrrogaDelContrato'

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

const plan = {
  contractId: 'c1',
  accion: 'NO_VENCIDO',
  porQue: 'Todavía no vence.',
  ultimoDia: '2026-12-04',
  diasVencido: 0,
  regla: 'LEY_820_ART_6',
  meses: 12,
  tramos: [{ finAnterior: '2026-12-05', finNuevo: '2027-12-05' }],
  finNuevo: '2027-12-05',
  automatica: true,
  aviso: null,
  prorrogaMeses: null,
  noSeProrroga: false,
  noSeProrrogaDisponible: true,
  puenteDeRenovacion: false,
  uso: 'COMERCIAL',
  automaticaPrendida: false,
  disponible: true,
  historial: [],
} as unknown as PlanDeLaProrroga

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  vi.clearAllMocks()
  api.prorroga.mockResolvedValue(plan)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const $ = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const boton = (texto: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texto)!

async function montar() {
  await act(async () => {
    root.render(<ProrrogaDelContrato contract={{ id: 'c1' }} puedeEditar />)
  })
}

async function escribir(input: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
    await Promise.resolve()
  })
  await act(async () => {})
}

describe('<ProrrogaDelContrato> — errores en su campo', () => {
  it('🔴 el término fuera de 1-120 se dice debajo del término, con el foco, sin toast ni back', async () => {
    await montar()
    const meses = $('meses-de-prorroga') as HTMLInputElement
    await escribir(meses, '200')
    await clic(boton('Guardar término'))
    expect(api.fijarMesesDeProrroga).not.toHaveBeenCalled()
    expect(toastError).not.toHaveBeenCalled()
    expect(document.querySelector('#meses-de-prorroga-error')?.textContent).toBe('El término va de 1 a 120 meses.')
    expect(meses.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(meses)
  })

  it('🔴 si el back rechaza el motivo del aviso, el diálogo NO se cierra y lo dice debajo del motivo', async () => {
    const frase = 'El motivo puede tener hasta 2000 caracteres.'
    api.registrarAvisoDeNoRenovacion.mockRejectedValue(
      new ApiError(400, [frase], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [frase],
        campos: [{ campo: 'motivo', regla: 'longitud_maxima', mensaje: frase }],
      }),
    )
    await montar()
    await clic($('abrir-aviso')!)
    await escribir($('aviso-motivo') as HTMLTextAreaElement, 'El inquilino se va del país')
    await clic($('aviso-confirmar')!)
    expect($('dialogo-aviso-de-no-renovacion')).not.toBeNull()
    expect(($('aviso-motivo') as HTMLTextAreaElement).value).toBe('El inquilino se va del país')
    expect(document.querySelector('#motivo-del-aviso-error')?.textContent).toBe(frase)
    expect(document.activeElement).toBe($('aviso-motivo'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx va al toast con la referencia, sin culpar a la conexión', async () => {
    api.fijarMesesDeProrroga.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await montar()
    await escribir($('meses-de-prorroga') as HTMLInputElement, '12')
    await clic(boton('Guardar término'))
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toContain('de nuestro lado')
    expect(description).toContain('ab12cd34')
    expect(description).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    api.fijarMesesDeProrroga.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar()
    await escribir($('meses-de-prorroga') as HTMLInputElement, '12')
    await clic(boton('Guardar término'))
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toMatch(/conexión/i)
  })
})
