/**
 * IdleSessionGuard — el comportamiento que el usuario ve.
 *
 * Los casos que importan son los NEGATIVOS: que no aparezca el aviso mientras
 * alguien trabaja, que no cierre si la actividad viene de otra pestaña, y que
 * la revocación en el servidor ocurra ANTES del cierre — si no, el token
 * seguiría sirviendo hasta una hora después y todo esto sería decorado.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { revokeSession, terminarSesion, getAccessToken, useAuthMock } = vi.hoisted(
  () => ({
    revokeSession: vi.fn(),
    terminarSesion: vi.fn(),
    getAccessToken: vi.fn(),
    useAuthMock: vi.fn(),
  }),
)

vi.mock('@/lib/api/session.service', () => ({ revokeSession }))
vi.mock('@/lib/auth/session-terminal', () => ({ terminarSesion }))
vi.mock('@/lib/api/client', () => ({ getAccessToken }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: useAuthMock }))

import { IdleSessionGuard } from './IdleSessionGuard'
import { CLAVE_ULTIMA_ACTIVIDAD } from '@/lib/auth/idle-timeout'

const MIN = 60_000
const TOPE_MIN = 10

let container: HTMLDivElement
let root: Root

function montar() {
  act(() => {
    root.render(<IdleSessionGuard />)
  })
}

/** Deja la marca como si la última acción hubiera sido hace `ms`. */
function inactivoHace(ms: number) {
  localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now() - ms))
}

/** Avanza el reloj dejando correr los efectos del intervalo y las promesas. */
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const aviso = () => container.querySelector('[role="alertdialog"]')
const cuenta = () =>
  container.querySelector('[aria-live="assertive"]')?.textContent ?? null
const botonContinuar = () =>
  Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Continuar'),
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-18T12:00:00Z'))
  localStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES', String(TOPE_MIN))

  revokeSession.mockReset().mockResolvedValue({ revoked: true })
  terminarSesion.mockReset()
  getAccessToken.mockReset().mockReturnValue('token-vivo')
  useAuthMock.mockReset().mockReturnValue({ isAuthenticated: true })

  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('IdleSessionGuard', () => {
  it('no muestra nada mientras hay actividad reciente', async () => {
    montar()
    await avanzar(2000)
    expect(aviso()).toBeNull()
  })

  it('muestra el aviso al entrar en el último minuto', async () => {
    montar()
    inactivoHace(9 * MIN)
    await avanzar(1000)

    expect(aviso()).not.toBeNull()
    expect(botonContinuar()).toBeTruthy()
  })

  it('la cuenta baja segundo a segundo', async () => {
    montar()
    inactivoHace(9 * MIN)
    await avanzar(1000)
    const primera = Number(cuenta())
    expect(primera).toBeGreaterThan(0)
    expect(primera).toBeLessThanOrEqual(60)

    await avanzar(5000)
    expect(Number(cuenta())).toBe(primera - 5)
  })

  it('«Continuar» saca el aviso y deja la sesión viva', async () => {
    montar()
    inactivoHace(9 * MIN)
    await avanzar(1000)

    await act(async () => {
      botonContinuar()!.click()
    })

    expect(aviso()).toBeNull()
    expect(terminarSesion).not.toHaveBeenCalled()

    // Y sigue viva un rato largo después.
    await avanzar(5 * MIN)
    expect(terminarSesion).not.toHaveBeenCalled()
  })

  /**
   * El orden es la razón de ser de todo esto: `terminarSesion` levanta la
   * bandera que corta TODA petición nueva, así que una revocación disparada
   * después no llegaría nunca.
   */
  it('revoca en el servidor ANTES de cerrar la sesión', async () => {
    montar()
    inactivoHace(TOPE_MIN * MIN)
    await avanzar(1000)

    expect(revokeSession).toHaveBeenCalledWith('token-vivo')
    expect(terminarSesion).toHaveBeenCalledWith('inactividad')
    expect(revokeSession.mock.invocationCallOrder[0]).toBeLessThan(
      terminarSesion.mock.invocationCallOrder[0],
    )
  })

  it('cierra igual si la revocación falla — un backend caído no deja a nadie adentro', async () => {
    revokeSession.mockRejectedValue(new Error('backend caído'))
    montar()
    inactivoHace(TOPE_MIN * MIN)
    await avanzar(1000)

    expect(terminarSesion).toHaveBeenCalledWith('inactividad')
  })

  it('cierra una sola vez aunque el reloj siga corriendo', async () => {
    montar()
    inactivoHace(TOPE_MIN * MIN)
    await avanzar(5000)

    expect(terminarSesion).toHaveBeenCalledTimes(1)
  })

  /**
   * Cross-tab: si la otra pestaña corrió la marca, este aviso tiene que
   * retirarse solo. Sin esto, una pestaña de fondo desloguea a alguien que está
   * trabajando en otra.
   */
  it('retira el aviso cuando otra pestaña registra actividad', async () => {
    montar()
    inactivoHace(9 * MIN)
    await avanzar(1000)
    expect(aviso()).not.toBeNull()

    localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()))
    await avanzar(1000)

    expect(aviso()).toBeNull()
    expect(terminarSesion).not.toHaveBeenCalled()
  })

  describe('apagado', () => {
    it('sin la variable no hace absolutamente nada', async () => {
      vi.stubEnv('NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES', '')
      montar()
      inactivoHace(24 * 60 * MIN)
      await avanzar(5000)

      expect(aviso()).toBeNull()
      expect(terminarSesion).not.toHaveBeenCalled()
    })

    it('no corre para un visitante sin sesión', async () => {
      useAuthMock.mockReturnValue({ isAuthenticated: false })
      montar()
      inactivoHace(24 * 60 * MIN)
      await avanzar(5000)

      expect(aviso()).toBeNull()
      expect(terminarSesion).not.toHaveBeenCalled()
    })
  })
})
