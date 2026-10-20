/**
 * El mock del segundo factor en el paso a paso de activación (T-0172).
 *
 * Sólo existe fuera de producción: con `NEXT_PUBLIC_APP_ENV` ausente o distinta
 * de `development`/`staging` NO se pinta nada ni `123456` tiene trato especial.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { challengeMock, verifyMock, liberarMock } = vi.hoisted(() => ({
  challengeMock: vi.fn(),
  verifyMock: vi.fn(),
  liberarMock: vi.fn(),
}))

function tokenDe(sub: string) {
  return `cab.${btoa(JSON.stringify({ sub })).replace(/=+$/, '')}.firma`
}
const TOKEN = tokenDe('usuario-1')

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => TOKEN,
}))

vi.mock('@/lib/api/segundo-factor.service', () => ({
  segundoFactorApi: { liberarFactoresDelMock: liberarMock },
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: { challenge: challengeMock, verify: verifyMock } } }),
}))

import { ActivarSegundoFactorPasoAPaso } from './ActivarSegundoFactorPasoAPaso'
import { codigoTotp } from '@/lib/auth/totp'
import { MENSAJE_SIN_SECRETO_DEL_MOCK, clavePorFactor } from '@/lib/auth/mock-del-segundo-factor'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

const SECRETO = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

let container: HTMLDivElement
let root: Root

function respuesta(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

beforeEach(() => {
  window.localStorage.clear()
  liberarMock.mockReset().mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
  challengeMock.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  verifyMock.mockReset().mockResolvedValue({ data: { access_token: 'token-aal2' }, error: null })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const u = String(url)
      if (u.endsWith('/user')) return respuesta({ factors: [] })
      if (u.endsWith('/factors')) {
        return respuesta({ id: 'f-nuevo', totp: { qr_code: '<svg/>', secret: SECRETO } })
      }
      return respuesta({})
    }),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const porTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

async function montar() {
  const p = { onActivado: vi.fn(), onYaTeniaFactor: vi.fn() }
  await act(async () => {
    root.render(<ActivarSegundoFactorPasoAPaso {...p} />)
  })
  return p
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function escribirCodigo(codigo: string) {
  const primera = porTestId('casilla-0') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('mock del segundo factor en el paso a paso', () => {
  it.each(['development', 'staging'])('con %s se ofrece «Usar mock de autenticación» con su marca', async (entorno) => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', entorno)
    await montar()
    const boton = porTestId('usar-mock-de-autenticacion')
    expect(boton?.textContent).toContain('Usar mock de autenticación')
    expect(porTestId('insignia-del-mock')?.textContent).toBe('Mock')
  })

  it.each([undefined, '', 'production', 'preview'])('con la variable %j no se pinta nada', async (valor) => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', valor as string)
    await montar()
    expect(porTestId('usar-mock-de-autenticacion')).toBeNull()
    expect(porTestId('insignia-del-mock')).toBeNull()
    expect(container.textContent).not.toContain('mock')
  })

  it('el mock inscribe el factor, guarda el secreto y verifica solo con el código real', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    const p = await montar()

    const antes = await codigoTotp(SECRETO)
    await clic(porTestId('usar-mock-de-autenticacion'))
    const despues = await codigoTotp(SECRETO)

    expect(porTestId('qr-del-segundo-factor')).toBeNull()
    expect(challengeMock).toHaveBeenCalledWith({ factorId: 'f-nuevo' })
    const enviado = verifyMock.mock.calls[0]![0] as { code: string; factorId: string }
    expect(enviado.factorId).toBe('f-nuevo')
    expect([antes, despues]).toContain(enviado.code)
    expect(window.localStorage.getItem(clavePorFactor('usuario-1', 'f-nuevo'))).toBe(SECRETO)
    expect(p.onActivado).toHaveBeenCalledWith('f-nuevo')
  })

  it('123456 con el mock activo se cambia por el código real del secreto guardado', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    await montar()
    await clic(porTestId('ya-tengo-la-app'))
    await clic(porTestId('ya-lo-agregue'))
    window.localStorage.setItem(clavePorFactor('usuario-1', 'f-nuevo'), SECRETO)

    const antes = await codigoTotp(SECRETO)
    await escribirCodigo('123456')
    const despues = await codigoTotp(SECRETO)

    const enviado = verifyMock.mock.calls[0]![0] as { code: string }
    expect([antes, despues]).toContain(enviado.code)
  })

  it('123456 sin secreto guardado para ese factor dice por qué y no llama a Supabase', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    await montar()
    await clic(porTestId('ya-tengo-la-app'))
    await clic(porTestId('ya-lo-agregue'))

    await escribirCodigo('123456')

    expect(porTestId('error-del-codigo')?.textContent).toContain(MENSAJE_SIN_SECRETO_DEL_MOCK)
    expect(verifyMock).not.toHaveBeenCalled()
  })

  it('123456 sin secreto y el back libera: inscribe uno nuevo con el mock y activa', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    liberarMock.mockResolvedValue({ factoresBorrados: 1 })
    const p = await montar()
    await clic(porTestId('ya-tengo-la-app'))
    await clic(porTestId('ya-lo-agregue'))

    await escribirCodigo('123456')

    expect(liberarMock).toHaveBeenCalledTimes(1)
    expect(verifyMock).toHaveBeenCalledTimes(1)
    const enviado = verifyMock.mock.calls[0]![0] as { code: string }
    expect(enviado.code).toMatch(/^\d{6}$/)
    expect(enviado.code).not.toBe('123456')
    expect(window.localStorage.getItem(clavePorFactor('usuario-1', 'f-nuevo'))).toBe(SECRETO)
    expect(p.onActivado).toHaveBeenCalledWith('f-nuevo')
  })

  it('en producción 123456 viaja tal cual', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production')
    await montar()
    await clic(porTestId('ya-tengo-la-app'))
    await clic(porTestId('ya-lo-agregue'))
    window.localStorage.setItem(clavePorFactor('usuario-1', 'f-nuevo'), SECRETO)

    await escribirCodigo('123456')

    expect(verifyMock).toHaveBeenCalledWith({ factorId: 'f-nuevo', challengeId: 'ch1', code: '123456' })
    expect(liberarMock).not.toHaveBeenCalled()
  })
})
