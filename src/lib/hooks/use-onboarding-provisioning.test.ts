/**
 * use-onboarding-provisioning.test.ts — provisions the agent onboarding
 * session for the agency owner via `POST /users/me/onboarding` with
 * `userType: 'INMOBILIARIA'` and the `agency: { name, nit }` object (the
 * back only creates the agency + agent session for that combination).
 *
 * The hook never auto-provisions on mount: razón social + NIT are always
 * captured by the caller first (`status: 'needs-info'`), then posted via
 * `provision()`. `agentSessionId: null` (back created the rows but the
 * agent handoff failed) is a retry-able error, same as a network failure.
 *
 * Render harness mirrors use-onboarding-session.test.ts (createRoot + act —
 * no @testing-library/react in this repo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { OnboardingResumePoint } from '@/lib/api/onboarding-provisioning.service'

void React // jsx-preserve

const postUsersOnboardingMock = vi.fn()
// El hook pregunta primero dónde quedó la persona. Por defecto: nunca empezó.
type PuntoDeRetorno = OnboardingResumePoint
const SIN_EMPEZAR: PuntoDeRetorno = {
  agentSessionId: null,
  tenantId: null,
  provisioningStatus: null,
  legalName: null,
  nit: null,
  onboardingCompleted: false,
}
const getOnboardingResumePointMock = vi.fn<() => Promise<PuntoDeRetorno>>(
  async () => SIN_EMPEZAR,
)
vi.mock('@/lib/api/onboarding-provisioning.service', () => ({
  postUsersOnboarding: (...args: unknown[]) => postUsersOnboardingMock(...args),
  getOnboardingResumePoint: () => getOnboardingResumePointMock(),
}))

import { ApiError } from '@/lib/api/client'
import {
  useOnboardingProvisioning,
  interpretarFallo,
  REVISA_LOS_CAMPOS,
  INMOBILIARIA_USER_TYPE,
  type ProvisioningInput,
} from './use-onboarding-provisioning'
import { CODIGO_LEASEFY_NO_RESPONDE } from '@/lib/conexion/estado-de-conexion'

type Hook = ReturnType<typeof useOnboardingProvisioning>

const VALID_INPUT: ProvisioningInput = {
  firstName: 'Ana',
  lastName: 'Pérez',
  agencyName: 'Inmobiliaria Andes SAS',
  nit: '900123456-7',
}

const EXPECTED_BODY = {
  firstName: 'Ana',
  lastName: 'Pérez',
  userType: INMOBILIARIA_USER_TYPE,
  agency: { name: 'Inmobiliaria Andes SAS', nit: '900123456-7' },
}

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

beforeEach(() => {
  getOnboardingResumePointMock.mockResolvedValue(SIN_EMPEZAR)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
  postUsersOnboardingMock.mockReset()
})

describe('useOnboardingProvisioning', () => {
  it('reports needs-info on mount and never auto-provisions (razón social + NIT are always required)', async () => {
    const { get } = renderHook()
    await flush()

    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
    expect(get().status).toBe('needs-info')
    expect(get().sessionId).toBeNull()
  })

  it('provision() posts userType INMOBILIARIA with the agency object and resolves to ready', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    act(() => {
      get().provision(VALID_INPUT)
    })
    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(1)
    expect(postUsersOnboardingMock).toHaveBeenCalledWith(EXPECTED_BODY)
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-abc')
  })

  // The "Agencia" step (AgencyStepForm) re-asks razón social/NIT unless the
  // caller threads these captured values back in as its prefill source.
  it('exposes the captured razón social + NIT as agencyPrefill once provisioning succeeds', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()
    await flush()

    expect(get().agencyPrefill).toBeNull()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().agencyPrefill).toEqual({
      legalName: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
    })
  })

  it('does not expose agencyPrefill when provisioning fails', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().agencyPrefill).toBeNull()
  })

  // agentSessionId === null → the back created the user/agency rows but the
  // agent handoff failed. Retry-able error, NOT ready.
  it('resolves to error (no sessionId) when the back returns agentSessionId null', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  it('resolves to error when the request itself rejects (network/HTTP failure)', async () => {
    postUsersOnboardingMock.mockRejectedValue(new Error('network down'))
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()

    expect(get().status).toBe('error')
    expect(get().sessionId).toBeNull()
  })

  it('retry() re-posts the exact same captured data after a failure', async () => {
    postUsersOnboardingMock.mockRejectedValueOnce(new Error('network down'))
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    await flush()
    expect(get().status).toBe('error')

    postUsersOnboardingMock.mockResolvedValueOnce({ agentSessionId: 'sess-retry', tenantId: 'tenant-1' })
    act(() => {
      get().retry()
    })
    expect(get().status).toBe('provisioning')
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(2)
    expect(postUsersOnboardingMock).toHaveBeenLastCalledWith(EXPECTED_BODY)
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-retry')
  })

  // The back's createAgency is a non-atomic findFirst-then-create — a fast
  // double submit must never fire two POSTs for the same owner.
  it('ignores provision()/retry() while a request is already in flight (double submit posts once)', async () => {
    let resolveRequest!: (value: unknown) => void
    postUsersOnboardingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve
        }),
    )
    const { get } = renderHook()

    act(() => {
      get().provision(VALID_INPUT)
    })
    act(() => {
      get().provision(VALID_INPUT)
    })
    act(() => {
      get().retry()
    })

    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(1)
    expect(get().status).toBe('provisioning')

    await act(async () => {
      resolveRequest({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(get().status).toBe('ready')
    expect(get().sessionId).toBe('sess-abc')

    // Once settled, retry() is allowed again.
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-2', tenantId: 'tenant-1' })
    act(() => {
      get().retry()
    })
    await flush()
    expect(postUsersOnboardingMock).toHaveBeenCalledTimes(2)
  })

  it('retry() before any provision() does nothing (no data to re-post)', async () => {
    const { get } = renderHook()
    await flush()

    act(() => {
      get().retry()
    })
    await flush()

    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
    expect(get().status).toBe('needs-info')
  })

  // The back rejects an empty lastName with a 400 (`@IsNotEmpty`) — mirror
  // the canonical split in src/app/onboarding/propietario/page.tsx.
  it('falls back lastName to firstName when lastName is empty', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: 'sess-abc', tenantId: 'tenant-1' })
    const { get } = renderHook()

    act(() => {
      get().provision({ ...VALID_INPUT, lastName: '' })
    })
    await flush()

    expect(postUsersOnboardingMock).toHaveBeenCalledWith({
      ...EXPECTED_BODY,
      lastName: 'Ana',
    })
  })
})


describe('useOnboardingProvisioning — dónde quedó', () => {
  it('monta el asistente directo cuando ya hay una sesión minteada', async () => {
    getOnboardingResumePointMock.mockResolvedValue({
      agentSessionId: 'sesion-de-ayer',
      tenantId: 'agencia-1',
      provisioningStatus: 'ACTIVE',
      legalName: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
      onboardingCompleted: false,
    })
    const hook = renderHook()
    await flush()

    expect(hook.get().status).toBe('ready')
    expect(hook.get().sessionId).toBe('sesion-de-ayer')
    // Nunca se le vuelve a pedir nada: no hay POST.
    expect(postUsersOnboardingMock).not.toHaveBeenCalled()
  })

  it('devuelve lo ya escrito para prellenar el paso previo cuando falta la sesión', async () => {
    getOnboardingResumePointMock.mockResolvedValue({
      agentSessionId: null,
      tenantId: 'agencia-1',
      provisioningStatus: 'ACTIVE',
      legalName: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
      onboardingCompleted: false,
    })
    const hook = renderHook()
    await flush()

    expect(hook.get().status).toBe('needs-info')
    expect(hook.get().valoresGuardados).toEqual({
      razonSocial: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
    })
  })

  // Nico, 01-10-2026: «le dice que es irreversible, ¿cómo así? es ilógico».
  it('con la agencia en FAILED vuelve el formulario lleno para corregir: nunca «quedó bloqueado»', async () => {
    getOnboardingResumePointMock.mockResolvedValue({
      agentSessionId: null,
      tenantId: 'agencia-1',
      provisioningStatus: 'FAILED',
      legalName: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
      onboardingCompleted: false,
    })
    const hook = renderHook()
    await flush()

    expect(hook.get().status).toBe('needs-info')
    expect(hook.get().fallo).toMatchObject({ reintentable: true, paraCorregir: true })
    expect(hook.get().fallo?.mensaje).not.toMatch(/bloquead|soporte/i)
    expect(hook.get().valoresGuardados).toMatchObject({
      razonSocial: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
    })
  })

  it('si no se puede averiguar dónde quedó, se empieza igual', async () => {
    getOnboardingResumePointMock.mockRejectedValue(new Error('sin red'))
    const hook = renderHook()
    await flush()

    expect(hook.get().status).toBe('needs-info')
  })

  it('un 400 son los datos: guarda el mensaje del back y vuelve al formulario para corregir', async () => {
    postUsersOnboardingMock.mockRejectedValue(
      new ApiError(400, 'No se pudo completar el registro de la inmobiliaria. Verifica los datos e intenta nuevamente.'),
    )
    const hook = renderHook()
    await flush()
    act(() => hook.get().provision(VALID_INPUT))
    await flush()

    expect(hook.get().status).toBe('needs-info')
    expect(hook.get().fallo?.mensaje).toContain('Verifica los datos')
    expect(hook.get().fallo).toMatchObject({ reintentable: true, paraCorregir: true, status: 400 })
    // Lo que escribió vuelve al formulario.
    expect(hook.get().valoresGuardados).toMatchObject({ razonSocial: 'Inmobiliaria Andes SAS' })
  })

  it('el 409 CORREO_DE_OTRA_INMOBILIARIA muestra el mensaje del back y no ofrece reintentar', async () => {
    postUsersOnboardingMock.mockRejectedValue(
      new ApiError(
        409,
        'Ese correo ya es el de otra inmobiliaria en Leasefy. Usa el correo de la tuya; si es la misma, pídele acceso a su administrador.',
        'CORREO_DE_OTRA_INMOBILIARIA',
      ),
    )
    const hook = renderHook()
    await flush()
    act(() => hook.get().provision(VALID_INPUT))
    await flush()

    expect(hook.get().status).toBe('error')
    expect(hook.get().fallo?.mensaje).toContain('ya es el de otra inmobiliaria')
    // Reintentar manda el mismo correo: daría el mismo 409 para siempre.
    expect(hook.get().fallo?.reintentable).toBe(false)
    expect(hook.get().fallo?.status).toBe(409)
  })

  it('el 409 CORREO_DE_OTRA_INMOBILIARIA sin mensaje no cae en el genérico', async () => {
    postUsersOnboardingMock.mockRejectedValue(
      new ApiError(409, '', 'CORREO_DE_OTRA_INMOBILIARIA'),
    )
    const hook = renderHook()
    await flush()
    act(() => hook.get().provision(VALID_INPUT))
    await flush()

    expect(hook.get().fallo?.mensaje).toContain('ya es el de otra inmobiliaria')
    expect(hook.get().fallo?.reintentable).toBe(false)
  })

  it('un 503 sí es reintentable', async () => {
    postUsersOnboardingMock.mockRejectedValue(new ApiError(503, 'Intenta en unos minutos.'))
    const hook = renderHook()
    await flush()
    act(() => hook.get().provision(VALID_INPUT))
    await flush()

    expect(hook.get().fallo?.reintentable).toBe(true)
  })

  it('una sesión en null deja reintentar: el back ya vuelve a intentar el traspaso', async () => {
    postUsersOnboardingMock.mockResolvedValue({ agentSessionId: null, tenantId: 'agencia-1' })
    const hook = renderHook()
    await flush()
    act(() => hook.get().provision(VALID_INPUT))
    await flush()

    expect(hook.get().status).toBe('error')
    expect(hook.get().fallo?.reintentable).toBe(true)
    expect(hook.get().valoresGuardados).toEqual({
      razonSocial: 'Inmobiliaria Andes SAS',
      nit: '900123456-7',
      nombreCompleto: 'Ana Pérez',
    })
  })

  // 🔴 01-10-2026 (Alexis): con el micro caído la agencia quedaba FAILED y al
  // volver a entrar sólo veía «Tu registro quedó bloqueado». El back ahora la
  // informa PENDING y trae lo que ya había escrito: vuelve el formulario lleno.
  it('una agencia que el micro no alcanzó a crear vuelve al formulario con TODO lo que ya escribió', async () => {
    getOnboardingResumePointMock.mockResolvedValue({
      agentSessionId: null,
      tenantId: 'agencia-1',
      provisioningStatus: 'PENDING',
      legalName: 'La Carpita Real Estate',
      nit: '123456789-6',
      ownerFirstName: 'Donqui',
      ownerLastName: 'de la Mancha',
      legalRepresentative: 'Sancho Panza',
      onboardingCompleted: true,
    })
    const hook = renderHook()
    await flush()

    expect(hook.get().status).toBe('needs-info')
    expect(hook.get().fallo).toBeNull()
    expect(hook.get().valoresGuardados).toEqual({
      razonSocial: 'La Carpita Real Estate',
      nit: '123456789-6',
      nombreCompleto: 'Donqui de la Mancha',
      representanteLegal: 'Sancho Panza',
    })
  })
})

/*
 * 01-10-2026: con el micro de agentes caído el registro decía «Código 503» y
 * la persona no sabía si era ella. Una caída se reconoce como caída.
 */
