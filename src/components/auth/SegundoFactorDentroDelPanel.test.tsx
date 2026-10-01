/**
 * El segundo factor se activa DENTRO del panel de la inmobiliaria.
 *
 * 🔴 Nico, 30-09-2026: «¿por qué me está sacando y me lleva a esta página? …
 * todo lo de activar el 2FA debe pasar ya DENTRO, porque yo estoy es dentro».
 *
 * Lo que se fija acá:
 *  - con `mfaEnrollRequired` NO se montan los hijos (el panel real y sus
 *    providers): sólo el esqueleto quieto y el paso a paso encima;
 *  - al activar, el «Listo» se queda hasta que el contexto suelta
 *    `mfaEnrollRequired` y pasa la pausa; ahí se monta el panel, sin navegar;
 *  - si el contexto no se entera, a los 8 s carga completa de ESTA pantalla;
 *  - con el muro de la migración tapando, el 2FA no sale encima: el panel
 *    (con su muro) se queda delante.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act, useContext, useEffect } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, signOutMock, setMfaVerifiedMock, lenisMock, authState, ruta } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  setMfaVerifiedMock: vi.fn(),
  lenisMock: { stop: vi.fn(), start: vi.fn() },
  ruta: { actual: '/panel/inmobiliaria/contratos' },
  authState: {
    mfaEnrollRequired: true,
    agency: { id: 'ag1', name: 'Inmobiliaria Horizonte' } as { id: string; name: string } | null,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => ruta.actual,
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ ...authState, signOut: signOutMock, setMfaVerified: setMfaVerifiedMock }),
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => lenisMock,
}))

// El paso a paso tiene sus propias pruebas; acá basta con sus dos salidas.
vi.mock('@/components/auth/ActivarSegundoFactorPasoAPaso', () => ({
  ActivarSegundoFactorPasoAPaso: ({
    onActivado,
    onYaTeniaFactor,
  }: {
    onActivado: (id: string) => void
    onYaTeniaFactor: () => void
  }) => (
    <div data-testid="paso-a-paso">
      <h1>Activa tu segundo factor</h1>
      <input aria-label="Código" data-testid="codigo" />
      <button type="button" data-testid="activar" onClick={() => onActivado('f1')}>
        Activar
      </button>
      <button type="button" data-testid="ya-tenia" onClick={() => onYaTeniaFactor()}>
        Ya tenía
      </button>
    </div>
  ),
}))

import { SegundoFactorDentroDelPanel } from './SegundoFactorDentroDelPanel'
import { AvisoDelMuroContext } from '@/components/migracion/migracion-context'

let container: HTMLDivElement
let root: Root
const montajesDelPanel = vi.fn()

/** Lo que haría el panel real: registrarse al montar (y pedir datos). */
function PanelDePrueba() {
  useEffect(() => {
    montajesDelPanel()
  }, [])
  return <div data-testid="panel-real">panel</div>
}

/** El muro, reducido a lo que avisa hacia arriba. */
function MuroDePrueba({ tapado }: { tapado: boolean }) {
  const avisar = useContext(AvisoDelMuroContext)
  useEffect(() => {
    avisar?.(tapado)
  }, [avisar, tapado])
  return <div data-testid="muro">{tapado ? 'muro puesto' : 'muro abajo'}</div>
}

async function pintar(hijos: React.ReactNode = <PanelDePrueba />) {
  await act(async () => {
    root.render(<SegundoFactorDentroDelPanel>{hijos}</SegundoFactorDentroDelPanel>)
  })
}

const hay = (id: string) => document.querySelector(`[data-testid="${id}"]`) !== null

