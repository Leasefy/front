/**
 * @vitest-environment happy-dom
 *
 * Los pasos del asistente le hablan DIRECTO al micro de agentes. Con el micro
 * caído (01-10-2026) el banner decía «El servicio no está disponible» y el
 * texto crudo del micro. Ahora es la capa 2 con servicio `asistente`.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingSessionError } from '@/lib/api/onboarding-session.service'
import { reiniciarEstadoDeConexion } from '@/lib/conexion/estado-de-conexion'
import { olvidarEstadoDeLosServicios } from '@/lib/conexion/servicio-no-disponible'
import { OnboardingSessionErrorBanner } from './OnboardingSessionErrorBanner'

void React

let container: HTMLDivElement
let root: Root

function stubServicios(equipoAvisado: boolean) {
  const f = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      revisadoEn: null,
      servicios: [{ servicio: 'asistente', estado: 'caido', desde: null, equipoAvisado }],
    }),
  })
  vi.stubGlobal('fetch', f)
  return f
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  reiniciarEstadoDeConexion()
  olvidarEstadoDeLosServicios()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  reiniciarEstadoDeConexion()
})

async function render(error: OnboardingSessionError, onRetry = vi.fn()) {
  await act(async () => {
    root.render(<OnboardingSessionErrorBanner error={error} onRetry={onRetry} />)
  })
  return onRetry
}

describe('<OnboardingSessionErrorBanner> con el micro de agentes caído', () => {
  it.each([
    ['503 del micro', new OnboardingSessionError('unavailable', 503, 'database unavailable')],
    ['el micro no contesta', new OnboardingSessionError('network', null, 'No se pudo conectar')],
    ['502 del proxy del micro', new OnboardingSessionError('unknown', 502, 'Bad Gateway')],
  ])('%s: nombra al asistente, sin jerga, con reintentar', async (_caso, error) => {
    stubServicios(false)
    const onRetry = await render(error)
    const t = container.textContent ?? ''
    expect(t).toContain('El asistente de Leasefy no está disponible en este momento')
    expect(t).toContain('No es nada que hayas hecho')
    expect(t).not.toMatch(/database|Bad Gateway|50\d/)
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reintentar'),
    )
    act(() => {
      boton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('«Nuestro equipo ya está avisado» sólo con la confirmación del back', async () => {
    stubServicios(true)
    await render(new OnboardingSessionError('unavailable', 503, 'x'))
    expect(container.textContent).toContain('Nuestro equipo ya está avisado.')
  })

  it('sin internet no culpa al asistente ni le pregunta al back', async () => {
    const f = stubServicios(true)
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    window.dispatchEvent(new Event('offline'))
    await render(new OnboardingSessionError('network', null, 'x'))
    expect(container.textContent).toContain('Esperando la conexión…')
    expect(container.textContent).not.toContain('asistente')
    expect(f).not.toHaveBeenCalled()
  })

  it('un 500 del micro sigue siendo «un error inesperado»', async () => {
    await render(new OnboardingSessionError('unknown', 500, 'boom'))
    expect(container.querySelector('[data-testid="onboarding-error-banner-unknown"]')).not.toBeNull()
  })
})
