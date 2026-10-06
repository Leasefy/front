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
 * Desde el 05-10-2026 es la dirección A «Escenario» que eligió Nico
 * (`PresentacionEscenario`): el Dialog del DS, con el orbe grande del agente
 * que despierta —quieto → pensando → trabajando → listo— y SÓLO sus dos
 * anillos (sin las líneas grandes alrededor). Antes (02-10) era la tarjeta
 * §Novedades con el orbe; las pruebas de esa tarjeta se cambiaron por las del
 * escenario.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionConfig } from 'framer-motion'

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

import { AgentIntroModal } from './AgentIntroModal'

const RUTA_DE_COBRANZA = '/panel/inmobiliaria/pagos/cobranza'
const CLAVE = 'agente:cobranza'

let contenedor: HTMLDivElement
let root: Root

function pintar(suppressed = false, reducido = false) {
  act(() => {
    root.render(
      <MotionConfig reducedMotion={reducido ? 'always' : 'never'}>
        <AgentIntroModal pathname={RUTA_DE_COBRANZA} suppressed={suppressed} />
      </MotionConfig>,
    )
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
    const cta = document.querySelector('[data-testid="presentacion-empezar"]') as HTMLElement
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

  it('es el Dialog de la plataforma: capa de los modales, título anunciado, y el llamado adentro', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const modal = dialogo() as HTMLElement
    expect(modal.className).toContain('z-[300]')
    // El título lo pinta el escenario; Radix lo anuncia con `aria-labelledby`.
    const titulo = document.getElementById(modal.getAttribute('aria-labelledby') ?? '')
    expect(titulo?.textContent).toBe('inmobiliaria.ai.intro.cobranza.title')
    expect(modal.querySelector('[data-testid="presentacion-empezar"]')).not.toBeNull()
  })

  it('🔴 A «Escenario»: el orbe grande del agente, SÓLO con sus dos anillos (Nico, 05-10)', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const modal = dialogo() as HTMLElement
    const orbe = modal.querySelector('[data-orbe-de-la-presentacion] .cdc-orb') as HTMLElement
    expect(orbe).not.toBeNull()
    expect(orbe.dataset.agente).toBe('cobranza')
    // Decorativo: el título ya nombra al agente.
    expect(orbe.getAttribute('aria-hidden')).toBe('true')
    // Sin la retícula de círculos grandes ni líneas de puntos: el fondo no tiene SVG.
    expect(modal.querySelector('[data-fondo-de-marca] svg')).toBeNull()
    // Cada orbe (el del escritorio y el del celular) con SUS dos anillos, y nada más.
    for (const o of modal.querySelectorAll<HTMLElement>('[data-orbe-de-la-presentacion]')) {
      const anillos = Array.from(o.querySelectorAll<HTMLElement>('[data-anillo-del-orbe]')).map((a) => a.dataset.anilloDelOrbe)
      expect(anillos).toEqual(['punteado', 'arco'])
    }
    expect(modal.querySelectorAll('[data-anillo-del-orbe]').length).toBe(
      modal.querySelectorAll('[data-orbe-de-la-presentacion]').length * 2,
    )
    // Sin la píldora «L Leasefy» de la tarjeta vieja.
    expect(modal.textContent).not.toContain('Leasefy')
  })

  it('el orbe despierta mientras aparece el texto: quieto → pensando → trabajando → listo', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    const estado = () => (document.querySelector('[data-orbe-de-la-presentacion] .cdc-orb') as HTMLElement).dataset.estado
    expect(estado()).toBe('quieto')
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(estado()).toBe('pensando')
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(estado()).toBe('trabajando')
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(estado()).toBe('listo')
    // Y se queda listo mientras la presentación esté abierta.
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(estado()).toBe('listo')
    expect(dialogo()?.textContent).toContain('inmobiliaria.ai.intro.cobranza.title')
  })

  it('con movimiento reducido el orbe queda listo de una, sin la secuencia', () => {
    prefs.vistas[CLAVE] = false
    pintar(false, true)
    const orbe = document.querySelector('[data-orbe-de-la-presentacion] .cdc-orb') as HTMLElement
    expect(orbe.dataset.estado).toBe('listo')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(orbe.dataset.estado).toBe('listo')
  })

  it('el modo sale de la flota: sin flota, Copiloto (con el que arranca todo agente)', () => {
    prefs.vistas[CLAVE] = false
    pintar()
    expect(document.querySelector('[data-testid="modo-del-agente"]')?.getAttribute('data-modo')).toBe('copiloto')
  })

  it('al cerrarse devuelve el foco a donde estaba', () => {
    prefs.vistas[CLAVE] = false
    const boton = document.createElement('button')
    document.body.appendChild(boton)
    boton.focus()
    pintar()
    const cta = document.querySelector('[data-testid="presentacion-empezar"]') as HTMLElement
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
    const cta = document.querySelector('[data-testid="presentacion-empezar"]') as HTMLElement
    act(() => cta.click())
    expect(window.localStorage.getItem('leasefy.agent-intro.cobranza')).toBeNull()
  })
})