describe('interpretarFallo ante una caída', () => {
  it('503 SERVICIO_NO_DISPONIBLE del asistente: caída de servicio, reintentable, lo escrito se queda', () => {
    const fallo = interpretarFallo(
      new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', {
        statusCode: 503,
        code: 'SERVICIO_NO_DISPONIBLE',
        servicio: 'asistente',
      }),
    )
    expect(fallo.caida).toEqual({ tipo: 'servicio', servicio: 'asistente' })
    expect(fallo.reintentable).toBe(true)
    expect(fallo.mensaje).toContain('Lo que escribiste no se pierde.')
    expect(fallo.mensaje).not.toMatch(/503/)
  })

  it('sin `servicio` también es caída, con el servicio en null', () => {
    const fallo = interpretarFallo(new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE'))
    expect(fallo.caida).toEqual({ tipo: 'servicio', servicio: null })
  })

  it('sin red o con Leasefy entero caído: caída de conexión, reintentable', () => {
    expect(interpretarFallo(new ApiError(0, 'No pudimos conectarnos')).caida).toEqual({ tipo: 'conexion' })
    const general = interpretarFallo(new ApiError(502, 'x', CODIGO_LEASEFY_NO_RESPONDE))
    expect(general.caida).toEqual({ tipo: 'conexion' })
    expect(general.reintentable).toBe(true)
  })

  it('la base caída no es «el asistente»: es Leasefy sin responder', () => {
    const fallo = interpretarFallo(
      new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', {
        statusCode: 503,
        code: 'SERVICIO_NO_DISPONIBLE',
        servicio: 'base',
      }),
    )
    expect(fallo.caida).toEqual({ tipo: 'conexion' })
  })

  it('un 503 viejo, sin el code, sigue como antes (sin caída)', () => {
    const fallo = interpretarFallo(new ApiError(503, 'Intenta en unos minutos.'))
    expect(fallo.caida).toBeUndefined()
    expect(fallo.mensaje).toBe('Intenta en unos minutos.')
  })
})

