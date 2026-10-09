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
 *  - el 2FA va ANTES de la migración (T-0151): con el muro tapando, el 2FA
 *    sale encima igual;
 *  - es el siguiente paso de la puesta en marcha, no un pop-up (Nico, 30-09:
 *    «¿dentro de la plataforma por qué pone el "Cerrar sesión"?»): sin
 *    «Cerrar sesión», con el «Antes de empezar» y la tarjeta de la decisión
 *    de migrar, y diciendo que es obligatorio.
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

// La foto de marca, sin el cargador de Next (en desarrollo arma URLs con
// `window.location`, que una de estas pruebas reemplaza).
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// El paso a paso tiene sus propias pruebas; acá basta con sus dos salidas.
vi.mock('@/components/auth/ActivarSegundoFactorPasoAPaso', () => ({
  ActivarSegundoFactorPasoAPaso: ({
    onActivado,
    onYaTeniaFactor,
    sinEncabezado,
  }: {
    onActivado: (id: string) => void
    onYaTeniaFactor: () => void
    sinEncabezado?: boolean
  }) => (
    <div data-testid="paso-a-paso" data-sin-encabezado={sinEncabezado ? 'si' : 'no'}>
      {sinEncabezado ? null : <h1>Activa tu segundo factor</h1>}
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

import { FOTO_DEL_SEGUNDO_FACTOR, SegundoFactorDentroDelPanel } from './SegundoFactorDentroDelPanel'
import { AvisoDelMuroContext } from '@/components/migracion/migracion-context'
import { FOTO_DE_LA_DECISION, ModalDecisionDeMigracion } from '@/components/migracion/DecisionDeMigracion'
import { VELO_DE_LA_PUESTA_EN_MARCHA } from '@/components/puesta-en-marcha/TarjetaDePuestaEnMarcha'
import { anunciarRelevo, olvidarRelevo } from '@/components/puesta-en-marcha/relevo'

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
  olvidarRelevo()
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
    // Nada de la pantalla de entrar: ni su tarjeta ni su fondo de marca. La
    // única foto es la de la tarjeta de la puesta en marcha.
    expect(hay('mfa-enroll-tarjeta')).toBe(false)
    const fotos = Array.from(document.querySelectorAll('img'))
    expect(fotos.map((f) => f.getAttribute('src'))).toEqual([FOTO_DEL_SEGUNDO_FACTOR])
    expect(fotos[0].closest('[data-testid="segundo-factor-dentro-foto"]')).not.toBeNull()
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
  })

  it('NO ofrece «Cerrar sesión»: adentro el paso se termina, no se sale', async () => {
    await pintar()

    expect(document.body.textContent).not.toContain('Cerrar sesión')
    const botones = Array.from(document.querySelectorAll('button')).map((b) => b.textContent)
    expect(botones.some((t) => /sesi[oó]n/i.test(t ?? ''))).toBe(false)
  })

  it('es el siguiente paso de la puesta en marcha: «Antes de empezar», obligatorio y lo último', async () => {
    await pintar()

    const modal = document.querySelector<HTMLElement>('[data-testid="segundo-factor-dentro-modal"]')!
    expect(modal.textContent).toContain('Antes de empezar')
    const titulo = modal.querySelector('h2')!
    expect(titulo.textContent).toBe('Protege tu cuenta')
    // El diálogo se nombra por su título y se describe por la línea de obligatorio.
    expect(modal.getAttribute('aria-labelledby')).toBe(titulo.id)
    const obligatorio = document.querySelector('[data-testid="segundo-factor-dentro-obligatorio"]')!
    expect(modal.getAttribute('aria-describedby')).toBe(obligatorio.id)
    // Nico, 01-10: el PORQUÉ, corto — se lo exigimos, que sepa por qué.
    expect(obligatorio.textContent).toMatch(/la plata de tus propietarios e inquilinos/)
    expect(obligatorio.textContent).toMatch(/aunque tenga tu contraseña/)
    // El porqué se dice UNA vez: el paso a paso va sin su encabezado.
    expect(document.querySelector('[data-testid="paso-a-paso"]')!.getAttribute('data-sin-encabezado')).toBe('si')
    expect(modal.textContent?.match(/aunque tenga tu contraseña/g)).toHaveLength(1)
    // La cáscara de la decisión de migrar: dos columnas con la foto, 880 px, y
    // el radio de todo modal desde el 02-10 (24 px, DESIGN.md §17).
    expect(modal.className).toContain('max-w-[880px]')
    expect(modal.className).toContain('rounded-[24px]')
    expect(modal.className).toContain('md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]')
  })

  it('el velo es el MISMO de la decisión de migrar: el fondo no parpadea en el relevo', async () => {
    await pintar()
    const velo = document.querySelector<HTMLElement>('[data-testid="segundo-factor-dentro-velo"]')!
    const delSegundoFactor = velo.getAttribute('style')
    await act(async () => root.render(<ModalDecisionDeMigracion onDecidir={vi.fn()} />))
    const deLaDecision = document.querySelector('[data-testid="decision-de-migracion"]')!.getAttribute('style')
    // happy-dom no entiende `color-mix`: se compara el atributo entero.
    expect(delSegundoFactor).toBe(deLaDecision)
    expect(VELO_DE_LA_PUESTA_EN_MARCHA).toContain('62%')
  })

  it('llegando sola (al recargar), la tarjeta entra como la decisión', async () => {
    await pintar()

    const modal = document.querySelector('[data-testid="segundo-factor-dentro-modal"]')!
    expect(modal.getAttribute('data-entrada')).toBe('aparece')
    expect(document.querySelectorAll('img')).toHaveLength(1)
  })

  it('viniendo de la decisión, toma su tarjeta: no vuelve a entrar y la foto se funde sobre la de la decisión', async () => {
    anunciarRelevo(FOTO_DE_LA_DECISION)
    await pintar()

    const modal = document.querySelector('[data-testid="segundo-factor-dentro-modal"]')!
    expect(modal.getAttribute('data-entrada')).toBe('ya-estaba')
    const fotos = Array.from(document.querySelectorAll('img')).map((f) => f.getAttribute('src'))
    // La de la decisión debajo, la nueva encima.
    expect(fotos).toEqual([FOTO_DE_LA_DECISION, FOTO_DEL_SEGUNDO_FACTOR])
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
    // Con el «Listo», el encabezado del paso se va: ya no hay nada que pedir.
    expect(document.body.textContent).not.toContain('Protege tu cuenta')
    expect(hay('paso-a-paso')).toBe(true)

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

describe('SegundoFactorDentroDelPanel — el orden: segundo factor → migración', () => {
  // T-0151: the owner reversed the T-0099/Nico 30-09 order. A new agency
  // activates the second factor BEFORE it can start the migration.
  it('con el muro de la migración tapando, el 2FA sale encima: nada de la migración queda al alcance', async () => {
    authState.mfaEnrollRequired = false
    await pintar(<MuroDePrueba tapado />)
    expect(hay('muro')).toBe(true)

    authState.mfaEnrollRequired = true
    await pintar(<MuroDePrueba tapado />)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
    expect(hay('muro')).toBe(false)
  })

  it('con el 2FA pendiente y el muro aún sin avisar, el 2FA va primero y el muro no se monta', async () => {
    authState.mfaEnrollRequired = true
    await pintar(<MuroDePrueba tapado={false} />)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
    expect(hay('muro')).toBe(false)
  })

  it('ya activado el 2FA, la persona vuelve al muro de la migración', async () => {
    authState.mfaEnrollRequired = true
    await pintar(<MuroDePrueba tapado />)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)

    authState.mfaEnrollRequired = false
    await pintar(<MuroDePrueba tapado />)
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(hay('muro')).toBe(true)
  })
})
