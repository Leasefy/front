/**
 * La lista de mantenimientos (vista de tarjetas).
 *
 * M5 — Cancelar una solicitud es un estado TERMINAL: el back no tiene
 * reapertura. Desde los tres puntos de la tarjeta se cancelaba a un clic, al
 * lado de «Ver detalles». Ahora pregunta, y la pregunta dice que no hay vuelta.
 *
 * M6 — El vacío estaba escrito a mano y, en modo `minimal` (que es como la usa
 * la página), no ofrecía ni crear ni quitar filtros: un cartel sin salida.
 *
 * De paso: la tarjeta recibía SIEMPRE una flecha por cada acción, así que el
 * menú ofrecía cotizar/cancelar aunque el padre —sin permiso de edición— no
 * mandara nada. Una acción sin quien la atienda no se ofrece.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { SolicitudMantenimiento } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
  }),
}))

import { MantenimientoList } from './MantenimientoList'

function hacerSolicitud(overrides: Partial<SolicitudMantenimiento> = {}): SolicitudMantenimiento {
  return {
    id: 'sol-1',
    consignacionId: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'own-1',
    tenantId: 'ten-1',
    propertyTitle: 'Apto 402 — Laureles',
    propertyAddress: 'Cra 76 #34-12',
    tenantName: 'Camila Restrepo',
    propietarioName: 'Ana Dueña',
    type: 'plumbing',
    priority: 'medium',
    status: 'reported',
    title: 'Gotera en el baño',
    description: 'El sifón del lavamanos gotea',
    photoUrls: [],
    quotes: [],
    paidBy: 'owner',
    createdAt: '2026-09-12T10:00:00.000Z',
    updatedAt: '2026-09-12T10:00:00.000Z',
    ...overrides,
  } as SolicitudMantenimiento
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function montar(props: Partial<React.ComponentProps<typeof MantenimientoList>> = {}) {
  await act(async () => {
    root.render(<MantenimientoList data={[hacerSolicitud()]} minimal {...props} />)
  })
}

/** El disparador de Radix abre con `pointerdown`, no con `click`. */
async function abrirMenu() {
  const disparador = container.querySelector<HTMLElement>('[aria-haspopup="menu"]')
  expect(disparador).not.toBeNull()
  await act(async () => {
    disparador!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
    )
  })
}

const itemsDelMenu = () => [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
const item = (clave: string) => itemsDelMenu().find((el) => (el.textContent ?? '').includes(clave))

describe('M5 — cancelar desde la tarjeta pide confirmación', () => {
  it('el ítem «Cancelar solicitud» NO cancela: abre la pregunta, que dice que no se puede reabrir', async () => {
    const onCancel = vi.fn()
    await montar({ onCancel })
    await abrirMenu()

    await act(async () => {
      item('cancelRequest')!.click()
    })

    expect(onCancel).not.toHaveBeenCalled()
    const dialogo = document.body.querySelector('[data-testid="confirmar-cancelar-solicitud"]')
    expect(dialogo).not.toBeNull()
    expect(dialogo!.textContent).toContain('no se puede reabrir')
    expect(dialogo!.textContent).toContain('Gotera en el baño')
  })

  it('confirmar sí cancela, con la solicitud de la tarjeta', async () => {
    const onCancel = vi.fn()
    await montar({ onCancel })
    await abrirMenu()
    await act(async () => {
      item('cancelRequest')!.click()
    })

    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="confirmar-cancelar-solicitud-si"]')!.click()
    })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCancel.mock.calls[0]![0]).toMatchObject({ id: 'sol-1' })
  })

  it('sin quien atienda cancelar o cotizar (sin permiso de edición), el menú no los ofrece', async () => {
    await montar({ onViewDetails: vi.fn() })
    await abrirMenu()

    expect(item('viewDetails') ?? itemsDelMenu()[0]).toBeDefined()
    expect(item('cancelRequest')).toBeUndefined()
    expect(item('addQuote')).toBeUndefined()
  })
})

describe('M6 — el vacío tiene salida', () => {
  it('sin solicitudes, en modo minimal, ofrece crear la primera', async () => {
    const onCrear = vi.fn()
    await montar({ data: [], onCrear })

    const vacio = container.querySelector('[data-testid="sin-datos"]')
    expect(vacio).not.toBeNull()
    expect(vacio!.getAttribute('data-caso')).toBe('vacio')

    await act(async () => {
      container.querySelector<HTMLElement>('[data-testid="crear-el-primero"]')!.click()
    })
    expect(onCrear).toHaveBeenCalledTimes(1)
  })

  it('con un filtro que no deja ver nada, ofrece quitarlo en vez de «crear el primero»', async () => {
    await montar({ minimal: false, onCrear: vi.fn() })

    const buscador = container.querySelector<HTMLInputElement>('input')
    expect(buscador).not.toBeNull()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(buscador, 'nada-coincide-con-esto')
      buscador!.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const vacio = container.querySelector('[data-testid="sin-datos"]')
    expect(vacio!.getAttribute('data-caso')).toBe('filtros')
    expect(container.querySelector('[data-testid="crear-el-primero"]')).toBeNull()

    await act(async () => {
      container.querySelector<HTMLElement>('[data-testid="limpiar-filtros"]')!.click()
    })
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()
    expect(container.textContent).toContain('Gotera en el baño')
  })
})

describe('Quién gestiona la reparación (Portofino, 29-10-2026)', () => {
  const marca = () => container.querySelector<HTMLElement>('[data-testid="marca-de-la-gestion"]')

  it('la tarjeta de la que gestiona otro lleva «Gestiona: …»; la de la inmobiliaria, nada', async () => {
    await montar({ data: [hacerSolicitud({ gestionadoPor: 'administracion' })] })
    expect(marca()!.textContent).toBe('Gestiona: la administración')

    await montar({ data: [hacerSolicitud({ gestionadoPor: 'inmobiliaria' })] })
    expect(marca()).toBeNull()
  })

  it('«la hace el propietario» (22-10) se ve con la misma marca, una sola vez', async () => {
    await montar({
      data: [
        hacerSolicitud({
          laHaceElPropietario: { loDecidio: 'INMOBILIARIA', nota: null, desde: '2026-10-27T10:00:00.000Z', terminadaAt: null, terminadaNota: null },
        }),
      ],
    })
    expect(container.querySelectorAll('[data-testid="marca-de-la-gestion"]')).toHaveLength(1)
    expect(marca()!.textContent).toBe('Gestiona: el propietario')
    expect(container.textContent).not.toContain('La hace el propietario')
  })

  it('el menú no ofrece cotizar ni aprobar una que gestiona otro', async () => {
    await montar({
      data: [hacerSolicitud({ status: 'reported', gestionadoPor: 'propietario' })],
      onAddQuote: vi.fn(),
      onApproveQuote: vi.fn(),
      onCancel: vi.fn(),
    })
    await abrirMenu()
    expect(item('addQuote')).toBeUndefined()
    expect(item('cancelRequest')).toBeDefined()
  })

  it('la de la inmobiliaria sí ofrece cotizar, como siempre', async () => {
    await montar({ data: [hacerSolicitud({ status: 'reported' })], onAddQuote: vi.fn() })
    await abrirMenu()
    expect(item('addQuote')).toBeDefined()
  })
})
