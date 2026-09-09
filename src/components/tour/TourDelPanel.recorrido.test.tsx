/**
 * El recorrido completo, montado: bienvenida → pasos → cierre.
 *
 * Lo que se protege acá, que es justo lo que se rompe solo:
 *  1. Abre por la bienvenida y termina por el cierre, con el número del paso
 *     contando SÓLO los pasos anclados.
 *  2. **Omitir está en todas las pantallas** y desde una intermedia apaga la
 *     preferencia (`setTourDismissed(true)`), igual que llegar al final.
 *  3. El teclado: → avanza, ← retrocede, Esc omite.
 *  4. Un paso cuyo elemento no se puede señalar no aparece; sin ningún
 *     elemento el recorrido no se monta y la preferencia se apaga sola.
 *
 * `framer-motion` va mockeado: `AnimatePresence mode="wait"` no monta la
 * pantalla nueva hasta que la vieja termina de salir, y en una prueba eso es
 * «no está» (ver `animatepresence-wait-en-tests` en las memorias del repo).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { prefs } = vi.hoisted(() => ({
  prefs: {
    tourDismissed: false as boolean | null,
    setTourDismissed: vi.fn(async (_v: boolean) => {}),
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
  useAuth: () => ({ user: { firstName: 'Nico', name: 'Nico G' }, agency: { name: 'Portofino' } }),
}))

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefs: () => prefs,
}))

import { TourDelPanel } from './TourDelPanel'
import { PASOS_DEL_TOUR } from './pasos-del-tour'

let contenedor: HTMLDivElement
let root: Root

/**
 * Planta en el documento los anclajes que se le pidan, con tamaño real:
 * `sePuedeSenalar` mide, y en happy-dom un div pelado mide 0×0.
 */
