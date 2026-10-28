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
  Host_Grotesk: () => ({ variable: '--font-host-grotesk' }),
  DM_Mono: () => ({ variable: '--font-dm-mono' }),
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
  describe('🔴 la barra de la landing nueva (Nico, 27-10: «solo debe haber una landing y es la nueva»)', () => {
    it('es la MISMA barra de la home: su marcado, sus fuentes y sin la franja negra de arriba', () => {
      montar()
      const barra = container.querySelector('[data-testid="barra-de-la-home"]')
      expect(barra?.classList.contains('lfh')).toBe(true)
      expect(barra?.className).toContain('--font-host-grotesk')
      expect(barra?.className).toContain('--font-dm-mono')
      expect(barra?.querySelector('header.hdr#hdr')).not.toBeNull()
      expect(barra?.querySelector('.nav .pm .pm-btn')).not.toBeNull()
      expect(container.querySelector('.mk-anuncio')).toBeNull()
      // Nada de la barra vieja: ni su mega menú ni su menú del celular.
      expect(container.querySelector('#pmenu')).toBeNull()
      expect(container.querySelector('#mmenu')).toBeNull()
      expect(container.querySelector('.como-la-home')).toBeNull()
    })

    it('el menú: Marketplace, Producto, Planes, Avalúos y Contacto, cada uno su enlace', () => {
      montar()
      const nav = container.querySelector('.hdr .nav')!
      const enlaces = [...nav.querySelectorAll(':scope > a')].map((a) => a.textContent?.trim())
      expect(enlaces).toEqual(['Marketplace', 'Planes', 'Avalúos', 'Contacto'])
      expect(nav.querySelector(':scope > a[aria-current="page"]')?.textContent).toContain('Marketplace')
    })

    it('«Producto» abre el mega menú de la home (las tarjetas con «Ver producto →») y Escape lo cierra', () => {
      montar()
      const boton = container.querySelector<HTMLButtonElement>('.pm-btn')!
      expect(boton.getAttribute('aria-expanded')).toBe('false')
      act(() => boton.click())
      expect(boton.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelector('.pm')?.classList.contains('pm-abierto')).toBe(true)
      const tarjetas = [...container.querySelectorAll('.pm-big')]
      expect(tarjetas.map((t) => t.querySelector('b')?.textContent)).toEqual(['CRM inmobiliario', 'ERP de arriendos'])
      expect(tarjetas[0].textContent).toContain('Ver producto →')
      expect(container.querySelectorAll('.pm-ag .pm-it')).toHaveLength(6)
      expect(container.querySelectorAll('.pm-pub .pm-it')).toHaveLength(4)
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(boton.getAttribute('aria-expanded')).toBe('false')
    })

    it('el menú del celular abre y cierra con su botón, y «Producto» se despliega adentro', () => {
      montar()
      const barra = container.querySelector('[data-testid="barra-de-la-home"]')!
      const mbtn = container.querySelector<HTMLButtonElement>('.mbtn')!
      expect(mbtn.textContent).toBe('Menú')
      act(() => mbtn.click())
      expect(barra.classList.contains('menu-abierto')).toBe(true)
      expect(mbtn.textContent).toBe('Cerrar')
      const producto = container.querySelector<HTMLButtonElement>('.pm-m-btn')!
      expect(container.querySelector('#pmM')?.hasAttribute('hidden')).toBe(true)
      act(() => producto.click())
      expect(container.querySelector('#pmM')?.hasAttribute('hidden')).toBe(false)
      act(() => mbtn.click())
      expect(barra.classList.contains('menu-abierto')).toBe(false)
    })

    it('sin sesión: Entrar y Publicar gratis, que reemplaza a Crear cuenta (27-10-2026)', () => {
      montar()
      const botones = [...container.querySelectorAll('.hdr-cta a.btn')].map((a) => a.textContent)
      expect(botones).toEqual(['Entrar', 'Publicar gratis'])
    })
  })

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
    it('el envoltorio de la barra NUNCA envuelve el contenido', () => {
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
