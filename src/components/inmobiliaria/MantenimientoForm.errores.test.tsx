/**
 * 02-10-2026 · Lo que el back rechazó al crear una solicitud se pinta bajo SU
 * campo (con el `FormError` de Cadence, que entra suave) y el primero recibe el
 * foco. Antes era un toast con el mensaje crudo y la persona tenía que adivinar
 * qué cambiar.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))
vi.mock('@/components/ui/cajon', () => ({
  CajonCuerpo: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CajonPie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

import { MantenimientoForm } from './MantenimientoForm'
import { MENSAJES_DEL_MANTENIMIENTO } from '@/lib/mantenimiento/limites-del-mantenimiento'

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

function render(erroresDelServidor?: Record<string, string>) {
  act(() => {
    root.render(
      <MantenimientoForm
        consignaciones={[]}
        onSubmit={() => {}}
        onCancel={() => {}}
        erroresDelServidor={erroresDelServidor}
      />,
    )
  })
}

describe('MantenimientoForm — los errores del servidor en su campo', () => {
  it('sin errores no se pinta nada', () => {
    render()
    expect(container.querySelector('#mantenimiento-title-error')).toBeNull()
  })

  it('🔴 el título rechazado sale bajo el título, marcado y con el foco', () => {
    render({ title: MENSAJES_DEL_MANTENIMIENTO.tituloLargo })
    expect(container.querySelector('#mantenimiento-title-error')?.textContent).toBe(
      MENSAJES_DEL_MANTENIMIENTO.tituloLargo,
    )
    const titulo = container.querySelector<HTMLInputElement>('#mantenimiento-title')!
    expect(titulo.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(titulo)
  })

  it('las fotos rechazadas salen bajo las fotos', () => {
    render({ photoUrls: MENSAJES_DEL_MANTENIMIENTO.fotosMaximas })
    expect(container.querySelector('#mantenimiento-photoUrls-error')?.textContent).toBe(
      MENSAJES_DEL_MANTENIMIENTO.fotosMaximas,
    )
  })

  it('el título no deja escribir más que la columna', () => {
    render()
    expect(container.querySelector('#mantenimiento-title')?.getAttribute('maxlength')).toBe('200')
  })
})
