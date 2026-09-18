/**
 * 🔴 «Nada sale hasta que lo prendan», en la pantalla.
 *
 * El 14-09-2026 salieron ~680 correos de cobro a clientes reales de la
 * inmobiliaria migrada. La regla que Nico sacó de ahí es que cada aviso se
 * prende a propósito, por inmobiliaria. Lo que este spec fija es que la
 * pantalla no le mienta a nadie sobre eso:
 *
 *   · un aviso apagado se ve APAGADO;
 *   · apagar algo con consecuencias las DICE (y como advertencia, no como
 *     éxito: apagar el recibo de caja deja al inquilino sin soporte de su pago);
 *   · sin la migración, los botones no se pueden tocar y se dice por qué —
 *     porque «prendido» sin base sería una promesa falsa;
 *   · la vista previa NO manda nada.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const estado = vi.fn()
const fijar = vi.fn()
const vistaPrevia = vi.fn()
vi.mock('@/lib/api/avisos.service', () => ({
  avisosApi: {
    estado: (...a: unknown[]) => estado(...a),
    fijar: (...a: unknown[]) => fijar(...a),
    vistaPrevia: (...a: unknown[]) => vistaPrevia(...a),
  },
}))

const toastWarning = vi.fn()
const toastSuccess = vi.fn()
vi.mock('@/components/ui/toast', () => ({
  toast: {
    warning: (...a: unknown[]) => toastWarning(...a),
    success: (...a: unknown[]) => toastSuccess(...a),
    error: vi.fn(),
  },
}))

import { SeccionAvisos } from './SeccionAvisos'

const RECIBO = {
  codigo: 'RECIBO_DE_CAJA_AL_INQUILINO',
  titulo: 'Recibo de caja (su comprobante de pago)',
  cuando: 'Cuando se le recibe un pago.',
  destinatario: 'INQUILINO' as const,
  automatico: true,
  grupo: 'PLATA' as const,
  prendido: false,
  tienePlantillaPropia: false,
  prendidoAt: null,
  advertenciaAlApagar:
    'Si lo apagas, tus inquilinos pagan y no reciben ningún comprobante.',
}

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  estado.mockResolvedValue({ disponible: true, motivo: null, avisos: [RECIBO] })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const q = (testid: string) =>
  document.body.querySelector(`[data-testid="${testid}"]`)

const montar = async () => {
  await act(async () => {
    raiz.render(<SeccionAvisos />)
  })
}

describe('<SeccionAvisos> — nada sale hasta que lo prendan', () => {
  it('🔴 un aviso apagado se ve APAGADO y el botón dice «Prender»', async () => {
    await montar()
    expect(q('aviso-estado-RECIBO_DE_CAJA_AL_INQUILINO')?.textContent).toBe(
      'Apagado',
    )
    expect(
      q('aviso-alternar-RECIBO_DE_CAJA_AL_INQUILINO')?.textContent,
    ).toContain('Prender')
  })

  it('dice A QUIÉN le llega y CUÁNDO: sin eso nadie sabe qué está prendiendo', async () => {
    await montar()
    const texto = q('aviso-RECIBO_DE_CAJA_AL_INQUILINO')?.textContent ?? ''
    expect(texto).toContain('Al inquilino')
    expect(texto).toContain('Cuando se le recibe un pago')
  })

  it('🔴 mientras está apagado, muestra la consecuencia de tenerlo así', async () => {
    await montar()
    expect(
      q('aviso-advertencia-RECIBO_DE_CAJA_AL_INQUILINO')?.textContent,
    ).toContain('no reciben ningún comprobante')
  })

  it('prender manda `prendido: true` y lo refleja sin recargar', async () => {
    fijar.mockResolvedValue({
      aviso: RECIBO.codigo,
      prendido: true,
      tienePlantillaPropia: false,
      prendidoAt: '2026-09-18T12:00:00.000Z',
      advertencia: null,
    })
    await montar()
    await act(async () => {
      ;(
        q('aviso-alternar-RECIBO_DE_CAJA_AL_INQUILINO') as HTMLButtonElement
      ).click()
    })
    expect(fijar).toHaveBeenCalledWith(RECIBO.codigo, { prendido: true })
    expect(q('aviso-estado-RECIBO_DE_CAJA_AL_INQUILINO')?.textContent).toBe(
      'Prendido',
    )
  })

  it('🔴 apagar con consecuencia sale como ADVERTENCIA, no como éxito', async () => {
    estado.mockResolvedValue({
      disponible: true,
      motivo: null,
      avisos: [{ ...RECIBO, prendido: true }],
    })
    fijar.mockResolvedValue({
      aviso: RECIBO.codigo,
      prendido: false,
      tienePlantillaPropia: false,
      prendidoAt: null,
      advertencia: 'Si lo apagas, tus inquilinos pagan y no reciben nada.',
    })
    await montar()
    await act(async () => {
      ;(
        q('aviso-alternar-RECIBO_DE_CAJA_AL_INQUILINO') as HTMLButtonElement
      ).click()
    })
    expect(toastWarning).toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('🔴 SIN la migración no se puede prender nada, y se dice por qué', async () => {
    estado.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 20260918182000: por ahora NINGÚN aviso sale solo.',
      avisos: [RECIBO],
    })
    await montar()
    expect(q('avisos-sin-migrar')?.textContent).toContain('20260918182000')
    expect(
      (q('aviso-alternar-RECIBO_DE_CAJA_AL_INQUILINO') as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it('🔴 la vista previa NO manda nada: sólo pide el render', async () => {
    vistaPrevia.mockResolvedValue({
      aviso: RECIBO.codigo,
      asunto: 'Recibimos tu pago',
      html: '<p>hola</p>',
      faltantes: [],
      prendido: false,
      conPlantillaPropia: false,
    })
    await montar()
    await act(async () => {
      ;(
        q('aviso-previa-RECIBO_DE_CAJA_AL_INQUILINO') as HTMLButtonElement
      ).click()
    })
    expect(vistaPrevia).toHaveBeenCalledWith(RECIBO.codigo)
    expect(fijar).not.toHaveBeenCalled()
    expect(q('aviso-vista-previa')?.textContent).toContain('Recibimos tu pago')
  })

  it('un correo con huecos lo dice antes de que alguien lo prenda', async () => {
    vistaPrevia.mockResolvedValue({
      aviso: RECIBO.codigo,
      asunto: 'Recibimos tu pago',
      html: '<p>hola</p>',
      faltantes: ['saldoPendiente'],
      prendido: false,
      conPlantillaPropia: false,
    })
    await montar()
    await act(async () => {
      ;(
        q('aviso-previa-RECIBO_DE_CAJA_AL_INQUILINO') as HTMLButtonElement
      ).click()
    })
    expect(toastWarning).toHaveBeenCalled()
  })
})
