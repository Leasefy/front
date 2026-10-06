/**
 * 02-10-2026 · Los incrementos y la renovación de un vencido con el sistema de
 * errores: lo que el back rechaza POR CAMPO va debajo de ese campo (con el
 * foco, cuando la sección vuelve a habilitarse); lo demás al toast, por el
 * traductor: un 5xx con la referencia, y la conexión sólo sin respuesta.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/ciclo-de-vida.service', () => ({
  cicloDeVidaApi: {
    incrementos: vi.fn(),
    fijarTasaAnual: vi.fn(),
    digitarIncremento: vi.fn(),
    generarCarta: vi.fn(),
    revisarCarta: vi.fn(),
    enviarCarta: vi.fn(),
    vencidos: vi.fn(),
    extender: vi.fn(),
    prorroga: vi.fn(),
    registrarConstancia: vi.fn(),
    soporteDeLaConstancia: vi.fn(),
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { cicloDeVidaApi } from '@/lib/api/ciclo-de-vida.service'
import { ApiError } from '@/lib/api/client'
import { toast } from '@/components/ui/toast'
import { IncrementosDelContrato } from './IncrementosDelContrato'
import { RenovarContratoVencido } from './RenovarContratoVencido'

const api = cicloDeVidaApi as unknown as Record<string, ReturnType<typeof vi.fn>>
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>
let root: Root | null = null
let container: HTMLDivElement | null = null

const comercial = {
  uso: 'COMERCIAL',
  tasaAnualPactadaPct: null,
  aniversarios: [
    {
      desde: '2026-08-21',
      origen: null,
      porcentaje: null,
      canonAnteriorCop: 1_000_000,
      canonNuevoCop: 1_000_000,
      motivo: 'Sin incremento digitado.',
      carta: null,
    },
  ],
  disponible: true,
  envioHabilitado: true,
}

async function montar(el: React.ReactElement) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(el)
  })
  await act(async () => {})
}

async function escribir(input: HTMLInputElement, valor: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
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

const boton = (texto: string) => [...document.querySelectorAll('button')].find((b) => b.textContent === texto)!

const fallo400 = (campo: string, mensaje: string) =>
  new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: [mensaje],
    campos: [{ campo, regla: 'maximo', mensaje }],
  })

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
})

describe('<IncrementosDelContrato> — errores en su campo', () => {
  it('🔴 un porcentaje que el back rechaza se dice debajo del porcentaje, con el foco', async () => {
    const frase = 'El porcentaje no puede ser mayor que 100.'
    api.incrementos.mockResolvedValue(comercial)
    api.digitarIncremento.mockRejectedValue(fallo400('porcentaje', frase))
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />)
    const porcentaje = document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!
    // Dentro de los topes del front (02-10-2026: un «150» ya lo ataja el espejo).
    await escribir(porcentaje, '50')
    await clic(boton('Digitar incremento'))
    expect(document.querySelector('#incremento-2026-08-21-error')?.textContent).toBe(frase)
    const despues = document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!
    expect(despues.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(despues)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('la tasa pactada que el back rechaza se dice debajo de la tasa', async () => {
    const frase = 'El porcentaje no puede ser mayor que 100.'
    api.incrementos.mockResolvedValue(comercial)
    api.fijarTasaAnual.mockRejectedValue(fallo400('porcentaje', frase))
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />)
    await escribir(document.querySelector<HTMLInputElement>('#tasa-pactada')!, '50')
    await clic(boton('Guardar tasa'))
    expect(document.querySelector('#tasa-pactada-error')?.textContent).toBe(frase)
    expect(document.activeElement).toBe(document.querySelector('#tasa-pactada'))
  })

  it('un 5xx va al toast con la referencia, sin culpar a la conexión', async () => {
    api.incrementos.mockResolvedValue(comercial)
    api.digitarIncremento.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />)
    await escribir(document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!, '5')
    await clic(boton('Digitar incremento'))
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toContain('de nuestro lado')
    expect(description).toContain('ab12cd34')
    expect(description).not.toMatch(/conexión/i)
  })

  it('sin respuesta (status 0), y sólo entonces, habla de la conexión', async () => {
    api.incrementos.mockResolvedValue(comercial)
    api.digitarIncremento.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await montar(<IncrementosDelContrato contractId="c1" puedeEditar />)
    await escribir(document.querySelector<HTMLInputElement>('#incremento-2026-08-21')!, '5')
    await clic(boton('Digitar incremento'))
    const { description } = toastError.mock.calls[0][1] as { description: string }
    expect(description).toMatch(/conexión/i)
  })
})

describe('<RenovarContratoVencido> — errores en su campo', () => {
  function vencido() {
    api.vencidos.mockResolvedValue({
      contratos: [{ id: 'c1', endDate: '2026-08-31', renovarPorTerminoInicialHasta: null }],
    })
    api.prorroga.mockResolvedValue({ accion: 'ALERTA_AVISO_DE_NO_RENOVACION' })
  }

  it('🔴 un día de entrega que el back rechaza se dice debajo del día', async () => {
    const frase = 'El día de entrega no es un día real del calendario (usa AAAA-MM-DD).'
    vencido()
    api.extender.mockRejectedValue(fallo400('hasta', frase))
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={vi.fn()} />)
    const dia = document.querySelector<HTMLInputElement>('#fecha-de-entrega')!
    await escribir(dia, '2026-09-15')
    await clic(boton('Renovar por los días ocupados'))
    expect(document.querySelector('#fecha-de-entrega-error')?.textContent).toBe(frase)
    expect(dia.getAttribute('aria-invalid')).toBe('true')
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx dice que es nuestro, con la referencia; la conexión sólo sin respuesta', async () => {
    vencido()
    api.extender.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    )
    await montar(<RenovarContratoVencido contractId="c1" onRenovado={vi.fn()} />)
    await escribir(document.querySelector<HTMLInputElement>('#fecha-de-entrega')!, '2026-09-15')
    await clic(boton('Renovar por los días ocupados'))
    const primero = (toastError.mock.calls[0][1] as { description: string }).description
    expect(primero).toContain('ab12cd34')
    expect(primero).not.toMatch(/conexión/i)

    api.extender.mockRejectedValueOnce(new ApiError(0, 'Failed to fetch'))
    await clic(boton('Renovar por los días ocupados'))
    const segundo = (toastError.mock.calls[1][1] as { description: string }).description
    expect(segundo).toMatch(/conexión/i)
  })
})
