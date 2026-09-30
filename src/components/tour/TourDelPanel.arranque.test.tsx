/**
 * 🔴 Cuándo arranca SOLO el recorrido de una cuenta nueva (Nico, 30-09-2026).
 *
 * «luego de la migracion y que despues del 2fa, porque no se esta mostrando de
 * manera automatica a las cuentas nuevas el onboarding o tour de panel»
 *
 * El orden que pidió:
 *   · con migración:  muro → (confeti) → segundo factor → recorrido
 *   · sin migración:  la pregunta previa → segundo factor → recorrido
 *
 * El recorrido tiene que salir solo, UNA vez, cuando ya no queda nada delante:
 * ni el muro, ni la pregunta previa, ni la bienvenida con confeti, ni el segundo
 * factor pendiente.
 *
 * ── El defecto que esto atrapa ─────────────────────────────────────────────
 *
 * El conteo de pasos miraba si había una capa delante y, si la había, se
 * CORTABA sin volver a programarse. El comentario decía «para que el recorrido
 * salga solo cuando la capa caiga», pero nada lo volvía a despertar: sus
 * dependencias eran `[activo, permisosListos]`, y ninguna de las dos cambia
 * cuando el muro baja. La cuenta nueva que entraba con el muro puesto perdía el
 * recorrido en toda esa sesión.
 *
 * Y lo contrario: la pregunta previa al muro y la bienvenida con confeti son
 * diálogos sin `data-state`, así que no contaban como capa; el recorrido
 * arrancaba DEBAJO de la pregunta y, al elegir «Migrar ahora», quedaba ENCIMA
 * del muro (z-400 contra z-120), con Esc vivo para «omitirlo» sin verlo.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { prefs, sesion, migracion } = vi.hoisted(() => ({
  prefs: {
    tourDismissed: null as boolean | null,
    cerrarRecorrido: vi.fn(async (_estado: 'completo' | 'omitido') => {}),
  },
  sesion: {
    mfaRequired: false,
    mfaEnrollRequired: false,
  },
  migracion: {
    valor: null as null | {
      estado: { bloquea: boolean; resuelta: 'completada' | 'omitida' | null; pasos: never[] } | null
      abrir: () => void
      recargar: () => Promise<void>
    },
  },
}))

vi.mock('framer-motion', async () => {
  const R = await import('react')
  const cache = new Map<string, unknown>()
  const motion = new Proxy(
    {},
    {
      get: (_o, etiqueta: string) => {
        if (!cache.has(etiqueta)) {
          const Pasar = R.forwardRef<HTMLElement, Record<string, unknown>>(function Pasar(props, ref) {
            const { initial, animate, exit, transition, whileHover, whileTap, layout, ...resto } = props
            void initial
            void animate
            void exit
            void transition
            void whileHover
            void whileTap
            void layout
            return R.createElement(etiqueta, { ...resto, ref })
          })
          cache.set(etiqueta, Pasar)
        }
        return cache.get(etiqueta)
      },
    },
  )
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      R.createElement(R.Fragment, null, children),
    useReducedMotion: () => true,
  }
})

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string | number>) =>
      vars ? `${k}(${Object.values(vars).join(',')})` : k,
    locale: 'es',
  }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: { firstName: 'Nico', name: 'Nico G' },
    agency: { name: 'Portofino' },
    mfaRequired: sesion.mfaRequired,
    mfaEnrollRequired: sesion.mfaEnrollRequired,
  }),
}))

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefs: () => prefs,
}))

vi.mock('@/components/migracion/migracion-context', () => ({
  useMigracion: () => migracion.valor,
}))

import { TourDelPanel } from './TourDelPanel'
import { PASOS_DEL_TOUR } from './pasos-del-tour'

let contenedor: HTMLDivElement
let root: Root

function plantarAnclajes() {
  for (const { selector } of PASOS_DEL_TOUR) {
    const el = document.createElement('div')
    const attr = selector.match(/\[([\w-]+)="([^"]+)"\]/)
    if (attr) el.setAttribute(attr[1]!, attr[2]!)
    el.getBoundingClientRect = () =>
      ({ top: 100, left: 40, width: 200, height: 36, right: 240, bottom: 136, x: 40, y: 100, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(el)
  }
}

/** Una capa de las que tapan el panel, como la dibuja su componente. */
function ponerCapa(testid: string, extra: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-testid', testid)
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

function pintar() {
  act(() => {
    root.render(<TourDelPanel />)
  })
}

/**
 * El tiempo avanza de a un latido, cada uno en su propio `act`: dentro de UN
 * `act` React junta los cambios de estado y los pinta al salir, así que un
 * `advanceTimersByTime(5000)` de una sola vez vería el primer «ya no hay nada
 * delante» recién al final de los cinco segundos — no como en el navegador.
 */
function pasar(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - t))
    })
  }
}

const tour = () => document.querySelector('[data-testid="tour-del-panel"]')
const pantalla = () => tour()?.getAttribute('data-pantalla') ?? null

