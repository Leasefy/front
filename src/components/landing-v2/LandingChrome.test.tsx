/**
 * LandingChrome — la piel de la landing, usable fuera de la landing.
 *
 * Dos cosas que, si se rompen, no dan error en consola: el modo claro y el
 * alcance del scope `.lv2`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false, user: null }),
}))

// next/font no corre fuera de Next: se devuelven las mismas variables.
vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  Inter_Tight: () => ({ variable: '--font-inter-tight' }),
  IBM_Plex_Mono: () => ({ variable: '--font-ibm-plex-mono' }),
}))

import { LandingChrome } from './LandingChrome'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.documentElement.classList.remove('dark')
  window.localStorage.clear()
})

function montar() {
  act(() => {
    root.render(
      <LandingChrome activo="inmuebles">
        <div data-testid="contenido" className="p-6">
          contenido
        </div>
      </LandingChrome>,
    )
  })
}

describe('LandingChrome', () => {
  describe('siempre claro', () => {
    it('quita el tema oscuro: la hoja de la landing no tiene variante oscura', () => {
      // Con el tema oscuro puesto, el header salía claro sobre una página
      // oscura — dos mitades de dos diseños distintos pegadas por la mitad.
      document.documentElement.classList.add('dark')
      montar()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('lo repone al salir: el panel sigue respetando la preferencia', () => {
      window.localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
      montar()
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      act(() => root.unmount())
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      // El afterEach vuelve a desmontar; se deja una raíz viva para no romperlo.
      root = createRoot(container)
    })
  })

  describe('el alcance del scope', () => {
    it('`.lv2` envuelve el header, NUNCA el contenido', () => {
      /*
       * `landing-v2.css` abre con `.lv2 *{margin:0;padding:0}` — misma
       * especificidad que las utilidades de Tailwind y carga después. Con el
       * contenido adentro del scope, todo su espaciado se vuelve cero: el
       * `p-4 md:p-6` del catálogo computaba `0px` y las tarjetas quedaban
       * pegadas al borde, sin un solo error en consola.
       */
      montar()
      const scope = container.querySelector('[data-testid="landing-chrome"]')
      const contenido = container.querySelector('[data-testid="contenido"]')
      expect(scope).not.toBeNull()
      expect(contenido).not.toBeNull()
      expect(scope!.contains(contenido!)).toBe(false)
    })

    it('el header sí queda adentro del scope', () => {
      montar()
      const scope = container.querySelector('[data-testid="landing-chrome"]')
      expect(scope!.querySelector('#hdr')).not.toBeNull()
    })

    it('trae LogoDefs — sin el símbolo el logo desaparece en silencio', () => {
      // El header referencia `<use href="#lfLogo"/>`. Sin el `<symbol>` el SVG
      // renderiza vacío, sin error en consola. Ya pasó en /landing-v2.
      montar()
      expect(container.querySelector('#lfLogo')).not.toBeNull()
    })
  })
})
