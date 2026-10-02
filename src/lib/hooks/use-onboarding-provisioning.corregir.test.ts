/**
 * Volver desde el asistente a los datos de la inmobiliaria (Nico, 01-10-2026:
 * «ese salir lo saca y lo deja en el login, y él necesita editar la razón
 * social»). La inmobiliaria y la sesión del asistente ya existen: corregir no
 * puede costarle la sesión a nadie, ni siquiera si guardar la corrección falla.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { OnboardingResumePoint } from '@/lib/api/onboarding-provisioning.service'

void React

const postUsersOnboardingMock = vi.fn()
const CON_SESION: OnboardingResumePoint = {
  agentSessionId: 'sess-1',
  tenantId: 'tenant-1',
  provisioningStatus: 'ACTIVE',
  legalName: 'La Carpita Real Estate',
  nit: '123456789-6',
  onboardingCompleted: false,
  ownerFirstName: 'Policarpa',
  ownerLastName: 'Salabarrieta',
}
const getOnboardingResumePointMock = vi.fn<() => Promise<OnboardingResumePoint>>(
  async () => CON_SESION,
)
vi.mock('@/lib/api/onboarding-provisioning.service', () => ({
  postUsersOnboarding: (...args: unknown[]) => postUsersOnboardingMock(...args),
  getOnboardingResumePoint: () => getOnboardingResumePointMock(),
}))

import { ApiError } from '@/lib/api/client'
import { useOnboardingProvisioning } from './use-onboarding-provisioning'

type Hook = ReturnType<typeof useOnboardingProvisioning>

let container: HTMLDivElement
let root: Root

function renderHook(): { get: () => Hook } {
  let latest: Hook | null = null
  function TestComponent() {
    latest = useOnboardingProvisioning()
    return null
  }
  act(() => {
    root.render(React.createElement(TestComponent))
  })
  return { get: () => latest as Hook }
}

function flush() {
  return act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const CORREGIDO = {
  firstName: 'Policarpa',
  lastName: 'Salabarrieta',
  agencyName: 'La Carpita Inmobiliaria SAS',
  nit: '123456789-6',
}

beforeEach(() => {
  getOnboardingResumePointMock.mockResolvedValue(CON_SESION)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  postUsersOnboardingMock.mockReset()
})

describe('useOnboardingProvisioning — corregir los datos desde el asistente', () => {
  it('del asistente vuelve al formulario lleno, marcado como corrección', async () => {
    const { get } = renderHook()
    await flush()
    expect(get().status).toBe('ready')

    act(() => get().corregirDatos())

    expect(get().status).toBe('needs-info')
    expect(get().corrigiendo).toBe(true)
    expect(get().valoresGuardados).toMatchObject({
      razonSocial: 'La Carpita Real Estate',
      nit: '123456789-6',
      nombreCompleto: 'Policarpa Salabarrieta',
    })
  })

  it('«Volver al asistente» regresa a la misma sesión sin mandar nada', async () => {
    const { get } = renderHook()
    await flush()

    act(() => get().corregirDatos())
    act(() => get().volverAlAsistente())

    expect(get().status).toBe('ready')
    expect(get().corrigiendo).toBe(false)
    expect(get().sessionId).toBe('sess-1')
    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
  })

  it('guardar la corrección vuelve al asistente con la razón social nueva', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-1', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    act(() => get().corregirDatos())
    act(() => get().provision(CORREGIDO))
    await flush()

    expect(get().status).toBe('ready')
    expect(get().corrigiendo).toBe(false)
    expect(get().agencyPrefill).toEqual({ legalName: 'La Carpita Inmobiliaria SAS', nit: '123456789-6' })
  })

  it('si guardar la corrección falla, se queda en el formulario con el aviso y la sesión sigue', async () => {
    postUsersOnboardingMock.mockRejectedValue(
      new ApiError(500, 'No pudimos guardar los cambios.', 'INTERNAL'),
    )
    const { get } = renderHook()
    await flush()

    act(() => get().corregirDatos())
    act(() => get().provision(CORREGIDO))
    await flush()

    expect(get().status).toBe('needs-info')
    expect(get().fallo?.paraCorregir).toBe(true)
    expect(get().sessionId).toBe('sess-1')

    // Y el asistente sigue a un clic.
    act(() => get().volverAlAsistente())
    expect(get().status).toBe('ready')
  })

  it('sin sesión del asistente no hay a dónde corregir: no hace nada', async () => {
    getOnboardingResumePointMock.mockResolvedValue({
      ...CON_SESION,
      agentSessionId: null,
      provisioningStatus: null,
    })
    const { get } = renderHook()
    await flush()
    expect(get().status).toBe('needs-info')

    act(() => get().corregirDatos())
    expect(get().corrigiendo).toBe(false)
  })
})
