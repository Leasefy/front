/**
 * 🔴 «Desactivar» → «Error 422» (Nico, 29-09-2026).
 *
 * Desde el login (`/auth/mfa-verify`, sesión `aal1`) la persona veía su
 * factor «Activado» y tocaba «Desactivar»: Supabase exige `aal2` para quitar
 * un factor verificado y respondía 422. Caso A: si la persona TIENE la app,
 * «Desactivar» primero pide el código actual (SDK: `mfa.challenge` +
 * `mfa.verify`, que sube la sesión a `aal2`), después quita el factor y
 * enseguida muestra la inscripción del nuevo. En Configuración → Seguridad
 * (ya `aal2`) sigue igual que hoy.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Un JWT de mentira: sólo se lee el `aal` del payload. */
function token(aal: 'aal1' | 'aal2', marca = ''): string {
  const payload = btoa(JSON.stringify({ aal, sub: 'u-1', marca }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `cabecera.${payload}.firma`
}
const TOKEN_AAL1 = token('aal1')
const TOKEN_AAL2 = token('aal2')
const TOKEN_TRAS_EL_CODIGO = token('aal2', 'recien-verificado')

const { estado, sdk, avisos } = vi.hoisted(() => ({
  estado: { token: '' },
  sdk: { challenge: vi.fn(), verify: vi.fn() },
  avisos: [] as Array<{ tipo: string; texto: string }>,
}))

vi.mock('@/lib/api/client', () => ({ getAccessToken: () => estado.token }))
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: sdk } }),
}))
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (texto: string) => avisos.push({ tipo: 'success', texto }),
    error: (texto: string) => avisos.push({ tipo: 'error', texto }),
  },
}))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ start: vi.fn(), stop: vi.fn() }),
}))

import { MfaSetupSection } from './MfaSetupSection'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

interface Pedido {
  url: string
  metodo: string
  autorizacion: string | null
}

let host: HTMLDivElement
let root: Root
let pedidos: Pedido[]
let factores: Array<{ id: string; factor_type: string; status: string }>
let respuestaDelBorrado: { status: number; cuerpo: unknown }

function respuesta(status: number, cuerpo: unknown) {
  return { ok: status < 400, status, json: async () => cuerpo } as unknown as Response
}

