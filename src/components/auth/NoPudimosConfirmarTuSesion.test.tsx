/**
 * «No pudimos confirmar tu sesión» (Nico, 02-10-2026): la consulta del segundo
 * factor no respondió ni reintentando. Sólo «Reintentar»; con la red caída no
 * repite el aviso de `<AvisoDeConexion>` y reintenta sola cuando vuelve.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { retryMfaCheck } = vi.hoisted(() => ({ retryMfaCheck: vi.fn() }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ retryMfaCheck }) }))

import { NoPudimosConfirmarTuSesion } from './NoPudimosConfirmarTuSesion'
import {
  avisarFallaDeRed,
  avisarQueLeasefyRespondio,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  reiniciarEstadoDeConexion()
  retryMfaCheck.mockReset().mockResolvedValue(undefined)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  reiniciarEstadoDeConexion()
})

function pintar() {
  act(() => {
    root.render(<NoPudimosConfirmarTuSesion />)
  })
}
const boton = () => container.querySelector('[data-testid="reintentar-confirmar-sesion"]') as HTMLButtonElement

describe('<NoPudimosConfirmarTuSesion>', () => {
  it('dice qué pasó, que la sesión sigue abierta, y ofrece sólo «Reintentar»', () => {
    pintar()
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
    expect(container.textContent).toContain('Tu sesión sigue abierta')
    expect(boton().textContent).toContain('Reintentar')
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('«Reintentar» vuelve a preguntar, una vez aunque se apriete dos veces', async () => {
    let soltar!: () => void
    retryMfaCheck.mockReturnValue(new Promise<void>((r) => { soltar = r }))
    pintar()
    await act(async () => {
      boton().click()
      boton().click()
    })
    expect(retryMfaCheck).toHaveBeenCalledTimes(1)
    expect(boton().disabled).toBe(true)
    await act(async () => soltar())
    expect(boton().disabled).toBe(false)
  })

  it('sin internet no repite el aviso de la franja: «Esperando la conexión…», no el error', () => {
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false })
      avisarFallaDeRed()
    })
    pintar()
    expect(container.textContent).toContain('Esperando la conexión…')
    expect(container.textContent).not.toContain('No pudimos confirmar tu sesión')
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true })
  })

  it('cuando Leasefy vuelve a responder, reintenta sola', async () => {
    act(() => avisarFallaDeRed())
    pintar()
    expect(container.textContent).toContain('Esperando a Leasefy…')
    expect(retryMfaCheck).not.toHaveBeenCalled()
    await act(async () => avisarQueLeasefyRespondio())
    expect(retryMfaCheck).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
  })
})
