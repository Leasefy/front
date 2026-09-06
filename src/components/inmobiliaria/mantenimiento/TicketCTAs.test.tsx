/**
 * TicketCTAs.test.tsx — Phase 7 plan 07-04 (DASH-03)
 *
 * Pins the CTA contract (threats T-07-01 tampering / T-07-02 close-gate):
 *   1. estado='proveedor_sugerido' → "asignar" is enabled; clicking it calls
 *      onAsignar exactly once (proveedor_sugerido is the only allowed origin for
 *      asignar per the imported CTA_ALLOWED_FROM).
 *   2. estado='cerrado' (terminal) → ALL action CTAs are disabled.
 *   3. estado='resuelto' → clicking "cerrar" does NOT call onCerrar until the
 *      confirm button inside the FENCE-04 Dialog is clicked.
 *   4. estado='resuelto' → "escalar" calls onEscalar exactly once (no Dialog).
 *
 * The gating origins come from CTA_ALLOWED_FROM in @/lib/types/mantenimiento
 * (07-01) — this component imports them; it never hardcodes a local set.
 *
 * createRoot + act pattern; @testing-library/react is NOT installed.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { TicketCTAs } from './TicketCTAs'

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

function noop() {}

function render(props: Partial<React.ComponentProps<typeof TicketCTAs>> & { estado: React.ComponentProps<typeof TicketCTAs>['estado'] }) {
  act(() => {
    root.render(
      React.createElement(TicketCTAs, {
        onAsignar: noop,
        onPedirInfo: noop,
        onSolicitarAprobacion: noop,
        onEscalar: noop,
        onCerrar: noop,
        ...props,
      }),
    )
  })
}

/** Query inside the local container OR the portal (Radix Dialog portals to body). */
function find(testid: string): HTMLElement | null {
  return (
    container.querySelector<HTMLElement>(`[data-testid="${testid}"]`) ??
    document.body.querySelector<HTMLElement>(`[data-testid="${testid}"]`)
  )
}

describe('<TicketCTAs>', () => {
  it('enables asignar on proveedor_sugerido and calls onAsignar once on click', () => {
    const onAsignar = vi.fn()
    render({ estado: 'proveedor_sugerido', onAsignar })
    const btn = find('cta-asignar') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.disabled).toBe(false)
    act(() => {
      btn.click()
    })
    expect(onAsignar).toHaveBeenCalledTimes(1)
  })

  it('disables all action CTAs when estado is terminal (cerrado)', () => {
    render({ estado: 'cerrado' })
    for (const id of ['cta-asignar', 'cta-pedir-info', 'cta-solicitar-aprobacion', 'cta-escalar', 'cta-cerrar']) {
      const btn = find(id) as HTMLButtonElement
      expect(btn, id).not.toBeNull()
      expect(btn.disabled, id).toBe(true)
    }
  })

  it('does NOT call onCerrar until the FENCE-04 confirm is clicked', () => {
    const onCerrar = vi.fn()
    render({ estado: 'resuelto', onCerrar })
    const cerrarBtn = find('cta-cerrar') as HTMLButtonElement
    expect(cerrarBtn.disabled).toBe(false)
    act(() => {
      cerrarBtn.click()
    })
    // Dialog open but not confirmed yet → no call
    expect(onCerrar).not.toHaveBeenCalled()
    const confirmBtn = find('cta-cerrar-confirm') as HTMLButtonElement
    expect(confirmBtn).not.toBeNull()
    act(() => {
      confirmBtn.click()
    })
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('escalar calls onEscalar once with no Dialog', () => {
    const onEscalar = vi.fn()
    render({ estado: 'resuelto', onEscalar })
    const btn = find('cta-escalar') as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    act(() => {
      btn.click()
    })
    expect(onEscalar).toHaveBeenCalledTimes(1)
  })

  /**
   * 🔴 Con `motivoDeshabilitado` NINGÚN botón acciona, ni siquiera desde un
   * estado que la máquina permite.
   *
   * Es la única forma honesta de tener acá cinco botones: el micro sirve estos
   * tickets sólo por GET y el estado vive en el back detrás de un rail S2S que
   * el navegador no puede usar. Antes los botones cambiaban el estado LOCAL y
   * escribían en el historial que se había avisado al proveedor. Si alguien
   * saca la guarda, esto se pone rojo.
   */
  it('motivoDeshabilitado apaga las 5 acciones y muestra el porqué', () => {
    const spies = {
      onAsignar: vi.fn(),
      onPedirInfo: vi.fn(),
      onSolicitarAprobacion: vi.fn(),
      onEscalar: vi.fn(),
      onCerrar: vi.fn(),
    }
    render({
      estado: 'proveedor_sugerido',
      motivoDeshabilitado: 'Desde acá el ticket sólo se mira.',
      ...spies,
    })

    const motivo = container.querySelector('[data-testid="cta-motivo-deshabilitado"]')
    expect(motivo).not.toBeNull()
    expect(motivo!.textContent).toContain('sólo se mira')

    for (const testid of [
      'cta-asignar',
      'cta-pedir-info',
      'cta-solicitar-aprobacion',
      'cta-escalar',
      'cta-cerrar',
    ]) {
      const boton = container.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)
      expect(boton).not.toBeNull()
      expect(boton!.disabled).toBe(true)
      act(() => {
        boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
    }

    // Ni un handler llamado, y el diálogo de cierre nunca se abre.
    for (const spy of Object.values(spies)) expect(spy).not.toHaveBeenCalled()
    expect(container.querySelector('[data-testid="cta-cerrar-dialog"]')).toBeNull()
  })
})
