/**
 * El calce (G-02).
 *
 * 🔴 Lo que fija este test es la distinción que decide si un asesor consigue el
 * dato o cierra la pestaña: **un requisito que falta NO es «sin resultados»**.
 * «Falta el presupuesto» suena a trabajo por hacer; «no hay inmuebles» suena a
 * que el portafolio está vacío, que es falso.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api } = vi.hoisted(() => ({
  api: {
    pesos: (() => Promise.resolve(null)) as () => Promise<unknown>,
    paraElLead: (() => Promise.resolve(null)) as () => Promise<unknown>,
    paraElInmueble: (() => Promise.resolve(null)) as () => Promise<unknown>,
  },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    matchingApi: {
      pesos: () => api.pesos(),
      paraElLead: () => api.paraElLead(),
      paraElInmueble: () => api.paraElInmueble(),
    },
  }
})

import { CalceClient } from './CalceClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const PESOS = {
  pesos: { zona: 40, fecha: 20, habitaciones: 20, tipo: 10, holgura: 10 },
  configurados: false,
  requisitos: [
    'El costo mensual (canon + administración) no puede pasar su presupuesto.',
    'El canon no puede pasar el tope asegurable de su estudio.',
  ],
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<CalceClient />)
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)
async function escribir(sel: string, valor: string) {
  const el = contenedor.querySelector<HTMLInputElement>(sel)
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

beforeEach(() => {
  api.pesos = vi.fn(() => Promise.resolve(PESOS))
  api.paraElLead = vi.fn(() => Promise.resolve(null))
  api.paraElInmueble = vi.fn(() => Promise.resolve(null))
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

describe('CalceClient', () => {
  it('🔴 dice qué NO se configura: los requisitos son una puerta, no un peso', async () => {
    await pintar()
    expect(contenedor.textContent).toContain('Requisitos (no se configuran)')
    expect(contenedor.textContent).toContain('tope asegurable')
  })

  it('los pesos se muestran, y avisa cuando son los de por defecto', async () => {
    await pintar()
    expect(contenedor.textContent).toContain('los de por defecto')
    expect(contenedor.textContent).toContain('zona: 40')
  })

  it('🔴 un requisito que falta NO se pinta como «sin resultados»', async () => {
    api.paraElLead = vi.fn(() =>
      Promise.resolve({
        lead: { pipelineItemId: 'p-1', nombre: 'Ana', correo: null },
        busca: { presupuestoCop: null, topeAsegurableCop: 1_800_000 },
        presupuestoDicho: false,
        falta: {
          code: 'SIN_PRESUPUESTO',
          message:
            'Falta saber cuánto puede pagar: sin presupuesto, mandarle opciones es mandarle ruido.',
        },
        opciones: [],
      }),
    )
    await pintar()
    await escribir('[data-testid="input-lead"]', 'p-1')
    const aviso = $('[data-testid="falta-requisito"]')?.textContent ?? ''
    expect(aviso).toContain('Todavía no se le puede mandar nada')
    expect(aviso).toContain('cuánto puede pagar')
    expect(contenedor.textContent).not.toContain('Ningún inmueble le calza hoy')
  })

  it('cada opción viene con su PORQUÉ: es lo que se copia al mensaje', async () => {
    api.paraElLead = vi.fn(() =>
      Promise.resolve({
        lead: { pipelineItemId: 'p-1', nombre: 'Ana', correo: null },
        busca: { presupuestoCop: 2_000_000, topeAsegurableCop: 1_800_000 },
        presupuestoDicho: true,
        falta: null,
        opciones: [
          {
            propertyId: 'inm-1',
            puntaje: 87,
            porQue: ['Está en Laureles, una de las zonas que pidió'],
            inmueble: {
              title: 'Apto 402',
              neighborhood: 'Laureles',
              city: 'Medellín',
              monthlyRent: 1_500_000,
              adminFee: 250_000,
              bedrooms: 3,
            },
          },
        ],
      }),
    )
    await pintar()
    await escribir('[data-testid="input-lead"]', 'p-1')
    const opcion = $('[data-testid="opcion-inm-1"]')?.textContent ?? ''
    expect(opcion).toContain('87 %')
    expect(opcion).toContain('una de las zonas que pidió')
    // Y dice de dónde salió el presupuesto.
    expect(contenedor.textContent).toContain('lo dijo él')
  })

  it('🔴 distingue el presupuesto DEDUCIDO del dicho', async () => {
    api.paraElLead = vi.fn(() =>
      Promise.resolve({
        lead: { pipelineItemId: 'p-1', nombre: 'Ana', correo: null },
        busca: { presupuestoCop: 2_000_000, topeAsegurableCop: 1_800_000 },
        presupuestoDicho: false,
        falta: null,
        opciones: [],
      }),
    )
    await pintar()
    await escribir('[data-testid="input-lead"]', 'p-1')
    expect(contenedor.textContent).toContain('deducido del inmueble')
  })

  it('un inmueble que no se puede ofrecer lo dice con su motivo', async () => {
    api.paraElInmueble = vi.fn(() =>
      Promise.resolve({
        ofrecible: false,
        motivo:
          'Ese inmueble no está ofrecible hoy: o no tiene mandato de arriendo activo, o está arrendado sin fecha de salida.',
        leads: [],
      }),
    )
    await pintar()
    await escribir('[data-testid="input-inmueble"]', 'inm-9')
    expect($('[data-testid="no-ofrecible"]')?.textContent).toContain(
      'sin fecha de salida',
    )
  })
})