beforeEach(() => {
  vi.useFakeTimers()
  prefs.tourDismissed = null
  prefs.cerrarRecorrido = vi.fn(async () => {})
  sesion.mfaRequired = false
  sesion.mfaEnrollRequired = false
  migracion.valor = null
  document.body.innerHTML = ''
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    value: () => {},
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('🔴 cuenta nueva: el recorrido arranca solo cuando ya no queda nada delante', () => {
  it('con migración: preferencias sin saber → muro → confeti → segundo factor → recorrido (en la MISMA sesión)', () => {
    plantarAnclajes()
    const muro = ponerCapa('muro-migracion')

    // 1. Todavía no se sabe si la agencia lo vio (la lectura no volvió o falló).
    pintar()
    pasar(3000)
    expect(tour()).toBeNull()

    // 2. La lectura vuelve: la agencia no lo ha visto. El muro sigue puesto.
    prefs.tourDismissed = false
    pintar()
    pasar(3000)
    expect(tour()).toBeNull()

    // 3. La migración termina: el muro baja y sale la bienvenida con confeti.
    muro.remove()
    const confeti = ponerCapa('bienvenida-a-leasefy', { role: 'dialog' })
    pasar(3000)
    expect(tour()).toBeNull()

    // 4. «Entrar a Leasefy»: el confeti se va y se pide el segundo factor.
    confeti.remove()
    sesion.mfaEnrollRequired = true
    pintar()
    pasar(3000)
    expect(tour()).toBeNull()

    // 5. Segundo factor activado: ya no queda nada delante → sale solo.
    sesion.mfaEnrollRequired = false
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
    // Y nadie lo dio por visto en el camino.
    expect(prefs.cerrarRecorrido).not.toHaveBeenCalled()
  })

  it('sin migración: mientras está la pregunta previa («¿Migramos tu inmobiliaria?») no arranca debajo', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    const pregunta = ponerCapa('decision-de-migracion')
    pintar()
    pasar(4000)
    expect(tour()).toBeNull()

    // «En otro momento» → segundo factor → recorrido.
    pregunta.remove()
    sesion.mfaEnrollRequired = true
    pintar()
    pasar(3000)
    expect(tour()).toBeNull()

    sesion.mfaEnrollRequired = false
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
    expect(prefs.cerrarRecorrido).not.toHaveBeenCalled()
  })

  it('🔴 Esc en la pregunta previa («en otro momento») NO omite el recorrido para toda la agencia', () => {
    // La pregunta toma Esc en `document` como «en otro momento» y no frena la
    // propagación. Con el recorrido abierto DEBAJO de ella (invisible), su Esc
    // en `window` lo cerraba como `omitido`: la inmobiliaria lo perdía para
    // siempre sin haberlo visto.
    plantarAnclajes()
    prefs.tourDismissed = false
    ponerCapa('decision-de-migracion')
    pintar()
    pasar(4000)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(prefs.cerrarRecorrido).not.toHaveBeenCalled()
  })

  it('con el segundo factor por verificar (factor ya inscrito) tampoco arranca', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    sesion.mfaRequired = true
    pintar()
    pasar(4000)
    expect(tour()).toBeNull()

    sesion.mfaRequired = false
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
  })

  it('tras el segundo factor el panel se monta de nuevo (ProtectedRoute lo desmonta): arranca en el montaje nuevo', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    const muro = ponerCapa('muro-migracion')
    pintar()
    pasar(3000)
    expect(tour()).toBeNull()

    // ProtectedRoute pinta el spinner del segundo factor: todo el panel se va.
    act(() => root.unmount())
    muro.remove()
    root = createRoot(contenedor)
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
  })
})

describe('lo que dice el contexto de la migración también cuenta', () => {
  it('si el back dice que el muro bloquea, espera aunque el muro todavía no se haya dibujado', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    migracion.valor = {
      estado: { bloquea: true, resuelta: null, pasos: [] },
      abrir: () => {},
      recargar: async () => {},
    }
    pintar()
    pasar(4000)
    expect(tour()).toBeNull()

    migracion.valor = { ...migracion.valor, estado: { bloquea: false, resuelta: 'omitida', pasos: [] } }
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
  })

  it('mientras el muro no ha contestado espera un poco — pero no para siempre (ante la duda, el panel se ve)', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    migracion.valor = { estado: null, abrir: () => {}, recargar: async () => {} }
    pintar()
    pasar(2500)
    expect(tour()).toBeNull()

    // El muro nunca contestó (el back falló): el recorrido no se pierde.
    pasar(8000)
    expect(pantalla()).toBe('bienvenida')
  })
})

describe('una capa que aparece con el recorrido abierto lo PAUSA, no lo cierra', () => {
  it('se esconde mientras la capa está, Esc no lo omite a ciegas, y vuelve en la misma pantalla', () => {
    plantarAnclajes()
    prefs.tourDismissed = false
    pintar()
    pasar(5000)
    expect(pantalla()).toBe('bienvenida')
    act(() => {
      ;(document.querySelector('[data-testid="tour-siguiente"]') as HTMLElement).click()
    })
    expect(pantalla()).toBe('paso')

    // Un diálogo de Radix que se abre encima (p. ej. el muro abierto a mano o
    // un modal que la persona pidió).
    const dialogo = ponerCapa('un-dialogo', { role: 'dialog', 'data-state': 'open' })
    pasar(700)
    expect(tour()).toBeNull()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(prefs.cerrarRecorrido).not.toHaveBeenCalled()

    dialogo.remove()
    pasar(700)
    expect(pantalla()).toBe('paso')
    expect(document.body.textContent).toContain(`inmobiliaria.tour.paso(1,${PASOS_DEL_TOUR.length})`)
  })
})
