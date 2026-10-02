/**
 * La presentación de cada agente de IA sale UNA vez por inmobiliaria (Nico,
 * 23-09), con el mismo mecanismo que el recorrido del panel: clave
 * `agente:<id>` en `PanelPrefsContext`. Antes era `localStorage` por
 * navegador: otra persona, u otro navegador, la volvía a ver.
 *
 *   · `null` (no se sabe si la agencia ya la vio) → no sale;
 *   · `true` → no sale;
 *   · `false` → sale, y al cerrarla queda vista para la agencia: el fondo,
 *     Esc y la ✕ la dejan `omitido`, «Entendido» `completo`.
 *
 * Desde el 02-10 es el `Dialog` de Radix, como `PilotoNovedad`: la tarjeta de
 * `FeatureAnnouncement` adentro de un Content transparente, con la ✕ del
 * producto.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { prefs } = vi.hoisted(() => ({
  prefs: {
    vistas: {} as Record<string, boolean | null>,
    estaVista: (clave: string): boolean | null => prefs.vistas[clave] ?? null,
    marcarVista: vi.fn(async (_clave: string, _estado: 'completo' | 'omitido') => {}),
  },
}))

vi.mock('@/lib/context/PanelPrefsContext', () => ({
  usePanelPrefs: () => prefs,
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

// La tarjeta de la marca no es lo que se prueba acá: un doble con su CTA que
// además deja ver la píldora de la marca (`brand`) tal como la pinta cadence:
// `brand ?? <píldora con appName>`.
vi.mock('@leasefy/cadence', () => ({
  FeatureAnnouncement: ({
    title,
    ctaLabel,
    onCta,
    brand,
    appName = 'Cadence',
  }: {
    title: string
    ctaLabel: string
    onCta: () => void
    brand?: React.ReactNode
    appName?: string
  }) => (
    <div>
      <div data-testid="presentacion-heroe">{brand ?? <span data-testid="presentacion-pildora">{appName}</span>}</div>
      <p>{title}</p>
      <button type="button" data-testid="presentacion-cta" onClick={onCta}>
        {ctaLabel}
      </button>
    </div>
  ),
}))

import { AgentIntroModal } from './AgentIntroModal'

const RUTA_DE_COBRANZA = '/panel/inmobiliaria/pagos/cobranza'
const CLAVE = 'agente:cobranza'

let contenedor: HTMLDivElement
let root: Root

function pintar(suppressed = false) {
  act(() => {
    root.render(<AgentIntroModal pathname={RUTA_DE_COBRANZA} suppressed={suppressed} />)
  })
  act(() => {
    vi.advanceTimersByTime(700)
  })
}

const dialogo = () => document.querySelector('[role="dialog"]')

beforeEach(() => {
  vi.useFakeTimers()
  prefs.vistas = {}
  prefs.marcarVista = vi.fn(async () => {})
  document.body.innerHTML = ''
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('la presentación del agente, una vez por inmobiliaria', () => {
  it('🔴 mientras no se sabe si la agencia ya la vio (null), no sale', () => {
    pintar()
    expect(dialogo()).toBeNull()
  })

  it('si la agencia ya la vio, no sale', () => {
    prefs.vistas[CLAVE] = true
    pintar()
    expect(dialogo()).toBeNull()
  })

  it('si no la ha visto, sale', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    expect(dialogo()).not.toBeNull()
  })

  it('suprimida (el recorrido del panel está saliendo), no sale', () => {
    prefs.vistas[CLAVE] = false
    pintar(true)
    expect(dialogo()).toBeNull()
  })

  it('🔴 «Entendido» la deja COMPLETA para la agencia', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const cta = document.querySelector('[data-testid="presentacion-cta"]') as HTMLElement
    act(() => cta.click())
    expect(prefs.marcarVista).toHaveBeenCalledWith(CLAVE, 'completo')
    expect(dialogo()).toBeNull()
  })

  it('🔴 Esc la deja OMITIDA para la agencia', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(prefs.marcarVista).toHaveBeenCalledWith(CLAVE, 'omitido')
  })

  it('la ✕ también la deja OMITIDA, y es el aspa del producto', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const aspa = document.querySelector('[data-testid="presentacion-del-agente-cerrar"]') as HTMLButtonElement
    expect(aspa.getAttribute('aria-label')).toBe('common.close')
    expect(aspa.className).toContain('rounded-full')
    act(() => aspa.click())
    expect(prefs.marcarVista).toHaveBeenCalledWith(CLAVE, 'omitido')
    expect(dialogo()).toBeNull()
  })

  it('el clic en el fondo también la deja OMITIDA', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    // Radix mira el `pointerdown` fuera del contenido (el velo es hermano del Content).
    const velo = document.body.querySelector('[data-state="open"]:not([role="dialog"])') as HTMLElement
    expect(velo).not.toBeNull()
    // Radix empieza a escuchar el `pointerdown` de afuera un tic después de abrir.
    act(() => {
      vi.advanceTimersByTime(10)
    })
    act(() => {
      velo.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
    })
    expect(prefs.marcarVista).toHaveBeenCalledWith(CLAVE, 'omitido')
  })

  it('es el Dialog de la plataforma: capa de los modales, título anunciado, y la tarjeta adentro', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const modal = dialogo() as HTMLElement
    expect(modal.className).toContain('z-[300]')
    // El título lo pinta la tarjeta; Radix lo anuncia con `aria-labelledby`.
    const titulo = document.getElementById(modal.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('inmobiliaria.ai.intro.cobranza.title')
    expect(modal.querySelector('[data-testid="presentacion-cta"]')).not.toBeNull()
  })

  it('🔴 sin la píldora «L Leasefy» sobre el halo (Nico, 02-10)', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const heroe = document.querySelector('[data-testid="presentacion-heroe"]') as HTMLElement
    expect(heroe).not.toBeNull()
    expect(heroe.querySelector('[data-testid="presentacion-pildora"]')).toBeNull()
    expect(heroe.textContent).toBe('')
  })

  it('al cerrarse devuelve el foco a donde estaba', () => {
    prefs.vistas[CLAVE] = false
    const boton = document.createElement('button')
    document.body.appendChild(boton)
    boton.focus()
    pintar()
    const cta = document.querySelector('[data-testid="presentacion-cta"]') as HTMLElement
    act(() => cta.click())
    // Radix devuelve el foco un tic después de desmontar el contenido.
    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(document.activeElement).toBe(boton)
  })

  it('ya no guarda nada en localStorage: la marca es de la agencia', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const cta = document.querySelector('[data-testid="presentacion-cta"]') as HTMLElement
    act(() => cta.click())
    expect(window.localStorage.getItem('leasefy.agent-intro.cobranza')).toBeNull()
  })
})
