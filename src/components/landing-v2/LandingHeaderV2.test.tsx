/**
 * LandingHeaderV2 — el header de la landing, uno solo.
 *
 * Vivía embebido en el JSX de `LandingHome`, así que `/propiedades` terminó
 * con OTRO header (el mega-menú viejo): otras rutas, otra tipografía, otra
 * forma. Estos tests fijan lo que hace que sea el mismo header en los dos
 * lados, y que diga dónde estás.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// Estado de sesion mutable: el header ahora decide QUE enlaces muestra segun
// quien mira, asi que los tests necesitan poder entrar como anonimo, como
// inquilino y como inmobiliaria sin remontar el modulo.
const authState: {
  isAuthenticated: boolean
  isLoading: boolean
  user: { role: string } | null
  activeContext: string | null
  agencyRole?: string | null
} = { isAuthenticated: false, isLoading: false, user: null, activeContext: null, agencyRole: null }

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

// El catálogo del marketplace (el número al lado de «Marketplace» y las
// inmobiliarias de la franja), sin red.
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    list: () =>
      Promise.resolve({
        data: [
          { id: 'a', status: 'available', images: ['x.jpg'], agencyName: 'Teja Roja Arriendos', neighborhood: 'Laureles', city: 'Medellín' },
          { id: 'b', status: 'available', images: ['y.jpg'], agencyName: 'Teja Roja Arriendos', neighborhood: 'Belén', city: 'Medellín' },
          { id: 'c', status: 'available', images: ['z.jpg'], agencyName: 'Cuadra Arriendos', neighborhood: null, city: 'Envigado' },
        ],
        meta: { total: 3 },
      }),
  },
}))

import { LandingHeaderV2 } from './LandingHeaderV2'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  authState.isAuthenticated = false
  authState.isLoading = false
  authState.user = null
  authState.activeContext = null
  authState.agencyRole = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(props: Parameters<typeof LandingHeaderV2>[0] = {}) {
  act(() => {
    root.render(<LandingHeaderV2 {...props} />)
  })
}

// Los enlaces de lo público llevan el idioma de la página (ES/EN, 16-10-2026):
// sin proveedor, español → «/es/...». `/publicar` y el panel no llevan prefijo.
describe('LandingHeaderV2', () => {
  it('trae los mismos enlaces del nav de la landing', () => {
    montar({ fxExterno: true })
    const rutas = [...container.querySelectorAll('nav.main a')].map((a) => a.getAttribute('href'))
    expect(rutas).toEqual(['/es/propiedades', '/publica', '#producto', '/es/avaluo', '/es/blog', '/es/contacto'])
  })

  it('el marketplace va primero y se llama igual en todas partes (Nico, 16-10-2026)', () => {
    // «cuando entren al marketplace que no cambie la disposición de los
    // elementos en la topbar»: el menú de /propiedades es el del home.
    montar({ fxExterno: true })
    const enLaLanding = [...container.querySelectorAll('nav.main a')].map((a) => a.textContent?.trim())
    act(() => root.unmount())
    root = createRoot(container)
    montar({ activo: 'inmuebles' })
    const enElMarketplace = [...container.querySelectorAll('nav.main a')].map((a) => a.textContent?.trim())
    expect(enElMarketplace).toEqual(enLaLanding)
    expect(enLaLanding.slice(0, 2)).toEqual([expect.stringContaining('Marketplace'), 'Publicar gratis'])
  })

  describe('dónde estás', () => {
    it('marca el enlace activo con aria-current', () => {
      // `aria-current="page"` y no una clase: es lo que los lectores de
      // pantalla ya anuncian, así que el estado se declara una sola vez.
      montar({ activo: 'inmuebles', fxExterno: true })
      const activo = container.querySelector('nav.main a[aria-current="page"]')
      expect(activo?.getAttribute('href')).toBe('/es/propiedades')
      expect(activo?.textContent).toContain('Marketplace')
    })

    it('marca uno solo POR NAVEGACIÓN', () => {
      // Hay dos navs en el DOM —el de escritorio y el del menú móvil— y cada
      // uno marca el suyo. Contarlos juntos daría dos y parecería un error;
      // lo que sería un error es que un nav marcara dos enlaces.
      montar({ activo: 'inmuebles', fxExterno: true })
      expect(container.querySelectorAll('nav.main a[aria-current="page"]')).toHaveLength(1)
      expect(container.querySelectorAll('#mmenu nav a[aria-current="page"]')).toHaveLength(1)
    })

    it('sin `activo` no marca ninguno — en la landing no estás "dentro" de nada', () => {
      montar({ fxExterno: true })
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
    })
  })

  describe('quién maneja el comportamiento', () => {
    it('con fxExterno no toca el header: lo monta initLandingFx', () => {
      // En la landing, `initLandingFx` ya engancha scroll, menú y reveals.
      // Dos dueños del mismo nodo se pisan.
      montar({ fxExterno: true })
      const hdr = container.querySelector('#hdr')
      expect(hdr?.className).toBe('')
    })

    it('solo, se pone en su estado claro — no hay hero oscuro detrás', () => {
      // Sin esto el nav sale blanco sobre blanco: `header:not(.scrolled)`
      // pinta los enlaces en #fff porque asume el hero de la home.
      montar({ activo: 'inmuebles' })
      const hdr = container.querySelector('#hdr')
      expect(hdr?.classList.contains('scrolled')).toBe(true)
      expect(hdr?.classList.contains('on')).toBe(true)
    })
  })

  describe('el menú móvil', () => {
    it('lleva Buscar inmueble', () => {
      montar({ activo: 'inmuebles', fxExterno: true })
      const enMovil = [...container.querySelectorAll('#mmenu nav a')].map((a) =>
        a.getAttribute('href'),
      )
      expect(enMovil).toContain('/es/propiedades')
    })

    it('también marca dónde estás', () => {
      // La regla `.lv2 .mmenu nav a[aria-current="page"] .t` existía y no
      // pintaba nada: el atributo sólo se había puesto en el nav de escritorio.
      // En un teléfono, el menú ES el nav.
      montar({ activo: 'inmuebles', fxExterno: true })
      const activo = container.querySelector('#mmenu nav a[aria-current="page"]')
      expect(activo?.getAttribute('href')).toBe('/es/propiedades')
    })
  })
  describe('a quien le sirve "Buscar inmueble"', () => {
    // A todos, con sesion o sin ella (Juan, Portofino, 15-10-2026: «al iniciar
    // sesión desaparece Buscar inmuebles»). Antes se le escondia a la
    // inmobiliaria; ahora sale en las DOS navegaciones para cualquiera.
    function entrarComo(role: string, activeContext: string | null = null) {
      authState.isAuthenticated = true
      authState.isLoading = false
      authState.user = { role }
      authState.activeContext = activeContext
    }

    it('el visitante anonimo lo ve — es la puerta al marketplace', () => {
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[href="/es/propiedades"]')).not.toBeNull()
      expect(container.querySelector('#mmenu nav a[href="/es/propiedades"]')).not.toBeNull()
    })

    it('el inquilino lo ve — es exactamente su caso de uso', () => {
      entrarComo('tenant')
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[href="/es/propiedades"]')).not.toBeNull()
      expect(container.querySelector('#mmenu nav a[href="/es/propiedades"]')).not.toBeNull()
    })

    it('la inmobiliaria con sesion TAMBIEN lo ve, en escritorio y en movil (Juan, 15-10)', () => {
      entrarComo('agency')
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[href="/es/propiedades"]')).not.toBeNull()
      expect(container.querySelector('#mmenu nav a[href="/es/propiedades"]')).not.toBeNull()
    })

    it('tambien quien esta parado en contexto de inmobiliaria', () => {
      entrarComo('tenant', 'agency')
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[href="/es/propiedades"]')).not.toBeNull()
    })

    it('mientras la sesion carga no lo esconde — no parpadea el nav', () => {
      authState.isLoading = true
      authState.isAuthenticated = false
      authState.user = null
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[href="/es/propiedades"]')).not.toBeNull()
    })

    it('al esconder «Publicar», el menu movil sigue numerado 01..06 sin huecos («Planes» oculto, 12-10)', () => {
      // Los numeros del menu movil son parte del diseno, no decoracion: si
      // desaparece uno y queda un hueco, el menu se lee roto.
      entrarComo('agency')
      authState.agencyRole = 'VIEWER'
      montar({ fxExterno: true })
      const numeros = [...container.querySelectorAll('#mmenu nav a .n')].map((n) => n.textContent)
      expect(numeros).toEqual(['01', '02', '03', '04', '05', '06'])
    })

    it('la inmobiliaria que publica ve 07 en el menu movil, con «Buscar inmueble» de primero', () => {
      entrarComo('agency')
      montar({ fxExterno: true })
      const enlaces = [...container.querySelectorAll('#mmenu nav a')]
      expect(enlaces.map((a) => a.querySelector('.n')?.textContent)).toEqual(['01', '02', '03', '04', '05', '06', '07'])
      expect(enlaces[0]?.getAttribute('href')).toBe('/es/propiedades')
    })

    it('la inmobiliaria SÍ ve «Publicar inmueble», y desde aquí también publica con el rápido (Nico, 09-10 y 20-10)', () => {
      entrarComo('agency')
      montar({ fxExterno: true })
      const enlace = container.querySelector('nav.main a[data-nav="publicar"]')
      expect(enlace?.getAttribute('href')).toBe('/publica')
      expect([...container.querySelectorAll('#mmenu nav a')].some((a) => a.getAttribute('href') === '/publica')).toBe(true)
    })

    it('su contador o una cuenta de sólo lectura no publican: no se les ofrece', () => {
      entrarComo('agency')
      authState.agencyRole = 'CONTADOR'
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[data-nav="publicar"]')).toBeNull()
    })

    it('sin sesión, «Publicar inmueble» va al publicador rápido de /publica', () => {
      montar({ fxExterno: true })
      expect(container.querySelector('nav.main a[data-nav="publicar"]')?.getAttribute('href')).toBe('/publica')
    })

    it('para el resto, el menu movil trae 07 (con «Publicar inmueble», 09-10-2026; sin «Planes» desde el 12-10)', () => {
      montar({ fxExterno: true })
      const numeros = [...container.querySelectorAll('#mmenu nav a .n')].map((n) => n.textContent)
      expect(numeros).toEqual(['01', '02', '03', '04', '05', '06', '07'])
    })
  })

  describe('fuera de la landing', () => {
    // `initLandingFx` —que abre el mega-menú y hace el scroll suave— sólo
    // corre en el home. Todo lo de acá es lo que el header tiene que
    // resolver solo cuando lo montan en /blog, /avaluo o /terminos.

    it('el mega-menú de Producto abre, cierra con Escape y cierra clickeando afuera', () => {
      montar()
      const raiz = document.documentElement
      const trigger = container.querySelector('#pmTrigger') as HTMLAnchorElement

      act(() => {
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect(raiz.classList.contains('pm-open')).toBe(true)

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(raiz.classList.contains('pm-open')).toBe(false)

      act(() => {
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      expect(raiz.classList.contains('pm-open')).toBe(true)
      act(() => {
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(raiz.classList.contains('pm-open')).toBe(false)
    })

    it('el clic en Producto no navega al ancla', () => {
      montar()
      const trigger = container.querySelector('#pmTrigger') as HTMLAnchorElement
      const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
      act(() => {
        trigger.dispatchEvent(evento)
      })
      expect(evento.defaultPrevented).toBe(true)
      document.documentElement.classList.remove('pm-open')
    })

    it('con fxExterno NO toca el mega-menú — ese es de initLandingFx', () => {
      montar({ fxExterno: true })
      const trigger = container.querySelector('#pmTrigger') as HTMLAnchorElement
      act(() => {
        trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      })
      // Dos dueños alternando la misma clase la dejarían donde estaba.
      expect(document.documentElement.classList.contains('pm-open')).toBe(false)
    })

    it('las anclas que viven en el home se piden CON el home', () => {
      // Un `#planes` pelado desde /blog no lleva a ningún lado: la sección
      // está en el home. Con fxExterno se dejan crudas para que el scroll
      // suave del home las siga atendiendo.
      montar()
      const rutas = [...container.querySelectorAll('nav.main a')].map((a) => a.getAttribute('href'))
      expect(rutas).toEqual(['/es/propiedades', '/publica', '/es#producto', '/es/avaluo', '/es/blog', '/es/contacto'])
      const movil = [...container.querySelectorAll('#mmenu nav a')].map((a) => a.getAttribute('href'))
      expect(movil).toContain('/es#producto')
    })

    it('«Ver planes» está oculto por ahora (Nico, 12-10-2026)', () => {
      montar()
      const textos = [...container.querySelectorAll('a')].map((a) => a.textContent ?? '')
      expect(textos.some((t) => t.includes('Ver planes'))).toBe(false)
      const movil = [...container.querySelectorAll('#mmenu nav a')].map((a) => a.textContent ?? '')
      expect(movil.some((t) => t.includes('Planes'))).toBe(false)
    })
  })
})