beforeEach(() => {
  authState.mfaEnrollRequired = true
  authState.agency = { id: 'ag1', name: 'Inmobiliaria Horizonte' }
  ruta.actual = '/panel/inmobiliaria/contratos'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('SegundoFactorDentroDelPanel — con mfaEnrollRequired', () => {
  it('NO monta el panel real (ni sus providers): pinta el esqueleto quieto y el paso a paso encima', async () => {
    await pintar()

    expect(hay('panel-real')).toBe(false)
    expect(montajesDelPanel).not.toHaveBeenCalled()
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
    expect(hay('esqueleto-del-panel')).toBe(true)
    expect(hay('paso-a-paso')).toBe(true)
    // Nada de la pantalla de entrar: ni su tarjeta ni su fondo de marca.
    expect(hay('mfa-enroll-tarjeta')).toBe(false)
    expect(document.querySelector('img')).toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('el esqueleto no se toca ni se lee (inert + aria-hidden) y lleva el nombre de la inmobiliaria', async () => {
    await pintar()

    const esqueleto = document.querySelector('[data-testid="esqueleto-del-panel"]')!
    const capa = esqueleto.parentElement!
    expect(capa.hasAttribute('inert')).toBe(true)
    expect(capa.getAttribute('aria-hidden')).toBe('true')
    expect(esqueleto.textContent).toContain('Inmobiliaria Horizonte')
    // Quieto: no está «cargando» nada.
    expect(esqueleto.querySelector('.animate-pulse')).toBeNull()
  })

  it('el modal es un diálogo modal, frena Lenis y lleva data-lenis-prevent', async () => {
    await pintar()

    const modal = document.querySelector('[data-testid="segundo-factor-dentro-modal"]')!
    expect(modal.getAttribute('role')).toBe('dialog')
    expect(modal.getAttribute('aria-modal')).toBe('true')
    expect(modal.hasAttribute('data-lenis-prevent')).toBe(true)
    expect(lenisMock.stop).toHaveBeenCalled()
    expect(modal.textContent).toContain('Cerrar sesión')
  })

  it('el Tab no se escapa del modal: desde el último vuelve al primero', async () => {
    await pintar()

    const modal = document.querySelector<HTMLElement>('[data-testid="segundo-factor-dentro-modal"]')!
    const botones = modal.querySelectorAll<HTMLElement>('input, button')
    const ultimo = botones[botones.length - 1]
    ultimo.focus()
    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    await act(async () => {
      document.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(botones[0])
  })

  it('«Cerrar sesión» cierra la sesión y va a /auth', async () => {
    await pintar()

    const boton = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Cerrar sesión'),
    )!
    await act(async () => {
      boton.click()
    })
    expect(signOutMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })

  it('si la cuenta ya tenía un factor, va a escribir su código con la vuelta a esta pantalla', async () => {
    await pintar()

    await act(async () => {
      document.querySelector<HTMLElement>('[data-testid="ya-tenia"]')!.click()
    })
    expect(replaceMock).toHaveBeenCalledWith(
      `/auth/mfa-verify?returnUrl=${encodeURIComponent('/panel/inmobiliaria/contratos')}`,
    )
  })
})

describe('SegundoFactorDentroDelPanel — al activar', () => {
  it('se queda en el «Listo» hasta que el contexto suelta mfaEnrollRequired y pasa la pausa; ahí monta el panel, sin navegar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await pintar()

    await act(async () => {
      document.querySelector<HTMLElement>('[data-testid="activar"]')!.click()
    })
    expect(setMfaVerifiedMock).toHaveBeenCalled()
    // Sin el «Cerrar sesión»: ya está saliendo.
    expect(document.body.textContent).not.toContain('Cerrar sesión')

    // El contexto se entera (MFA_CHALLENGE_VERIFIED)…
    authState.mfaEnrollRequired = false
    await pintar()
    // …pero el «Listo» todavía se lee: el panel NO se monta de una.
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
    expect(hay('panel-real')).toBe(false)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(hay('panel-real')).toBe(true)
    expect(montajesDelPanel).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalled()
    expect(lenisMock.start).toHaveBeenCalled()
  })

  it('si el contexto no se entera en 8 s, carga completa de ESTA misma pantalla', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const assign = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, pathname: '/panel/inmobiliaria/contratos', search: '?vista=tabla', hash: '', assign },
    })
    try {
      await pintar()
      await act(async () => {
        document.querySelector<HTMLElement>('[data-testid="activar"]')!.click()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9000)
      })
      expect(assign).toHaveBeenCalledWith('/panel/inmobiliaria/contratos?vista=tabla')
      expect(hay('panel-real')).toBe(false)
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
    }
  })
})

describe('SegundoFactorDentroDelPanel — sin pendiente', () => {
  it('sin mfaEnrollRequired monta el panel tal cual, sin escena', async () => {
    authState.mfaEnrollRequired = false
    await pintar()

    expect(hay('panel-real')).toBe(true)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
  })

  it('si el contexto suelta mfaEnrollRequired SIN activar acá (otra pestaña), monta el panel de una', async () => {
    await pintar()
    expect(hay('panel-real')).toBe(false)

    authState.mfaEnrollRequired = false
    await pintar()
    expect(hay('panel-real')).toBe(true)
  })
})

describe('SegundoFactorDentroDelPanel — el orden: migración → segundo factor', () => {
  it('con el muro tapando, el 2FA NO sale encima: el panel con su muro se queda delante; entra cuando el muro baja', async () => {
    authState.mfaEnrollRequired = false
    await pintar(<MuroDePrueba tapado />)
    expect(hay('muro')).toBe(true)

    // Se resolvió la migración y el back ya exige, pero la bienvenida sigue.
    authState.mfaEnrollRequired = true
    await pintar(<MuroDePrueba tapado />)
    expect(hay('muro')).toBe(true)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)

    // La persona entra (la bienvenida se cierra): ahora sí, el segundo factor.
    await pintar(<MuroDePrueba tapado={false} />)
    expect(hay('muro')).toBe(false)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
  })
})
