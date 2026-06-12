/**
 * EmptyState tests — Phase 38 plan 38-02 (D-38-03 / D-38-04).
 *
 * Strategy: mount in happy-dom via createRoot + act (no @testing-library/react in mvp).
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Phosphor icon stub — we only need a no-op component for the icon prop.
const FakeIcon: React.FC<{ className?: string; size?: string | number; weight?: string }> = (
  props,
) => React.createElement('span', { 'data-testid': 'fake-icon', ...props })

import { EmptyState } from './EmptyState'

void React

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

describe('EmptyState', () => {
  it('renders icon, title, description in a container with role=status and aria-label=title', () => {
    act(() => {
      root.render(
        React.createElement(EmptyState, {
          icon: FakeIcon,
          title: 'No hay deudores aún',
          description: 'Importá una cartera CSV o agregá manualmente.',
        }),
      )
    })

    const status = container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.getAttribute('aria-label')).toBe('No hay deudores aún')

    expect(container.textContent ?? '').toContain('No hay deudores aún')
    expect(container.textContent ?? '').toContain('Importá una cartera CSV o agregá manualmente.')

    expect(container.querySelector('[data-testid="fake-icon"]')).not.toBeNull()
  })

  it('renders primaryCta as an anchor when href is provided', () => {
    act(() => {
      root.render(
        React.createElement(EmptyState, {
          icon: FakeIcon,
          title: 'No hay cotizaciones',
          description: 'Generá la primera.',
          primaryCta: { label: 'Nueva cotización', href: '/panel/inmobiliaria/ai/cotizador/nueva' },
        }),
      )
    })

    const anchor = container.querySelector('a[href="/panel/inmobiliaria/ai/cotizador/nueva"]')
    expect(anchor).not.toBeNull()
    expect(anchor?.textContent).toBe('Nueva cotización')
  })

  it('renders primaryCta as a button when onClick is provided (no href)', () => {
    const handle = vi.fn()
    act(() => {
      root.render(
        React.createElement(EmptyState, {
          icon: FakeIcon,
          title: 'Sin suscriptores',
          description: 'Agregá emails.',
          primaryCta: { label: 'Agregar suscriptor', onClick: handle },
        }),
      )
    })

    const btn = container.querySelector('button[type="button"]')
    expect(btn).not.toBeNull()
    expect(btn?.textContent).toBe('Agregar suscriptor')

    act(() => {
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(handle).toHaveBeenCalledTimes(1)
  })

  it('renders secondaryCta only when provided', () => {
    // First render WITHOUT secondaryCta
    act(() => {
      root.render(
        React.createElement(EmptyState, {
          icon: FakeIcon,
          title: 'No hay pagos',
          description: 'Los pagos aparecerán acá.',
          primaryCta: { label: 'Ver deudores', href: '/panel/inmobiliaria/ai/cobranza/deudores' },
        }),
      )
    })
    const ctasWithoutSecondary = container.querySelectorAll('a, button[type="button"]')
    expect(ctasWithoutSecondary).toHaveLength(1)

    // Then re-render WITH secondaryCta
    act(() => {
      root.render(
        React.createElement(EmptyState, {
          icon: FakeIcon,
          title: 'No hay pagos',
          description: 'Los pagos aparecerán acá.',
          primaryCta: { label: 'Ver deudores', href: '/panel/inmobiliaria/ai/cobranza/deudores' },
          secondaryCta: { label: 'Ver historial', href: '/panel/inmobiliaria/ai/cobranza/pagos?view=history' },
        }),
      )
    })
    const ctasWithSecondary = container.querySelectorAll('a, button[type="button"]')
    expect(ctasWithSecondary).toHaveLength(2)
  })
})