function plantarAnclajes(selectores: readonly string[]) {
  for (const sel of selectores) {
    const el = document.createElement('div')
    const attr = sel.match(/\[([\w-]+)="([^"]+)"\]/)
    if (attr) el.setAttribute(attr[1]!, attr[2]!)
    el.getBoundingClientRect = () =>
      ({ top: 100, left: 40, width: 200, height: 36, right: 240, bottom: 136, x: 40, y: 100, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(el)
  }
}

const q = (sel: string) => document.querySelector(sel)
const txt = () => document.body.textContent ?? ''

function pintar() {
  act(() => {
    root.render(<TourDelPanel />)
  })
  // Los pasos se cuentan cada 300 ms hasta que el número se repite (el panel
  // termina de pintar el sidebar). 7 s cubre los 20 intentos del peor caso —el
  // de cero anclajes, que nunca se estabiliza y agota los reintentos.
  act(() => {
    vi.advanceTimersByTime(7000)
  })
}

function clic(sel: string) {
  const el = q(sel) as HTMLElement | null
  if (!el) throw new Error(`no está en pantalla: ${sel}`)
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function tecla(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  prefs.tourDismissed = false
  prefs.setTourDismissed = vi.fn(async () => {})
  document.body.innerHTML = ''
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  // happy-dom no implementa scrollIntoView en todos los elementos.
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

describe('el recorrido, de punta a punta', () => {
  it('abre por la bienvenida, saluda por el nombre y por la inmobiliaria', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()

    expect(q('[data-testid="tour-del-panel"]')?.getAttribute('data-pantalla')).toBe('bienvenida')
    expect(txt()).toContain('inmobiliaria.tour.bienvenida.saludo(Nico)')
    expect(txt()).toContain('inmobiliaria.tour.bienvenida.titulo(Portofino)')
    // El botón de la bienvenida dice «Empezar», no «Siguiente».
    expect(q('[data-testid="tour-siguiente"]')?.textContent).toContain('inmobiliaria.tour.empezar')
    // Y no hay «Atrás» todavía.
    expect(q('[data-testid="tour-atras"]')).toBeNull()
  })

  it('bienvenida → pasos → cierre, con el número contando sólo los pasos', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()

    clic('[data-testid="tour-siguiente"]')
    expect(q('[data-testid="tour-del-panel"]')?.getAttribute('data-pantalla')).toBe('paso')
    expect(txt()).toContain(`inmobiliaria.tour.paso(1,${PASOS_DEL_TOUR.length})`)
    expect(txt()).toContain(PASOS_DEL_TOUR[0]!.tituloKey)

    for (let i = 0; i < PASOS_DEL_TOUR.length - 1; i++) clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain(
      `inmobiliaria.tour.paso(${PASOS_DEL_TOUR.length},${PASOS_DEL_TOUR.length})`,
    )

    clic('[data-testid="tour-siguiente"]')
    expect(q('[data-testid="tour-del-panel"]')?.getAttribute('data-pantalla')).toBe('cierre')
    expect(txt()).toContain('inmobiliaria.tour.cierre.punto1')
    expect(txt()).toContain('inmobiliaria.tour.cierre.volver')
    expect(q('[data-testid="tour-siguiente"]')?.textContent).toContain('inmobiliaria.tour.entendido')

    // Terminar cuenta como visto: la misma preferencia que Omitir.
    expect(prefs.setTourDismissed).not.toHaveBeenCalled()
    clic('[data-testid="tour-siguiente"]')
    expect(prefs.setTourDismissed).toHaveBeenCalledWith(true)
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
  })

  it('el cuerpo y el dato del paso salen de sus claves', () => {
    plantarAnclajes([PASOS_DEL_TOUR[0]!.selector])
    pintar()
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain(PASOS_DEL_TOUR[0]!.cuerpoKey)
    expect(txt()).toContain(PASOS_DEL_TOUR[0]!.datoKey!)
  })

  it('el progreso dice en qué paso va', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    expect(q('[data-testid="tour-progreso"]')?.getAttribute('aria-valuenow')).toBe('0')
    clic('[data-testid="tour-siguiente"]')
    expect(q('[data-testid="tour-progreso"]')?.getAttribute('aria-valuenow')).toBe('1')
    expect(q('[data-testid="tour-progreso"]')?.getAttribute('aria-valuemax')).toBe(
      String(PASOS_DEL_TOUR.length),
    )
  })

  it('la tarjeta es un diálogo rotulado por su título', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    const tarjeta = q('[data-testid="tour-tarjeta"]')!
    expect(tarjeta.getAttribute('role')).toBe('dialog')
    expect(tarjeta.getAttribute('aria-modal')).toBe('true')
    const id = tarjeta.getAttribute('aria-labelledby')!
    expect(document.getElementById(id)?.textContent).toContain('inmobiliaria.tour')
  })
})

describe('omitir', () => {
  it('está en TODAS las pantallas', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    expect(q('[data-testid="tour-saltar"]')).not.toBeNull() // bienvenida
    clic('[data-testid="tour-siguiente"]')
    expect(q('[data-testid="tour-saltar"]')).not.toBeNull() // paso 1
    clic('[data-testid="tour-siguiente"]')
    expect(q('[data-testid="tour-saltar"]')).not.toBeNull() // paso 2
  })

  it('desde un paso intermedio cuenta como visto', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    clic('[data-testid="tour-siguiente"]')
    clic('[data-testid="tour-siguiente"]')
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain(`inmobiliaria.tour.paso(3,${PASOS_DEL_TOUR.length})`)

    clic('[data-testid="tour-saltar"]')
    expect(prefs.setTourDismissed).toHaveBeenCalledWith(true)
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
  })

  it('la ✕ hace lo mismo', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    clic('[data-testid="tour-siguiente"]')
    clic('[data-testid="tour-cerrar"]')
    expect(prefs.setTourDismissed).toHaveBeenCalledWith(true)
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
  })
})

