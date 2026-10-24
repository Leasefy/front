/**
 * El mock del segundo factor en Configuración → Seguridad (T-0172): la opción
 * sólo existe fuera de producción y deja el factor activado sin QR.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const TOKEN = `cab.${btoa(JSON.stringify({ sub: 'usuario-1' })).replace(/=+$/, '')}.firma`

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => TOKEN,
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ start: vi.fn(), stop: vi.fn() }),
}))

import { MfaSetupSection } from './MfaSetupSection'
import { clavePorFactor } from '@/lib/auth/mock-del-segundo-factor'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

const SECRETO = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

let container: HTMLDivElement
let root: Root
let codigosVerificados: string[]

function respuesta(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

beforeEach(() => {
  window.localStorage.clear()
  codigosVerificados = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.endsWith('/user')) return respuesta({ factors: [] })
      if (u.endsWith('/factors')) return respuesta({ id: 'f1', totp: { qr_code: '<svg/>', secret: SECRETO } })
      if (u.endsWith('/challenge')) return respuesta({ id: 'ch1' })
      if (u.endsWith('/verify')) {
        codigosVerificados.push((JSON.parse(String(init?.body)) as { code: string }).code)
        return respuesta({})
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
})

const porTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

async function montar(onActivado = vi.fn()) {
  await act(async () => {
    root.render(<MfaSetupSection onActivado={onActivado} />)
  })
  return onActivado
}

describe('<MfaSetupSection> y el mock', () => {
  it('fuera de producción ofrece «Usar mock de autenticación» con su marca', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'staging')
    await montar()
    expect(porTestId('usar-mock-de-autenticacion')?.textContent).toContain('Usar mock de autenticación')
    expect(porTestId('insignia-del-mock')?.textContent).toBe('Mock')
  })

  it.each([undefined, '', 'production'])('con la variable %j no existe la opción', async (valor) => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', valor as string)
    await montar()
    expect(porTestId('usar-mock-de-autenticacion')).toBeNull()
    expect(porTestId('insignia-del-mock')).toBeNull()
  })

  it('el mock activa el factor sin QR: guarda el secreto y verifica con el código real', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'development')
    const onActivado = await montar()

    await act(async () => {
      porTestId('usar-mock-de-autenticacion')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // WebCrypto resuelve fuera del microtask de `act`: se espera a que termine.
    await act(async () => {
      await vi.waitFor(() => expect(codigosVerificados).toHaveLength(1))
    })

    expect(window.localStorage.getItem(clavePorFactor('usuario-1', 'f1'))).toBe(SECRETO)
    expect(codigosVerificados).toHaveLength(1)
    expect(codigosVerificados[0]).toMatch(/^\d{6}$/)
    expect(onActivado).toHaveBeenCalledWith('f1')
    expect(container.querySelector('img[alt*="QR"]')).toBeNull()
  })
})
