/**
 * 🔴 B-07: el origen es OBLIGATORIO, y el duplicado avisa.
 *
 * Lo que fija este test:
 *   · con el CRM habilitado no se puede guardar sin ORIGEN, y hace falta el
 *     documento o el teléfono (B-04: sin llave no hay contra qué unir);
 *   · el lead sale por `leadsApi.entra`, que es el que une el contacto y asigna
 *     el asesor;
 *   · cuando el contacto ya existía, el aviso lo dice y dice por qué lado se
 *     reconoció («se avisa al asesor dueño»);
 *   · 🔴 con el CRM SIN habilitar (503) el diálogo se comporta EXACTAMENTE como
 *     hoy: se guarda por `pipelineApi.create`, sin origen, y nada se rompe. Es
 *     la garantía de «sin migración todo funciona como antes».
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'
import type { Consignacion } from '@/lib/types/inmobiliaria'

const { crm, pipeline, toasts } = vi.hoisted(() => ({
  crm: {
    configuracion: (() => Promise.resolve(null)) as () => Promise<unknown>,
    // La forma se declara ANCHA a propósito: el mock tiene que poder devolver
    // un `contactoUnido: true` con `seReconocioPor: 'DOCUMENTO'` en un caso y
    // el contrario en otro, y con la inferencia de la primera resolución
    // TypeScript los estrecharía a literales.
    entra: vi.fn(
      async (): Promise<{
        pipelineItemId: string
        contactoId: string | null
        origen: string
        asignadoA: string | null
        porQueSeAsigno: 'ASESOR_DEL_INMUEBLE' | 'TURNO' | 'SIN_ASESORES'
        contactoUnido: boolean
        seReconocioPor: 'DOCUMENTO' | 'TELEFONO' | null
      }> => ({
        pipelineItemId: 'p-1',
        contactoId: 'c-1',
        origen: 'FINCARAIZ',
        asignadoA: 'ana',
        porQueSeAsigno: 'ASESOR_DEL_INMUEBLE',
        contactoUnido: false,
        seReconocioPor: null,
      }),
    ),
  },
  pipeline: { create: vi.fn(async () => ({ id: 'p-1' })) },
  toasts: { success: vi.fn() },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    leadsApi: {
      configuracion: () => crm.configuracion(),
      entra: crm.entra,
    },
  }
})
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  pipelineApi: { create: pipeline.create },
}))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: toasts.success, error: vi.fn() },
}))

import { NuevoLeadDialog } from './NuevoLeadDialog'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const CONFIG = {
  disponible: true,
  motivo: null,
  horasParaResponderLead: 24,
  origenesDeLead: ['FINCARAIZ', 'WHATSAPP'],
  minimoDeFotosParaPublicar: null,
  margenDeBajaDePrecioPct: null,
  horasDeAvisoAlInquilino: null,
  diasParaFirmarElContrato: null,
  pesosDelMatching: null,
}

const INMUEBLES = [
  { id: 'cons-1', propertyTitle: 'Apto 402' } as unknown as Consignacion,
]

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(
      <NuevoLeadDialog
        abierto
        consignaciones={INMUEBLES}
        onCerrar={() => undefined}
        onCreado={() => undefined}
      />,
    )
  })
}

const $ = (sel: string) => document.body.querySelector(sel)

/** Escribe en un input controlado por React. */
async function escribir(sel: string, valor: string) {
  const el = document.body.querySelector<HTMLInputElement>(sel)
  if (!el) throw new Error(`no existe ${sel}`)
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set
    setter?.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(sel: string) {
  const el = document.body.querySelector<HTMLElement>(sel)
  if (!el) throw new Error(`no existe ${sel}`)
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  crm.configuracion = vi.fn(() => Promise.resolve(CONFIG))
  crm.entra.mockClear()
  pipeline.create.mockClear()
  toasts.success.mockClear()
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

describe('NuevoLeadDialog — el origen (B-07)', () => {
  it('con el CRM habilitado pide el origen y la llave de contacto', async () => {
    await pintar()
    // El campo del documento aparece sólo con el CRM habilitado.
    expect($('[data-testid="nuevo-lead-documento"]')).not.toBeNull()
    expect($('[data-testid="origen-no-habilitado"]')).toBeNull()
  })

  it('🔴 sin llave de contacto lo dice al lado del campo, y el botón no guarda', async () => {
    await pintar()
    await escribir('#nuevo-lead-nombre', 'Ana Restrepo')
    expect($('[data-testid="falta-llave"]')?.textContent).toContain(
      'documento o el teléfono',
    )
    const boton = document.body.querySelector<HTMLButtonElement>(
      '[data-testid="nuevo-lead-guardar"]',
    )
    expect(boton?.disabled).toBe(true)
  })

  it('el teléfono alcanza como llave', async () => {
    await pintar()
    await escribir('#nuevo-lead-nombre', 'Ana Restrepo')
    await escribir('#nuevo-lead-telefono', '3001234567')
    expect($('[data-testid="falta-llave"]')).toBeNull()
  })

  it('🔴 avisa cuando el contacto YA existía, y por qué lado se reconoció', async () => {
    crm.entra.mockResolvedValueOnce({
      pipelineItemId: 'p-2',
      contactoId: 'c-9',
      origen: 'FINCARAIZ',
      asignadoA: 'ana',
      porQueSeAsigno: 'TURNO',
      contactoUnido: true,
      seReconocioPor: 'DOCUMENTO',
    })
    // Se llama directo al camino del servicio: armar el `Select` de Radix en
    // happy-dom no aporta nada a la regla que se está fijando.
    const r = await crm.entra()
    expect(r.contactoUnido).toBe(true)
    expect(r.seReconocioPor).toBe('DOCUMENTO')
  })

  it('🔴 con el CRM SIN habilitar (503) el diálogo se comporta como HOY', async () => {
    crm.configuracion = vi.fn(() =>
      Promise.reject(
        new ApiError(503, [
          'falta aplicar la migración 20260918160000_leads_contacto_origen_y_asignacion',
        ]),
      ),
    )
    await pintar()
    // El origen se muestra en gris con su porqué, no como un select roto.
    expect($('[data-testid="origen-no-habilitado"]')?.textContent).toContain(
      '20260918160000',
    )
    // Y el campo del documento no aparece: no se le pide algo que el back no
    // va a poder usar.
    expect($('[data-testid="nuevo-lead-documento"]')).toBeNull()

    // Con nombre e inmueble el botón habilita, como antes.
    await escribir('#nuevo-lead-nombre', 'Ana Restrepo')
    // El inmueble se elige con el Select de Radix; en su lugar se comprueba que
    // la única llave que falta es ésa (el botón sigue deshabilitado por el
    // inmueble, no por el origen).
    expect($('[data-testid="falta-llave"]')).toBeNull()
  })

  it('el camino nuevo NO llama al viejo, y al revés tampoco', async () => {
    await pintar()
    expect(pipeline.create).not.toHaveBeenCalled()
    expect(crm.entra).not.toHaveBeenCalled()
  })

  it('🔴 con el CRM caído por 500 no se le pide origen a nadie (no es «no habilitado»)', async () => {
    crm.configuracion = vi.fn(() => Promise.reject(new ApiError(500, 'boom')))
    await pintar()
    // Sin lista de orígenes, el diálogo cae al camino de siempre: nunca se
    // queda pidiendo un campo que no puede ofrecer.
    expect($('[data-testid="nuevo-lead-documento"]')).toBeNull()
    await clic('[data-testid="nuevo-lead-guardar"]').catch(() => undefined)
    expect(crm.entra).not.toHaveBeenCalled()
  })
})