describe('teclado', () => {
  it('→ avanza y ← retrocede', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    tecla('ArrowRight')
    expect(txt()).toContain(`inmobiliaria.tour.paso(1,${PASOS_DEL_TOUR.length})`)
    tecla('ArrowRight')
    expect(txt()).toContain(`inmobiliaria.tour.paso(2,${PASOS_DEL_TOUR.length})`)
    tecla('ArrowLeft')
    expect(txt()).toContain(`inmobiliaria.tour.paso(1,${PASOS_DEL_TOUR.length})`)
    tecla('ArrowLeft')
    expect(q('[data-testid="tour-del-panel"]')?.getAttribute('data-pantalla')).toBe('bienvenida')
  })

  it('← en la bienvenida no se sale por abajo', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    tecla('ArrowLeft')
    expect(q('[data-testid="tour-del-panel"]')?.getAttribute('data-pantalla')).toBe('bienvenida')
  })

  it('Esc omite y cuenta como visto', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    tecla('ArrowRight')
    tecla('Escape')
    expect(prefs.setTourDismissed).toHaveBeenCalledWith(true)
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
  })

  it('el foco arranca en la tarjeta y vuelve a donde estaba al cerrar', () => {
    const antes = document.createElement('button')
    document.body.appendChild(antes)
    antes.focus()
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    expect(document.activeElement).toBe(q('[data-testid="tour-tarjeta"]'))
    tecla('Escape')
    expect(document.activeElement).toBe(antes)
  })
})

describe('nunca se señala un hueco', () => {
  it('el paso cuyo elemento no está no aparece', () => {
    plantarAnclajes([PASOS_DEL_TOUR[0]!.selector, PASOS_DEL_TOUR[2]!.selector])
    pintar()
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain('inmobiliaria.tour.paso(1,2)')
    expect(txt()).toContain(PASOS_DEL_TOUR[0]!.tituloKey)
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain(PASOS_DEL_TOUR[2]!.tituloKey)
    expect(txt()).not.toContain(PASOS_DEL_TOUR[1]!.tituloKey)
  })

  it('un elemento presente pero de tamaño cero no cuenta (el sidebar en móvil)', () => {
    plantarAnclajes([PASOS_DEL_TOUR[0]!.selector])
    const invisible = document.createElement('div')
    invisible.setAttribute('data-tour-target', 'sidebar-inmuebles')
    document.body.appendChild(invisible) // sin getBoundingClientRect ⇒ 0×0
    pintar()
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain('inmobiliaria.tour.paso(1,1)')
  })

  it('si el elemento se esconde a mitad del recorrido, el paso se salta (no se congela)', () => {
    plantarAnclajes(PASOS_DEL_TOUR.slice(0, 3).map((p) => p.selector))
    pintar()
    clic('[data-testid="tour-siguiente"]')
    expect(txt()).toContain(PASOS_DEL_TOUR[0]!.tituloKey)

    // El sidebar se esconde por debajo de `lg`: los anclajes siguen en el DOM
    // pero miden 0×0.
    for (const p of PASOS_DEL_TOUR.slice(0, 2)) {
      const el = document.querySelector(p.selector) as HTMLElement
      el.getBoundingClientRect = () => ({ width: 0, height: 0, top: 0, left: 0 }) as DOMRect
    }
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    // No se queda clavado: salta al paso que sí se puede señalar.
    expect(document.querySelector('[data-testid="tour-del-panel"]')).not.toBeNull()
    expect(txt()).toContain(PASOS_DEL_TOUR[2]!.tituloKey)
  })

  it('sin ningún elemento no se monta nada y la preferencia se apaga', () => {
    pintar()
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
    expect(prefs.setTourDismissed).toHaveBeenCalledWith(true)
  })

  it('con el muro de la puesta en marcha arriba no arranca, y la preferencia NO se toca', () => {
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    const muro = document.createElement('div')
    muro.setAttribute('data-testid', 'muro-migracion')
    document.body.appendChild(muro)
    pintar()
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
    expect(prefs.setTourDismissed).not.toHaveBeenCalled()
  })

  it('con la preferencia ya apagada no se monta', () => {
    prefs.tourDismissed = true
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
  })

  it('mientras hidrata (null) tampoco', () => {
    prefs.tourDismissed = null
    plantarAnclajes(PASOS_DEL_TOUR.map((p) => p.selector))
    pintar()
    expect(q('[data-testid="tour-del-panel"]')).toBeNull()
    expect(prefs.setTourDismissed).not.toHaveBeenCalled()
  })
})