beforeEach(() => {
  avisos.length = 0
  pedidos = []
  factores = [{ id: 'f-viejo', factor_type: 'totp', status: 'verified' }]
  respuestaDelBorrado = { status: 200, cuerpo: {} }
  sdk.challenge.mockReset().mockImplementation(async ({ factorId }: { factorId: string }) => ({
    data: { id: `desafio-${factorId}` },
    error: null,
  }))
  sdk.verify.mockReset().mockResolvedValue({
    data: { access_token: TOKEN_TRAS_EL_CODIGO },
    error: null,
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: string, init?: RequestInit) => {
      const url = String(entrada)
      const metodo = init?.method ?? 'GET'
      const cabeceras = (init?.headers ?? {}) as Record<string, string>
      pedidos.push({ url, metodo, autorizacion: cabeceras.Authorization ?? null })
      if (url.endsWith('/user')) return respuesta(200, { factors: factores })
      if (metodo === 'DELETE') {
        return respuesta(respuestaDelBorrado.status, respuestaDelBorrado.cuerpo)
      }
      if (url.endsWith('/factors')) {
        return respuesta(200, { id: 'f-nuevo', totp: { qr_code: '<svg/>', secret: 'S3CR3T' } })
      }
      if (url.endsWith('/challenge')) return respuesta(200, { id: 'desafio-rest' })
      return respuesta(200, {})
    }),
  )
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

async function montar(elemento: React.ReactElement) {
  await act(async () => {
    root.render(elemento)
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function boton(texto: string | RegExp): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll('button')].find((b) =>
    typeof texto === 'string'
      ? (b.textContent ?? '').includes(texto)
      : texto.test(b.textContent ?? ''),
  ) as HTMLButtonElement | undefined
}

async function clic(texto: string | RegExp) {
  const b = boton(texto)
  expect(b, `no encontré el botón ${String(texto)}`).toBeDefined()
  await act(async () => {
    b!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

async function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const borrados = () => pedidos.filter((p) => p.metodo === 'DELETE')

describe('MfaSetupSection — «Desactivar»', () => {
  it('en Configuración (aal2): igual que hoy, quita el factor sin pedir código', async () => {
    estado.token = TOKEN_AAL2
    await montar(<MfaSetupSection />)

    await clic('Desactivar')
    await clic('Desactivar 2FA')

    expect(sdk.challenge).not.toHaveBeenCalled()
    expect(borrados()).toHaveLength(1)
    expect(borrados()[0].url).toMatch(/\/factors\/f-viejo$/)
    expect(borrados()[0].autorizacion).toBe(`Bearer ${TOKEN_AAL2}`)
    expect(avisos).toContainEqual({ tipo: 'success', texto: 'Autenticación de dos factores desactivada' })
  })

  it('🔴 un 422 de Supabase sale en español, nunca «Error 422»', async () => {
    estado.token = TOKEN_AAL2
    respuestaDelBorrado = {
      status: 422,
      cuerpo: { code: 422, error_code: 'insufficient_aal', msg: 'AAL2 required to unenroll verified factor' },
    }
    await montar(<MfaSetupSection />)

    await clic('Desactivar')
    await clic('Desactivar 2FA')

    const error = avisos.find((a) => a.tipo === 'error')
    expect(error?.texto).toBeDefined()
    expect(error?.texto).not.toMatch(/Error 422/)
    expect(error?.texto).toMatch(/código de tu app/)
  })

  it('🔴 en el login (aal1): pide el código de la app ANTES de quitar el factor', async () => {
    estado.token = TOKEN_AAL1
    const onCambioDeFactor = vi.fn()
    await montar(<MfaSetupSection enElIngreso onCambioDeFactor={onCambioDeFactor} />)

    await clic('Desactivar')

    // Todavía no se tocó nada: primero el código.
    expect(borrados()).toHaveLength(0)
    expect(document.body.textContent).toMatch(/escribe el código que muestra tu app/)
    const casillas = document.body.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')
    expect(casillas).toHaveLength(6)

    await escribir(casillas[0], '654321')

    expect(onCambioDeFactor).toHaveBeenCalledWith(true)
    expect(sdk.challenge).toHaveBeenCalledWith({ factorId: 'f-viejo' })
    expect(sdk.verify).toHaveBeenCalledWith({
      factorId: 'f-viejo',
      challengeId: 'desafio-f-viejo',
      code: '654321',
    })
    // Quita el factor con el token NUEVO (aal2), no con el aal1 de antes.
    expect(borrados()).toHaveLength(1)
    expect(borrados()[0].url).toMatch(/\/factors\/f-viejo$/)
    expect(borrados()[0].autorizacion).toBe(`Bearer ${TOKEN_TRAS_EL_CODIGO}`)
    // …y enseguida ofrece inscribir el nuevo, en la misma tarjeta.
    expect(pedidos.some((p) => p.metodo === 'POST' && p.url.endsWith('/factors'))).toBe(true)
    expect(document.body.querySelector('img[alt="Código QR para autenticación"]')).not.toBeNull()
  })

  it('🔴 en el login, el primer código del factor nuevo va por el SDK y avisa que quedó activo', async () => {
    estado.token = TOKEN_AAL1
    const onActivado = vi.fn()
    await montar(<MfaSetupSection enElIngreso onActivado={onActivado} />)

    await clic('Desactivar')
    const casillas = document.body.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')
    await escribir(casillas[0], '654321')
    sdk.challenge.mockClear()
    sdk.verify.mockClear()

    const campo = host.querySelector<HTMLInputElement>('input[placeholder="000000"]')!
    await escribir(campo, '111222')
    await clic(/^\s*Verificar\s*$/)

    // Por el SDK: es lo que deja la sesión en aal2 como la verificación normal.
    expect(sdk.challenge).toHaveBeenCalledWith({ factorId: 'f-nuevo' })
    expect(sdk.verify).toHaveBeenCalledWith({
      factorId: 'f-nuevo',
      challengeId: 'desafio-f-nuevo',
      code: '111222',
    })
    expect(pedidos.some((p) => p.url.endsWith('/factors/f-nuevo/verify'))).toBe(false)
    expect(onActivado).toHaveBeenCalledWith('f-nuevo')
  })

  it('en el login, un código equivocado no quita nada y lo dice en español', async () => {
    estado.token = TOKEN_AAL1
    const onCambioDeFactor = vi.fn()
    sdk.verify.mockResolvedValueOnce({
      data: null,
      error: { code: 'mfa_verification_failed', status: 422, message: 'Invalid TOTP code entered' },
    })
    await montar(<MfaSetupSection enElIngreso onCambioDeFactor={onCambioDeFactor} />)

    await clic('Desactivar')
    const casillas = document.body.querySelectorAll<HTMLInputElement>('[data-testid^="casilla-"]')
    await escribir(casillas[0], '000000')

    expect(borrados()).toHaveLength(0)
    expect(document.body.querySelector('[role="alert"]')?.textContent).toMatch(/^Código incorrecto/)
    expect(onCambioDeFactor).toHaveBeenLastCalledWith(false)
  })

  it('en el login, «¿No tienes la app?» lleva a restablecerlo por correo', async () => {
    estado.token = TOKEN_AAL1
    const onSinLaApp = vi.fn()
    await montar(<MfaSetupSection enElIngreso onSinLaApp={onSinLaApp} />)

    await clic('Desactivar')
    await clic(/No tienes la app/)

    expect(onSinLaApp).toHaveBeenCalledTimes(1)
    expect(borrados()).toHaveLength(0)
  })

  it('inscribirAlAbrir: sin factor, arranca la inscripción sola (tras restablecer)', async () => {
    estado.token = TOKEN_AAL1
    factores = []
    await montar(<MfaSetupSection enElIngreso inscribirAlAbrir />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(pedidos.some((p) => p.metodo === 'POST' && p.url.endsWith('/factors'))).toBe(true)
    expect(document.body.querySelector('img[alt="Código QR para autenticación"]')).not.toBeNull()
  })
})
