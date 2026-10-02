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
import {
  avisarQueLeasefyNoResponde,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { olvidarEstadoDeLosServicios } from '@/lib/conexion/servicio-no-disponible'

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

/*
 * 01-10-2026: el micro de agentes caído dejaba «No pudimos abrir tu registro»
 * con «Código 503» abajo. Una caída tiene título humano, ningún código,
 * «Reintentar» siempre visible y el aviso de equipo sólo si el back lo dice.
 */
describe('<OnboardingProvisioningErrorBanner> ante una caída', () => {
  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    reiniciarEstadoDeConexion()
    olvidarEstadoDeLosServicios()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    reiniciarEstadoDeConexion()
  })

  const asistenteCaido = {
    mensaje: 'Lo que escribiste no se pierde. No es nada que hayas hecho; vuelve a intentar en unos minutos.',
    reintentable: true,
    status: 503,
    caida: { tipo: 'servicio' as const, servicio: 'asistente' as const },
  }

  function stubServicios(equipoAvisado: boolean) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          revisadoEn: null,
          servicios: [{ servicio: 'asistente', estado: 'caido', desde: null, equipoAvisado }],
        }),
      }),
    )
  }

  it('nombra lo caído, sin «Código 503», y deja «Reintentar» a la vista', async () => {
    stubServicios(false)
    const onRetry = vi.fn()
    await act(async () => {
      root.render(<OnboardingProvisioningErrorBanner onRetry={onRetry} fallo={asistenteCaido} />)
    })
    const t = container.textContent ?? ''
    expect(t).toContain('El asistente de Leasefy no está disponible en este momento')
    expect(t).toContain('Lo que escribiste no se pierde.')
    expect(t).not.toContain('Código')
    expect(t).not.toContain('503')
    expect(t).not.toContain('equipo')
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )
    expect(boton).toBeTruthy()
    act(() => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('dice que el equipo está avisado sólo si /health/servicios lo confirma', async () => {
    stubServicios(true)
    await act(async () => {
      root.render(<OnboardingProvisioningErrorBanner onRetry={vi.fn()} fallo={asistenteCaido} />)
    })
    expect(container.textContent).toContain('Nuestro equipo ya está avisado.')
  })

  it('con Leasefy entero caído no repite la franja: «Esperando a Leasefy…»', async () => {
    avisarQueLeasefyNoResponde()
    await act(async () => {
      root.render(
        <OnboardingProvisioningErrorBanner
          onRetry={vi.fn()}
          fallo={{ mensaje: 'x', reintentable: true, status: 0, caida: { tipo: 'conexion' } }}
        />,
      )
    })
    expect(container.textContent).toContain('Esperando a Leasefy…')
    expect(container.textContent).toContain('Reintentar')
    expect(container.textContent).not.toContain('Código')
  })
})
