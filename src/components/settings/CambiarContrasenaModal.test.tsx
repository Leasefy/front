/**
 * Cambiar la contraseña (manda un enlace al correo): el fallo dice lo que
 * pasó (02-10-2026, sistema de errores). Antes, ante CUALQUIER fallo, «No
 * pudimos enviar el enlace. Intenta de nuevo.»: también ante el límite de
 * envíos de Supabase, que no se arregla intentando ya.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { sendPasswordResetMock } = vi.hoisted(() => ({ sendPasswordResetMock: vi.fn() }))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { email: 'ana@leasefy.co' }, sendPasswordReset: sendPasswordResetMock }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { CambiarContrasenaModal } from './CambiarContrasenaModal'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  sendPasswordResetMock.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

/** Un `AuthApiError` de auth-js: `status` + `code` (y el mensaje en inglés). */
function errorDeSupabase(status: number, code: string | undefined, message: string) {
  return Object.assign(new Error(message), { name: 'AuthApiError', status, code, __isAuthError: true })
}

async function enviar() {
  await act(async () => root.render(<CambiarContrasenaModal abierto onCerrar={() => {}} />))
  const boton = document.body.querySelector<HTMLButtonElement>('[data-testid="enviar-enlace-contrasena"]')!
  await act(async () => boton.click())
  return document.body.querySelector('[role="alert"]')?.textContent ?? ''
}

describe('CambiarContrasenaModal — el fallo dice lo que pasó', () => {
  it('🔴 el límite de envíos de Supabase lo dice en español (no «intenta de nuevo»)', async () => {
    sendPasswordResetMock.mockRejectedValue(
      errorDeSupabase(429, 'over_email_send_rate_limit', 'For security purposes, you can only request this after 47 seconds.'),
    )
    const texto = await enviar()
    expect(texto).toContain('Ya te enviamos varios correos hace poco')
    expect(texto).not.toMatch(/security purposes/)
  })

  it('🔴 un 5xx dice que fue nuestro, sin culpar a la conexión', async () => {
    sendPasswordResetMock.mockRejectedValue(errorDeSupabase(500, 'unexpected_failure', 'Internal server error'))
    const texto = await enviar()
    expect(texto).toMatch(/^No pudimos enviar el enlace: algo falló de nuestro lado/)
    expect(texto).not.toMatch(/conexi[oó]n/)
  })

  it('sin respuesta (status 0): ahí sí se habla de la conexión', async () => {
    sendPasswordResetMock.mockRejectedValue(
      Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 }),
    )
    const texto = await enviar()
    expect(texto).toMatch(/conexión/)
  })
})
