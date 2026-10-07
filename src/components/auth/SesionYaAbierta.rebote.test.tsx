/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): «Continuar» de «¿Sigues con esta cuenta?»
 * sólo sigue con una sesión viva, y si la persona vuelve rebotada justo
 * después, la tarjeta no le ofrece el mismo «Continuar» en bucle.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const auth = vi.hoisted(() => ({
  signOut: vi.fn(async () => {}),
  confirmarSesionVigente: vi.fn(async () => 'viva' as 'viva' | 'muerta' | 'sin-respuesta'),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: { name: 'Nico García', email: 'nico@inmobiliaria.co' },
    mfaRequired: false,
    mfaEnrollRequired: false,
    ...auth,
  }),
}))

import { SesionYaAbierta, type MotivoDelCambioDeCuenta } from './SesionYaAbierta'
import { anotarQueContinua, volvioJustoDespuesDeContinuar } from '@/lib/auth/regreso-tras-continuar'

let container: HTMLDivElement
let root: Root
let hrefAsignados: string[]
let onCambiarDeCuenta: Mock<(motivo?: MotivoDelCambioDeCuenta) => void>
const ubicacionOriginal = window.location

function montar() {
  act(() => {
    root.render(<SesionYaAbierta destino="/panel/inmobiliaria" onCambiarDeCuenta={onCambiarDeCuenta} />)
  })
}

async function clic(testId: string) {
  await act(async () => {
    ;(container.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement).click()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  sessionStorage.clear()
  auth.signOut.mockClear()
  auth.confirmarSesionVigente.mockReset().mockResolvedValue('viva')
  onCambiarDeCuenta = vi.fn<(motivo?: MotivoDelCambioDeCuenta) => void>()
  hrefAsignados = []
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...ubicacionOriginal,
      set href(v: string) {
        hrefAsignados.push(v)
      },
    },
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  Object.defineProperty(window, 'location', { configurable: true, value: ubicacionOriginal })
})

describe('«Continuar» valida la sesión', () => {
  it('viva: navega al destino y anota que continuó', async () => {
    montar()
    await clic('sesion-continuar')
    expect(auth.confirmarSesionVigente).toHaveBeenCalledTimes(1)
    expect(hrefAsignados).toEqual(['/panel/inmobiliaria'])
    expect(volvioJustoDespuesDeContinuar()).toBe(true)
  })

  it('muerta (token vencido y la renovación falló): cierra la sesión local y pasa al formulario con el porqué, sin navegar', async () => {
    auth.confirmarSesionVigente.mockResolvedValue('muerta')
    montar()
    await clic('sesion-continuar')
    expect(hrefAsignados).toEqual([])
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(onCambiarDeCuenta).toHaveBeenCalledWith('sesion-vencida')
    expect(volvioJustoDespuesDeContinuar()).toBe(false)
  })

  it('sin respuesta de Supabase: sigue al destino (el destino ya espera, no rebota)', async () => {
    auth.confirmarSesionVigente.mockResolvedValue('sin-respuesta')
    montar()
    await clic('sesion-continuar')
    expect(hrefAsignados).toEqual(['/panel/inmobiliaria'])
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})

describe('vuelve justo después de «Continuar» (rebote)', () => {
  it('no ofrece el mismo «Continuar como…»: lo dice y la salida principal es «Entrar con otra cuenta»', async () => {
    anotarQueContinua('/panel/inmobiliaria')
    montar()

    const tarjeta = container.querySelector('[data-testid="sesion-ya-abierta"]')!
    expect(tarjeta.getAttribute('data-rebote')).toBe('true')
    expect(container.textContent).toContain('No pudimos abrir tu sesión')
    expect(container.querySelector('[data-testid="sesion-rebote-frase"]')!.textContent).toContain(
      'Tocaste «Continuar» y volviste a esta pantalla',
    )
    expect(container.querySelector('[data-testid="sesion-continuar"]')).toBeNull()

    await clic('sesion-rebote-otra-cuenta')
    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(onCambiarDeCuenta).toHaveBeenCalledTimes(1)
    expect(hrefAsignados).toEqual([])
  })

  it('la marca se consume al mostrarse: recargar /auth no repite el aviso', () => {
    anotarQueContinua('/panel/inmobiliaria')
    montar()
    expect(volvioJustoDespuesDeContinuar()).toBe(false)
  })

  it('«Intentar de nuevo» sigue disponible, discreto', async () => {
    anotarQueContinua('/panel/inmobiliaria')
    montar()
    await clic('sesion-rebote-intentar')
    expect(hrefAsignados).toEqual(['/panel/inmobiliaria'])
  })
})
