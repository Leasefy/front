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

  it('en la ficha de un caso de Cobranza se ven las secciones de SU cara, con Cobranza marcada', () => {
    // Cobranza es de la cara «inquilinos», así que abajo van la Sala y las
    // tres de esa cara. Liquidaciones y Dispersiones están a un clic, en la
    // otra cara del selector — no mezcladas en el mismo riel.
    render('/panel/inmobiliaria/pagos/cobranza/deudores/abc-123')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['pagos', 'recaudo', 'cartera', 'cobranza'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['cobranza'])
  })

  it('en Pagos, la sección hermana (Liquidaciones) marca su card y la Sala no', () => {
    render('/panel/inmobiliaria/pagos/liquidaciones')
    const lista = cards()
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['liquidaciones'])
    expect(lista.find((c) => c.label === 'pagos')?.activa).toBe(false)
  })

  it('la lista de cobros emitidos deja marcada a Cartera: es una lectura suya, no un módulo', () => {
    render('/panel/inmobiliaria/pagos/cartera/cobros')
    expect(cards().filter((c) => c.activa).map((c) => c.label)).toEqual(['cartera'])
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
    // Tiene permiso de `estudio`, pero Evaluación de candidatos está oculta
    // (Nico, 2026-09-08): con permiso y todo, la card no aparece.
    // `portafolio`: Postulaciones lo pide (S3) y el AGENTE lo tiene por defecto.
    permisos.modulos = ['portafolio', 'matching', 'estudio']
    render('/panel/inmobiliaria/postulaciones/matching')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['postulaciones', 'matching'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['matching'])
  })
})


describe('SeccionesDelModulo — las dos caras de la plata (Nico, 2026-09-16)', () => {
  /**
   * El defecto que este bloque fija: las dos caras eran dos rótulos en
   * versalitas metidos ENTRE las cards del mismo riel, y Nico no los entendía
   * («eso de arriba de inquilinos y propietarios no se entiende, esa
   * separación de las tabs de arriba»). Ahora son un selector explícito
   * ARRIBA, y debajo van sólo las secciones de la cara elegida.
   */

  /** Las caras del selector: clave, texto y si está elegida. */
  function caras(): Array<{ clave: string; texto: string; activa: boolean; href: string }> {
    const selector = contenedor.querySelector('[data-testid="selector-de-caras"]')
    return [...(selector?.querySelectorAll('a') ?? [])].map((a) => ({
      clave: a.getAttribute('data-cara') ?? '',
      texto: (a.textContent ?? '').trim(),
      activa: a.getAttribute('data-activa') === 'true',
      href: a.getAttribute('href') ?? '',
    }))
  }

  it('la cara es un SELECTOR aparte, no un rótulo entre las cards', () => {
    render('/panel/inmobiliaria/pagos')
    expect(caras().map((c) => c.clave)).toEqual(['inquilinos', 'propietarios'])
    // Y ya no queda ningún rótulo de cara dentro del riel de secciones.
    expect(contenedor.querySelectorAll('nav [role="group"]')).toHaveLength(0)
  })

  it('cada cara dice de un vistazo lo que entra y lo que sale', () => {
    render('/panel/inmobiliaria/pagos')
    const [inquilinos, propietarios] = caras()
    expect(inquilinos?.texto).toContain('caraInquilinos')
    expect(inquilinos?.texto).toContain('caraInquilinosDetalle')
    expect(propietarios?.texto).toContain('caraPropietarios')
    expect(propietarios?.texto).toContain('caraPropietariosDetalle')
  })

  it('cada cara es un ENLACE a su primera sección: la cara viaja en la URL', () => {
    render('/panel/inmobiliaria/pagos')
    expect(caras().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/pagos/recaudo',
      '/panel/inmobiliaria/pagos/liquidaciones',
    ])
  })

  it('en la Sala entra Inquilinos, que es donde se opera todos los días', () => {
    render('/panel/inmobiliaria/pagos')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['inquilinos'])
    expect(cards().map((c) => c.label)).toEqual(['pagos', 'recaudo', 'cartera', 'cobranza'])
  })

  it('🔴 la cara se deduce de la RUTA: en Dispersiones estás en Propietarios', () => {
    render('/panel/inmobiliaria/pagos/dispersiones')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['propietarios'])
    expect(cards().map((c) => c.label)).toEqual(['pagos', 'liquidaciones', 'dispersiones'])
    expect(cards().filter((c) => c.activa).map((c) => c.label)).toEqual(['dispersiones'])
  })

  it('y también en una ficha que cuelga de una sección de esa cara', () => {
    render('/panel/inmobiliaria/pagos/dispersiones/lotes/2')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['propietarios'])
  })

  it('la Sala no es de ninguna cara: va suelta y primera, en las dos', () => {
    render('/panel/inmobiliaria/pagos/dispersiones')
    expect(cards()[0]?.href).toBe('/panel/inmobiliaria/pagos')
  })

  it('🔴 quien sólo tiene `cobros` ve su cara y NO la de propietarios', () => {
    // El caso que hace peligrosa la unificación: nadie puede ganar acceso a la
    // dispersión por haber quedado en el mismo módulo que su cartera. Y con
    // una sola cara presente NO se dibuja el selector: no se anuncia una
    // separación que, para esta persona, no existe.
    permisos.isAdmin = false
    permisos.agencyRole = 'VIEWER'
    permisos.modulos = ['cobros']
    render('/panel/inmobiliaria/pagos/cartera')
    expect(cards().map((c) => c.label)).toEqual(['recaudo', 'cartera'])
    expect(contenedor.querySelector('[data-testid="selector-de-caras"]')).toBeNull()
  })

  it('🔴 el contador ve las dos caras, y cada una con sus secciones', () => {
    permisos.isAdmin = false
    permisos.agencyRole = 'CONTADOR'
    permisos.modulos = null
    render('/panel/inmobiliaria/pagos')
    expect(caras()).toHaveLength(2)
    expect(cards()).toHaveLength(4)
    render('/panel/inmobiliaria/pagos/liquidaciones')
    expect(cards().map((c) => c.label)).toEqual(['pagos', 'liquidaciones', 'dispersiones'])
  })

  it('un módulo sin caras (Inmuebles) no dibuja selector alguno', () => {
    render('/panel/inmobiliaria/inmuebles')
    expect(contenedor.querySelector('[data-testid="selector-de-caras"]')).toBeNull()
    expect(cards()).toHaveLength(2)
  })
})
