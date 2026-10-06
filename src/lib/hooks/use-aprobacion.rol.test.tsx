/**
 * IN-22 (QA de Inmuebles, 04-10): el aviso público del inmueble abierto por
 * alguien de la inmobiliaria pedía `GET /pre-scoring/current` y el back
 * respondía 403 («Esto es sólo para cuentas de inquilino») — un error en
 * consola en cada aviso que abría un asesor o un administrador.
 *
 * El estudio sólo se le pide al back si quien mira es inquilino; anónimo,
 * como siempre, mira el respaldo local sin pedir nada.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const getAccessToken = vi.fn()
const apiClientGet = vi.fn()

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...real,
    getAccessToken: () => getAccessToken(),
    apiClient: { ...real.apiClient, get: (...args: unknown[]) => apiClientGet(...args) },
  }
})

const { AuthContext } = await import('@/lib/auth/auth-context')
const { useAprobacion } = await import('./use-aprobacion')
type Auth = React.ContextType<typeof AuthContext>

async function conSesion(auth: Partial<NonNullable<Auth>> | null) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let ultimo: ReturnType<typeof useAprobacion> | undefined
  function Sonda() {
    ultimo = useAprobacion()
    return null
  }
  await act(async () => {
    root.render(
      <AuthContext.Provider value={auth as Auth}>
        <Sonda />
      </AuthContext.Provider>,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
  act(() => root.unmount())
  host.remove()
  return ultimo!
}

const usuario = (role: 'tenant' | 'landlord' | 'agency') => ({ id: 'u1', email: 'x@y.co', role }) as never

describe('IN-22: el estudio se pide sólo si quien mira es inquilino', () => {
  beforeEach(() => {
    window.localStorage.clear()
    getAccessToken.mockReset().mockReturnValue('token')
    apiClientGet.mockReset().mockRejectedValue(new Error('403'))
  })

  it('🔴 alguien de la inmobiliaria NO pide /pre-scoring/current (antes: 403 en consola)', async () => {
    const r = await conSesion({ user: usuario('agency'), isLoading: false })
    expect(apiClientGet).not.toHaveBeenCalled()
    expect(r.cargando).toBe(false)
    expect(r.aprobacion?.estado).toBe('sin_estudio')
    expect(r.error).toBeNull()
  })

  it('un propietario tampoco', async () => {
    await conSesion({ user: usuario('landlord'), isLoading: false })
    expect(apiClientGet).not.toHaveBeenCalled()
  })

  it('un inquilino sí (control positivo)', async () => {
    apiClientGet.mockResolvedValue({ order: null, evaluation: null })
    await conSesion({ user: usuario('tenant'), isLoading: false })
    expect(apiClientGet).toHaveBeenCalledWith('/pre-scoring/current')
  })

  it('mientras la sesión todavía no dice quién es, no pregunta (sigue cargando)', async () => {
    const r = await conSesion({ user: null, isLoading: true })
    expect(apiClientGet).not.toHaveBeenCalled()
    expect(r.cargando).toBe(true)
  })

  it('anónimo (sin token): no pide nada, como siempre', async () => {
    getAccessToken.mockReturnValue(null)
    await conSesion({ user: null, isLoading: false })
    expect(apiClientGet).not.toHaveBeenCalled()
  })
})
