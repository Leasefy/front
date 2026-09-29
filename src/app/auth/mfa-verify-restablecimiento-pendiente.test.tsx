/**
 * 🔴 Nico, 29-09-2026: «le di lo de enviar al correo y pongo esos 6 números y
 * sale "Código incorrecto… cambia cada 30 segundos"». El código SÍ salió al
 * correo (log del back 12:17:31), pero la pantalla se montó de nuevo mientras
 * lo buscaba y volvió a «Verificación de seguridad», la de la APP: el código
 * del correo nunca llegó a `/confirmar`. Con el restablecimiento pedido y
 * vigente, la pantalla vuelve sola a las casillas del correo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { auth } = vi.hoisted(() => ({
  auth: {
    user: { id: 'u-1', email: 'duenio@leasefy.co', role: 'agency' } as Record<string, unknown>,
    mfaRequired: true,
    mfaEnrollRequired: false,
  },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ ...auth, setMfaVerified: vi.fn(), signOut: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: [{ id: 'f-1', status: 'verified' }] } }),
      },
    },
  }),
}))
vi.mock('@/lib/api/segundo-factor.service', () => ({
  segundoFactorApi: { solicitarRestablecimiento: vi.fn(), confirmarRestablecimiento: vi.fn() },
}))
vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/settings/MfaSetupSection', () => ({ MfaSetupSection: () => <div data-testid="mfa-setup" /> }))

import MfaVerifyPage from './mfa-verify/page'
import { marcarRestablecimientoPendiente } from '@/lib/auth/restablecimiento-pendiente'

let host: HTMLDivElement
let root: Root

async function montar() {
  await act(async () => {
    root.render(<MfaVerifyPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  window.sessionStorage.clear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('/auth/mfa-verify con un código del correo ya pedido', () => {
  it('vuelve sola a las casillas del CORREO, no a las de la app', async () => {
    marcarRestablecimientoPendiente('u-1', Date.now() + 60_000)
    await montar()
    expect(host.querySelector('[data-testid="codigo-del-correo"]')).not.toBeNull()
    expect(host.textContent).toContain('Te mandamos un código a tu correo')
    expect(host.querySelector('[aria-label="Código de verificación de 6 dígitos"]')).toBeNull()
  })

  it('sin nada pedido, sigue pidiendo el código de la app', async () => {
    await montar()
    expect(host.querySelector('[data-testid="codigo-del-correo"]')).toBeNull()
    expect(host.querySelector('[aria-label="Código de verificación de 6 dígitos"]')).not.toBeNull()
  })

  it('lo pedido por OTRA cuenta en la misma pestaña no cuenta', async () => {
    marcarRestablecimientoPendiente('otra', Date.now() + 60_000)
    await montar()
    expect(host.querySelector('[data-testid="codigo-del-correo"]')).toBeNull()
  })
})