/**
 * 02-10-2026 · La regla de oro en «Antes de comenzar»: un 400 con `campos`
 * va a SUS campos (no arriba); un 5xx dice que fue nuestro, con la referencia;
 * «conexión» sólo cuando no hubo respuesta.
 */
describe('interpretarFallo con la regla de oro', () => {
  it('🔴 un 400 DATOS_INVALIDOS reparte los `campos` en los campos del formulario', () => {
    const fallo = interpretarFallo(
      new ApiError(
        400,
        ['El nombre puede tener hasta 100 caracteres.', 'El NIT no es válido.'],
        'DATOS_INVALIDOS',
        {
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El nombre puede tener hasta 100 caracteres.', 'El NIT no es válido.'],
          campos: [
            { campo: 'firstName', regla: 'longitud_maxima', mensaje: 'El nombre puede tener hasta 100 caracteres.' },
            { campo: 'agency.nit', regla: 'formato', mensaje: 'El NIT no es válido.' },
          ],
        },
      ),
    )
    expect(fallo.campos).toEqual({
      nombre: 'El nombre puede tener hasta 100 caracteres.',
      nit: 'El NIT no es válido.',
    })
    expect(fallo.paraCorregir).toBe(true)
    // Arriba no se repite lo que ya está en cada campo.
    expect(fallo.mensaje).toBe(REVISA_LOS_CAMPOS)
  })

  it('lo que no tiene campo en el formulario queda arriba', () => {
    const fallo = interpretarFallo(
      new ApiError(400, 'Elige cómo prefieres que te contactemos.', 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'preferredContact', regla: 'opcion', mensaje: 'Elige cómo prefieres que te contactemos.' }],
      }),
    )
    expect(fallo.campos).toBeUndefined()
    expect(fallo.mensaje).toBe('Elige cómo prefieres que te contactemos.')
  })

  it('🔴 un 500 dice que fue nuestro, con la referencia, y no culpa a la conexión', () => {
    const fallo = interpretarFallo(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    expect(fallo.mensaje).toMatch(/^No pudimos crear tu inmobiliaria: algo falló de nuestro lado/)
    expect(fallo.mensaje).toContain('ab12cd34')
    expect(fallo.mensaje).not.toMatch(/conexi[oó]n/)
    expect(fallo.reintentable).toBe(true)
  })

  it('sin respuesta (status 0, lo que arma `apiClient` cuando `fetch` no salió): caída de conexión', () => {
    const fallo = interpretarFallo(new ApiError(0, 'Failed to fetch'))
    expect(fallo.caida).toEqual({ tipo: 'conexion' })
    expect(fallo.reintentable).toBe(true)
    expect(fallo.mensaje).not.toContain('Failed to fetch')
  })

  it('un error de JavaScript (no vino del back) no muestra su texto', () => {
    const fallo = interpretarFallo(new Error('Cannot read properties of undefined'))
    expect(fallo.mensaje).toBe('No pudimos preparar el registro de tu inmobiliaria. Vuelve a intentarlo en unos minutos.')
  })
})
