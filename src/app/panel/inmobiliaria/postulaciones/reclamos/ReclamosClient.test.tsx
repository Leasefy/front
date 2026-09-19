/**
 * Los reclamos de candidatos (F-07).
 *
 * 🔴 Lo que fija este test es el colador: cuando el back rechaza la respuesta
 * por dejar ver el puntaje o las centrales, el 400 se muestra **al lado del
 * campo y con las palabras que delató**, y el reclamo NO se marca resuelto. Es
 * la diferencia entre enseñar la regla y dejar que el puntaje salga.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

const { api, permisos } = vi.hoisted(() => ({
  api: {
    reclamos: (() => Promise.resolve(null)) as () => Promise<unknown>,
    responder: vi.fn(async () => ({}) as unknown),
    tomar: vi.fn(async () => ({}) as unknown),
  },
  permisos: { edit: true },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    postulacionesApi: {
      reclamos: () => api.reclamos(),
      responderReclamo: api.responder,
      tomarReclamo: api.tomar,
    },
  }
})
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (_m: string, a: string) => (a === 'edit' ? permisos.edit : true),
  }),
}))

import { ReclamosClient } from './ReclamosClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const RECLAMOS = {
  disponible: true,
  motivo: null,
  reclamos: [
    {
      id: 'r-1',
      applicationId: 'a-1',
      solicitanteNombre: 'Juan Pérez',
      solicitanteCorreo: 'juan@ejemplo.com',
      tipo: 'DETALLE' as const,
      mensaje: '¿Por qué no aprobaron mi postulación?',
      estado: 'ABIERTO' as const,
      respuesta: null,
      respondidoEl: null,
      createdAt: '2026-09-18T10:00:00.000Z',
    },
  ],
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<ReclamosClient />)
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)
async function clic(sel: string) {
  await act(async () => {
    contenedor
      .querySelector<HTMLElement>(sel)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
async function escribir(sel: string, valor: string) {
  const el = contenedor.querySelector<HTMLTextAreaElement>(sel)
  if (!el) throw new Error(`no existe ${sel}`)
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )?.set
    setter?.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  api.reclamos = vi.fn(() => Promise.resolve(RECLAMOS))
  api.responder.mockReset()
  api.responder.mockResolvedValue({})
  permisos.edit = true
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('ReclamosClient', () => {
  it('muestra el reclamo con su tipo y su mensaje', async () => {
    await pintar()
    const fila = $('[data-testid="reclamo-r-1"]')?.textContent ?? ''
    expect(fila).toContain('Juan Pérez')
    expect(fila).toContain('Pide detalle')
    expect(fila).toContain('¿Por qué no aprobaron mi postulación?')
  })

  it('🔴 la regla se lee ANTES de escribir, no dentro del formulario', async () => {
    // Antes este recordatorio vivía DENTRO del campo de respuesta, así que
    // sólo lo leía quien ya había decidido responder — y para entonces la
    // frase con el puntaje suele estar pensada. Ahora está arriba, y esta
    // prueba exige justamente eso: visible SIN abrir nada.
    await pintar()
    const regla = $('[data-testid="que-se-puede-decir"]')?.textContent ?? ''
    expect(regla).toContain('Su puntaje')
    expect(regla).toContain('centrales de riesgo')
    expect(regla).toContain('Que se presente con codeudor')
  })

  it('y sigue estando cuando el formulario está abierto', async () => {
    await pintar()
    await clic('[data-testid="responder-r-1"]')
    expect($('[data-testid="que-se-puede-decir"]')).not.toBeNull()
  })

  it('🔴 el 400 del colador se ve al lado del campo, y el reclamo no se cierra', async () => {
    api.responder.mockRejectedValue(
      new ApiError(400, [
        'Ese mensaje deja ver el puntaje o datos de centrales de riesgo (puntaje). Al candidato se le da un motivo general y el canal para pedir detalle.',
      ]),
    )
    await pintar()
    await clic('[data-testid="responder-r-1"]')
    await escribir('[data-testid="respuesta-r-1"]', 'Tu puntaje fue muy bajo')
    await clic('[data-testid="enviar-r-1"]')

    const fuga = $('[data-testid="fuga-detectada"]')?.textContent ?? ''
    expect(fuga).toContain('puntaje')
    // El formulario sigue abierto: nada se cerró como si hubiera salido.
    expect($('[data-testid="respuesta-r-1"]')).not.toBeNull()
  })

  it('una respuesta limpia sí se manda', async () => {
    await pintar()
    await clic('[data-testid="responder-r-1"]')
    await escribir(
      '[data-testid="respuesta-r-1"]',
      'La aseguradora no aprobó con las condiciones actuales. Puedes presentarte con un codeudor.',
    )
    await clic('[data-testid="enviar-r-1"]')
    expect(api.responder).toHaveBeenCalled()
    expect($('[data-testid="fuga-detectada"]')).toBeNull()
  })

  it('sin permiso no ofrece responder', async () => {
    permisos.edit = false
    await pintar()
    expect($('[data-testid="responder-r-1"]')).toBeNull()
  })

  it('🔴 «Lo veo yo» pone el reclamo a tu nombre', async () => {
    // `tomarReclamo` existía en el back y no tenía consumidor: dos personas de
    // la misma inmobiliaria podían responderle al mismo candidato sin saber la
    // una de la otra, y el estado EN_REVISION no lo alcanzaba nadie nunca.
    await pintar()
    await clic('[data-testid="tomar-r-1"]')
    expect(api.tomar).toHaveBeenCalledWith('r-1')
  })

  it('un reclamo ya respondido no ofrece tomarlo ni responderlo de nuevo', async () => {
    api.reclamos = () =>
      Promise.resolve({
        ...RECLAMOS,
        reclamos: [
          {
            ...RECLAMOS.reclamos[0],
            estado: 'RESUELTO' as const,
            respuesta: 'Puedes presentarte con un codeudor.',
            respondidoEl: '2026-09-18T12:00:00.000Z',
          },
        ],
      })
    await pintar()
    expect($('[data-testid="tomar-r-1"]')).toBeNull()
    expect($('[data-testid="responder-r-1"]')).toBeNull()
    expect(contenedor.textContent).toContain('Puedes presentarte con un codeudor.')
  })
})
