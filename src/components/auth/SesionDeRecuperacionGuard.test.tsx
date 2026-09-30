/**
 * La sesión del enlace de recuperación se cierra si la persona aparece en otra
 * pantalla sin haber puesto la contraseña nueva (Nico, 30-09-2026: la landing
 * decía «Ir al panel» y pedía el código del segundo factor).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { signOutMock, authState, ruta } = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue(undefined),
  authState: { isLoading: false, isAuthenticated: true },
  ruta: { actual: '/' },
}))

vi.mock('next/navigation', () => ({ usePathname: () => ruta.actual }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ ...authState, signOut: signOutMock }) }))

import { SesionDeRecuperacionGuard } from './SesionDeRecuperacionGuard'
import { COOKIE_DE_RECUPERACION, borrarMarcaDeRecuperacion, hayMarcaDeRecuperacion } from '@/lib/auth/sesion-de-recuperacion'

let container: HTMLDivElement
let root: Root

function marcar() {
  document.cookie = `${COOKIE_DE_RECUPERACION}=1; path=/`
}

beforeEach(() => {
  signOutMock.mockClear()
  authState.isLoading = false
  authState.isAuthenticated = true
  ruta.actual = '/'
  borrarMarcaDeRecuperacion()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function pintar() {
  await act(async () => {
    root.render(<SesionDeRecuperacionGuard />)
  })
}

describe('SesionDeRecuperacionGuard', () => {
  it('en la landing con la marca y sesión abierta: cierra la sesión y borra la marca', async () => {
    marcar()
    await pintar()
    expect(signOutMock).toHaveBeenCalledTimes(1)
    expect(hayMarcaDeRecuperacion()).toBe(false)
  })

  it.each(['/auth/update-password', '/auth/mfa-verify', '/auth/mfa-enroll'])('en %s no toca nada: ahí se termina', async (r) => {
    marcar()
    ruta.actual = r
    await pintar()
    expect(signOutMock).not.toHaveBeenCalled()
    expect(hayMarcaDeRecuperacion()).toBe(true)
  })

  it('sin la marca, una sesión normal no se toca', async () => {
    await pintar()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('espera a que la sesión cargue antes de decidir', async () => {
    marcar()
    authState.isLoading = true
    await pintar()
    expect(signOutMock).not.toHaveBeenCalled()
    expect(hayMarcaDeRecuperacion()).toBe(true)
  })

  it('con la marca pero sin sesión, sólo borra la marca', async () => {
    marcar()
    authState.isAuthenticated = false
    await pintar()
    expect(signOutMock).not.toHaveBeenCalled()
    expect(hayMarcaDeRecuperacion()).toBe(false)
  })
})
