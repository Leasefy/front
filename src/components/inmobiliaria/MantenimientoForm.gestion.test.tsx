/**
 * «¿Quién gestiona la reparación?» al crear la solicitud (reunión con
 * Portofino, Nico 29-10-2026): selección única y a la vista, por defecto la
 * inmobiliaria. Con otro, «quién paga» deja de aplicar (no hay cotizaciones,
 * descuentos ni cobros) y el campo viaja al back; con la inmobiliaria, no viaja
 * (un back anterior sigue recibiendo lo de siempre).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))
vi.mock('@/components/ui/cajon', () => ({
  CajonCuerpo: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
// La salida de framer no termina en happy-dom: se prueba quién se monta.
vi.mock('framer-motion', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  return {
    ...original,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  }
})
// Cada opción de radio, un botón (como en las pruebas de las fotos).
vi.mock('@leasefy/cadence', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>()
  const Elegir = React.createContext<(v: string) => void>(() => {})
  return {
    ...original,
    RadioCardGroup: ({
      children,
      onValueChange,
    }: {
      children?: React.ReactNode
      onValueChange: (v: string) => void
    }) => <Elegir.Provider value={onValueChange}>{children}</Elegir.Provider>,
    RadioCard: function Opcion({ value }: { value: string }) {
      const elegir = React.useContext(Elegir)
      return (
        <button type="button" data-testid={`opcion-${value}`} onClick={() => elegir(value)}>
          {value}
        </button>
      )
    },
  }
})
// El proveedor no es de esta prueba (busca en la red).
vi.mock('@/components/inmobiliaria/mantenimiento/ProveedorDeLaSolicitud', () => ({
  ProveedorDeLaSolicitud: () => null,
}))

import { MantenimientoForm, type MantenimientoFormData } from './MantenimientoForm'

const CONSIGNACION = {
  id: 'cons-1',
  propertyId: 'prop-1',
  propertyTitle: 'Apto 402 — Laureles',
  propertyAddress: 'Cra 76 #34-12',
} as Consignacion

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(erroresDelServidor?: Record<string, string>) {
  const onSubmit = vi.fn<(d: MantenimientoFormData) => void>()
  act(() => {
    root.render(
      <MantenimientoForm
        consignaciones={[CONSIGNACION]}
        preselectedConsignacionId="cons-1"
        onSubmit={onSubmit}
        onCancel={() => {}}
        erroresDelServidor={erroresDelServidor}
      />,
    )
  })
  return { onSubmit }
}

const $ = <T extends HTMLElement>(sel: string) => container.querySelector(sel) as T | null

async function clic(sel: string) {
  await act(async () => {
    $<HTMLButtonElement>(sel)!.click()
  })
}

async function escribir(sel: string, valor: string) {
  const el = $<HTMLInputElement | HTMLTextAreaElement>(sel)!
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function llenarYCrear() {
  await clic('[data-testid="opcion-plumbing"]')
  await clic('[data-testid="opcion-medium"]')
  await escribir('#mantenimiento-title', 'Filtración por la fachada')
  await escribir('#mantenimiento-description', 'Entra agua por la ventana del estudio cuando llueve.')
  await act(async () => {
    $<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('MantenimientoForm — quién gestiona la reparación', () => {
  it('las cuatro opciones se ven de una, y «quién paga» también (por defecto, la inmobiliaria)', () => {
    montar()
    expect($('[data-testid="seccion-quien-gestiona"]')!.textContent).toContain('¿Quién gestiona la reparación?')
    for (const g of ['inmobiliaria', 'propietario', 'administracion', 'inquilino']) {
      expect($(`[data-testid="opcion-${g}"]`)).not.toBeNull()
    }
    expect($('[data-testid="opcion-owner"]')).not.toBeNull()
    expect($('[data-testid="gestion-de-otro-que-cambia"]')).toBeNull()
  })

  it('con la inmobiliaria el campo NO viaja (un back anterior recibe lo de siempre)', async () => {
    const { onSubmit } = montar()
    await llenarYCrear()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('gestionadoPor')
  })

  it('con la administración: dice qué cambia, pliega «quién paga» y el campo viaja', async () => {
    const { onSubmit } = montar()
    await clic('[data-testid="opcion-administracion"]')
    expect($('[data-testid="gestion-de-otro-que-cambia"]')!.textContent).toContain('seguimiento por avisos')
    expect($('[data-testid="opcion-owner"]')).toBeNull()

    await llenarYCrear()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ gestionadoPor: 'administracion', consignacionId: 'cons-1' })
  })

  it('volver a la inmobiliaria trae de vuelta «quién paga»', async () => {
    montar()
    await clic('[data-testid="opcion-propietario"]')
    await clic('[data-testid="opcion-inmobiliaria"]')
    expect($('[data-testid="opcion-owner"]')).not.toBeNull()
  })

  it('lo que el back rechace de este campo sale bajo la sección', () => {
    montar({ gestionadoPor: 'Escoge quién gestiona la reparación: inmobiliaria, propietario, administración o inquilino.' })
    expect($('#mantenimiento-gestionadoPor-error')!.textContent).toContain('Escoge quién gestiona la reparación')
  })
})
