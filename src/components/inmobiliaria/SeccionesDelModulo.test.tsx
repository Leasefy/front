/**
 * SeccionesDelModulo — las secciones del módulo se quedan quietas.
 *
 * El defecto que fija este archivo (Nico, 2026-09-03): en `/inmuebles` se veían
 * dos pestañas, «Inmuebles · Avalúos»; al entrar en Avalúos desaparecían y en
 * su mismo sitio aparecían OTRAS pestañas, las del agente (Resumen · Mis
 * solicitudes · Configuración). Dos niveles distintos con la misma cara,
 * turnándose el lugar. La regla nueva: las secciones son cards que no se van
 * mientras estés en cualquiera de ellas —también dentro de un agente—, y la
 * profundidad de cada sección va DEBAJO, con otra cara (`WorkspaceNav`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ruta = { actual: '/panel/inmobiliaria/inmuebles' }

vi.mock('next/navigation', () => ({
  usePathname: () => ruta.actual,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))

vi.mock('@/lib/i18n', () => ({
  // La última parte de la clave alcanza para reconocer cada sección.
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

/** Permisos configurables por test: ADMIN con todo, o un rol acotado. */
const permisos = {
  isAdmin: true,
  agencyRole: 'ADMIN' as string | null,
  modulos: null as string[] | null, // null = todos
}

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string) => permisos.modulos === null || permisos.modulos.includes(m),
    isAdmin: permisos.isAdmin,
    agencyRole: permisos.agencyRole,
    agentAccessStatus: 'ok',
  }),
}))

import { SeccionesDelModulo } from './SeccionesDelModulo'

let contenedor: HTMLDivElement
let root: Root

function render(pathname: string) {
  ruta.actual = pathname
  act(() => {
    root.render(<SeccionesDelModulo />)
  })
}

/** href → { activa, actual } de cada card, en orden. */
function cards(): Array<{ href: string; label: string; activa: boolean; actual: boolean }> {
  return [...contenedor.querySelectorAll('nav a')].map((a) => ({
    href: a.getAttribute('href') ?? '',
    label: (a.textContent ?? '').replace(/IA$/, '').trim(),
    activa: a.getAttribute('data-activa') === 'true',
    actual: a.getAttribute('aria-current') === 'page',
  }))
}

beforeEach(() => {
  permisos.isAdmin = true
  permisos.agencyRole = 'ADMIN'
  permisos.modulos = null
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('SeccionesDelModulo — las cards no se van al entrar en una sección', () => {
  it('en la raíz del módulo muestra sus secciones como cards, con la raíz marcada', () => {
    render('/panel/inmobiliaria/inmuebles')
    expect(cards()).toEqual([
      { href: '/panel/inmobiliaria/inmuebles', label: 'inmuebles', activa: true, actual: true },
      { href: '/panel/inmobiliaria/inmuebles/avaluos', label: 'avaluos', activa: false, actual: false },
    ])
  })

  it('DENTRO del agente (Avalúos) las mismas cards siguen ahí y Avalúos queda marcada', () => {
    render('/panel/inmobiliaria/inmuebles/avaluos')
    const [inmuebles, avaluos] = cards()
    expect(inmuebles).toMatchObject({ activa: false, actual: false })
    expect(avaluos).toMatchObject({ href: '/panel/inmobiliaria/inmuebles/avaluos', activa: true, actual: true })
  })

  it('más adentro del agente (una pestaña suya) las cards siguen, marcada pero sin aria-current', () => {
    render('/panel/inmobiliaria/inmuebles/avaluos/cola')
    const avaluos = cards().find((c) => c.href.endsWith('/avaluos'))
    expect(avaluos).toMatchObject({ activa: true, actual: false })
    expect(cards()).toHaveLength(2)
  })

  it('en la ficha de un caso de Cobranza se ven las cuatro secciones de Cobros, con Cobranza marcada', () => {
    render('/panel/inmobiliaria/cobros/cobranza/deudores/abc-123')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['cobros', 'recaudo', 'cartera', 'cobranza'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['cobranza'])
  })

  it('en Pagos, la sección hermana (Liquidaciones) marca su card y la Sala no', () => {
    render('/panel/inmobiliaria/pagos/liquidaciones')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['pagos', 'liquidaciones', 'dispersiones'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['liquidaciones'])
  })

  it('se dibuja como SECCIONES (cards en un riel), nunca como las pestañas del agente', () => {
    render('/panel/inmobiliaria/inmuebles/avaluos')
    const franja = contenedor.querySelector('[data-nivel]')
    expect(franja?.getAttribute('data-nivel')).toBe('secciones')
    // El riel: un contenedor único con las cards adentro.
    const nav = contenedor.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Secciones de inmuebles')
    expect(nav?.children).toHaveLength(1)
    expect(nav?.children[0].querySelectorAll('a')).toHaveLength(2)
  })

  it('no sale en la impresión', () => {
    render('/panel/inmobiliaria/inmuebles')
    expect(contenedor.querySelector('[data-nivel]')?.className).toContain('print:hidden')
  })
})

describe('SeccionesDelModulo — cuándo NO se dibuja', () => {
  it('en una ficha del listado (la raíz es exacta): la ficha trae su propia cabecera', () => {
    render('/panel/inmobiliaria/inmuebles/123')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('en un módulo de una sola sección (Conciliación), aunque sea un agente', () => {
    render('/panel/inmobiliaria/conciliacion/cola')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('fuera de un módulo (Inicio)', () => {
    render('/panel/inmobiliaria/piloto')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('el CONTADOR en Soportes no ve cards: sólo le queda una sección visible de Postulaciones', () => {
    permisos.isAdmin = false
    permisos.agencyRole = 'CONTADOR'
    permisos.modulos = ['documentos', 'contratos', 'cobros']
    render('/panel/inmobiliaria/postulaciones/soportes')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('el AGENTE comercial sí ve las secciones de Postulaciones, sin las que no puede abrir', () => {
    permisos.isAdmin = false
    permisos.agencyRole = 'AGENTE'
    permisos.modulos = ['matching', 'estudio']
    render('/panel/inmobiliaria/postulaciones/estudio')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['postulaciones', 'matching', 'estudio'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['estudio'])
  })
})
