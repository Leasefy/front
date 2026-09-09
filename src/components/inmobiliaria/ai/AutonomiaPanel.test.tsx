/**
 * AutonomiaPanel.test.tsx — F6 workspace primitives.
 *
 * Covers the 4 render states (loading / error / not-available / happy), the
 * valla rows, the nota and the T-323 callout — and el modo en sus DOS formas:
 * chip de lectura (sin escritura o sin permiso) y control real (con
 * `onCambiarModo` + `puedeCambiar`), que confirma al subir de autonomía y no
 * al bajar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Resolve chrome via the REAL es.json so literal assertions keep verifying
// the byte-identical es output (stub avoids the provider's localStorage effect).
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))

import { AutonomiaPanel } from './AutonomiaPanel'
import { I18nProvider } from '@/lib/i18n'
import type { AgentAutonomiaResponse } from '@/lib/api/agent-workspace'

const DATA: AgentAutonomiaResponse = {
  agente: 'conciliacion',
  modo: 'copiloto',
  modosDisponibles: ['sombra', 'copiloto', 'autonomo'],
  valla: [
    { id: 'v1', label: 'Monto máximo auto-conciliable', value: '$0 (apagado)', estado: 'activo' },
    { id: 'v2', label: 'Auto-match', value: 'sombra', estado: 'inactivo' },
  ],
  t323: true,
  nota: 'Todos los agentes operan en Copiloto hasta certificar la valla.',
  generatedAt: new Date().toISOString(),
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  toastMock.success.mockClear()
  toastMock.error.mockClear()
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

function render(props: Partial<React.ComponentProps<typeof AutonomiaPanel>> = {}) {
  act(() => {
    // Real I18nProvider (default 'es') — assertions check byte-identical es chrome.
    root.render(
      React.createElement(I18nProvider, null, React.createElement(AutonomiaPanel, { data: null, ...props })),
    )
  })
}

const radios = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="radio"]'))

describe('AutonomiaPanel — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="autonomia-panel-loading"]')).not.toBeNull()
  })

  it('renders the house error card (FalloDeCarga), not a raw banner', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="autonomia-panel-error"]')
    expect(err).not.toBeNull()
    expect(err!.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    // El mensaje crudo del backend queda para diagnóstico, no en pantalla.
    expect(err!.querySelector('[data-testid="fallo-detalle-tecnico"]')!.textContent).toContain('500')
  })

  it('renders the friendly not-available panel when data is null (404)', () => {
    render({ data: null })
    const empty = container.querySelector('[data-testid="autonomia-panel-empty"]')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toContain('aún no está disponible')
    expect(container.querySelector('[data-testid="autonomia-panel-error"]')).toBeNull()
  })
})

describe('AutonomiaPanel — modo como chip de lectura', () => {
  it('sin escritura: un solo chip con el modo activo y NINGÚN control', () => {
    render({ data: DATA })
    const copiloto = container.querySelector('[data-testid="autonomia-modo-copiloto"]')!
    expect(copiloto.getAttribute('aria-current')).toBe('true')
    expect(copiloto.textContent).toContain('Copiloto')
    // Las otras dos ya no se pintan: parecían botones y no hacían nada.
    expect(container.querySelector('[data-testid="autonomia-modo-sombra"]')).toBeNull()
    expect(container.querySelector('[data-testid="autonomia-modo-autonomo"]')).toBeNull()
    expect(radios()).toHaveLength(0)
    // Y dice dónde se cambia.
    expect(container.querySelector('[data-testid="autonomia-donde-se-cambia"]')!.textContent).toContain(
      'administrador',
    )
  })

  it('con escritura pero SIN permiso: sigue siendo chip', () => {
    render({ data: DATA, onCambiarModo: vi.fn(), puedeCambiar: false })
    expect(radios()).toHaveLength(0)
    expect(container.querySelector('[data-testid="autonomia-modo-copiloto"]')).not.toBeNull()
  })

  it('renders the nota, the valla rows and the T-323 callout', () => {
    render({ data: DATA })

    expect(container.querySelector('[data-testid="autonomia-nota"]')!.textContent).toContain(
      'Copiloto hasta certificar',
    )

    const v1 = container.querySelector('[data-testid="autonomia-valla-v1"]')!
    expect(v1.textContent).toContain('Monto máximo auto-conciliable')
    expect(v1.textContent).toContain('$0 (apagado)')

    const t323 = container.querySelector('[data-testid="autonomia-t323"]')!
    expect(t323.textContent).toContain('T-323/2024')
  })

  it('pinta lo que cambia HOY con el modo (efectoReal del micro) y lo omite si no viene', () => {
    render({ data: { ...DATA, efectoReal: 'Prepara las opciones y las deja en la cola esperando tu visto bueno.' } })
    expect(container.querySelector('[data-testid="autonomia-efecto-real"]')!.textContent).toContain(
      'esperando tu visto bueno',
    )

    render({ data: DATA })
    expect(container.querySelector('[data-testid="autonomia-efecto-real"]')).toBeNull()
  })

  it('omits the T-323 callout when t323 is false', () => {
    render({ data: { ...DATA, t323: false } })
    expect(container.querySelector('[data-testid="autonomia-t323"]')).toBeNull()
  })

  it('renders the ACTIVE mode hint as visible text (tooltips are invisible on touch)', () => {
    render({ data: DATA })
    const hint = container.querySelector('[data-testid="autonomia-modo-hint"]')
    expect(hint).not.toBeNull()
    // copiloto is the active mode → its hint shows
    expect(hint!.textContent).toContain('Sugiere; nada se aplica sin un humano')
    // the title= tooltip on the chip is kept
    expect(
      container.querySelector('[data-testid="autonomia-modo-copiloto"]')!.getAttribute('title'),
    ).toContain('Sugiere')
  })

  it('renders the sombra hint when sombra is the active mode', () => {
    render({ data: { ...DATA, modo: 'sombra' } })
    expect(container.querySelector('[data-testid="autonomia-modo-hint"]')!.textContent).toContain(
      'Solo observa y sugiere en silencio',
    )
  })
})

describe('AutonomiaPanel — modo como control real', () => {
  it('con escritura y permiso: el control del DS con los modos disponibles', () => {
    render({ data: DATA, onCambiarModo: vi.fn(), puedeCambiar: true })
    const opciones = radios()
    expect(opciones).toHaveLength(3)
    expect(opciones.map((r) => r.textContent?.trim())).toEqual([
      '🌑 Manual',
      '🤝 Copiloto',
      '🚀 Autónomo',
    ])
    expect(container.querySelector('[data-testid="autonomia-donde-se-cambia"]')).toBeNull()
  })

  it('sólo ofrece los modos que el micro declara disponibles', () => {
    render({
      data: { ...DATA, modosDisponibles: ['sombra', 'copiloto'] },
      onCambiarModo: vi.fn(),
      puedeCambiar: true,
    })
    expect(radios().map((r) => r.textContent?.trim())).toEqual(['🌑 Manual', '🤝 Copiloto'])
  })

  it('bajar de autonomía es un clic: llama a la escritura sin confirmar', async () => {
    const onCambiarModo = vi.fn(async () => ({ ok: true }))
    render({ data: DATA, onCambiarModo, puedeCambiar: true })
    const sombra = radios().find((r) => r.textContent?.includes('Manual'))!
    await act(async () => {
      sombra.click()
    })
    expect(onCambiarModo).toHaveBeenCalledWith('sombra')
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(toastMock.success).toHaveBeenCalled()
  })

  it('subir a autónomo PIDE confirmación y recién entonces escribe', async () => {
    const onCambiarModo = vi.fn(async () => ({ ok: true }))
    render({ data: DATA, onCambiarModo, puedeCambiar: true })
    const autonomo = radios().find((r) => r.textContent?.includes('Autónomo'))!
    await act(async () => {
      autonomo.click()
    })
    // Todavía no se escribió nada: hay un diálogo del DS, no window.confirm.
    expect(onCambiarModo).not.toHaveBeenCalled()
    const dialogo = document.querySelector('[role="alertdialog"]')
    expect(dialogo).not.toBeNull()
    expect(dialogo!.textContent).toContain('¿Pasar a Autónomo?')

    await act(async () => {
      ;(document.querySelector('[data-testid="autonomia-confirmar"]') as HTMLElement).click()
    })
    expect(onCambiarModo).toHaveBeenCalledWith('autonomo')
    expect(toastMock.success).toHaveBeenCalled()
  })

  it('si la escritura falla, avisa por el toast de error', async () => {
    const onCambiarModo = vi.fn(async () => ({ ok: false, error: '403' }))
    render({ data: DATA, onCambiarModo, puedeCambiar: true })
    const sombra = radios().find((r) => r.textContent?.includes('Manual'))!
    await act(async () => {
      sombra.click()
    })
    expect(toastMock.error).toHaveBeenCalled()
    expect(String(toastMock.error.mock.calls[0][0])).toContain('403')
  })
})
