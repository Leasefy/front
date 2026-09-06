/**
 * El banner tenía un solo estado: mensaje genérico + «Reintentar». Con la
 * agencia en FAILED ese botón no podía funcionar nunca — el back devuelve el
 * mismo 400 para siempre. Estos tests fijan las dos salidas.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { OnboardingProvisioningErrorBanner } from './OnboardingProvisioningErrorBanner'

let container: HTMLDivElement
let root: Root

function render(node: React.ReactElement) {
  act(() => {
    root.render(node)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('<OnboardingProvisioningErrorBanner>', () => {
  it('muestra el mensaje del back, no uno genérico', () => {
    render(
      <OnboardingProvisioningErrorBanner
        onRetry={vi.fn()}
        fallo={{ mensaje: 'El NIT es requerido.', reintentable: false, status: 400 }}
      />,
    )
    expect(container.textContent).toContain('El NIT es requerido.')
  })

  it('con un fallo terminal ofrece soporte y NO reintentar', () => {
    const onRetry = vi.fn()
    render(
      <OnboardingProvisioningErrorBanner
        onRetry={onRetry}
        fallo={{ mensaje: 'Contacta a soporte.', reintentable: false, status: 400 }}
      />,
    )
    expect(container.textContent).not.toContain('Reintentar')
    expect(container.textContent).toContain('soporte')
    expect(container.querySelector('a[href^="mailto:"]')).toBeTruthy()
  })

  it('con un fallo pasajero ofrece reintentar y lo llama', () => {
    const onRetry = vi.fn()
    render(
      <OnboardingProvisioningErrorBanner
        onRetry={onRetry}
        fallo={{ mensaje: 'Intenta en unos minutos.', reintentable: true, status: 503 }}
      />,
    )
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )
    expect(boton).toBeTruthy()
    act(() => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('enseña el código para que soporte lo pueda buscar', () => {
    render(
      <OnboardingProvisioningErrorBanner
        onRetry={vi.fn()}
        fallo={{ mensaje: 'Algo pasó.', reintentable: false, status: 400 }}
      />,
    )
    expect(container.textContent).toContain('400')
  })

  it('sin detalle del fallo se comporta como antes: reintentar', () => {
    render(<OnboardingProvisioningErrorBanner onRetry={vi.fn()} />)
    expect(container.textContent).toContain('Reintentar')
  })
})
