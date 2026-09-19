/**
 * SeccionesDelModulo — las secciones del módulo se quedan quietas.
 *
 * El defecto que fija este archivo (Nico, 2026-09-03): en `/inmuebles` se veían
 * dos pestañas, «Inmuebles · Avalúos»; al entrar en Avalúos desaparecían y en
 * su mismo sitio aparecían OTRAS pestañas, las del agente (Resumen · Mis
 * solicitudes · Configuración). Dos niveles distintos con la misma cara,
 * turnándose el lugar. La regla: las secciones son cards que no se van
 * mientras estés en cualquiera de ellas, y la profundidad de cada sección va
 * DEBAJO, con otra cara.
 *
 * Desde el 2026-09-16 ningún agente es una sección (Nico: «una sección sólo de
 * agentes»): Avalúos, Matching, Asegurabilidad, Cobranza, Conciliación y
 * Desempeño IA son filas de «Agentes IA» con su URL de siempre. Los casos que
 * usaban Avalúos ahora usan Reportes, que conserva tres secciones; y hay un
 * bloque que cuida que dentro de una sala no aparezca el riel del módulo que
 * antes la hospedaba.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ruta = { actual: '/panel/inmobiliaria/reportes' }

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
    render('/panel/inmobiliaria/reportes')
    expect(cards()).toEqual([
      { href: '/panel/inmobiliaria/reportes', label: 'reportes', activa: true, actual: true },
      { href: '/panel/inmobiliaria/reportes/resumen', label: 'resumenDelNegocio', activa: false, actual: false },
      { href: '/panel/inmobiliaria/reportes/rentabilidad', label: 'rentabilidad', activa: false, actual: false },
    ])
  })

  it('DENTRO de una sección las mismas cards siguen ahí y la sección queda marcada', () => {
    render('/panel/inmobiliaria/reportes/rentabilidad')
    const [reportes, , rentabilidad] = cards()
    expect(reportes).toMatchObject({ activa: false, actual: false })
    expect(rentabilidad).toMatchObject({ href: '/panel/inmobiliaria/reportes/rentabilidad', activa: true, actual: true })
  })

  it('más adentro de la sección las cards siguen, marcada pero sin aria-current', () => {
    render('/panel/inmobiliaria/contratos/renovaciones/7')
    const renovaciones = cards().find((c) => c.href.endsWith('/renovaciones'))
    expect(renovaciones).toMatchObject({ activa: true, actual: false })
    // Eran dos (la raíz y Renovaciones) hasta que entró «Firmas» el 18-09-2026
    // (A-13: la invitación a firmar vence a los 7 días). Lo que este test
    // sostiene es que bajar un piso no se lleva las cards, no cuántas hay.
    expect(cards().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/contratos',
      '/panel/inmobiliaria/contratos/renovaciones',
      '/panel/inmobiliaria/contratos/firmas',
      // Y «Cláusulas propias» el 18-09-2026. Este test sostiene que bajar un
      // piso no se lleva el riel, no cuántas cards hay.
      '/panel/inmobiliaria/contratos/clausulas',
    ])
  })

  it('🔴 en la cara propietarios la raíz de Pagos NO aparece: es la deuda de los INQUILINOS', () => {
    // Hasta el 2026-09-16 la raíz no tenía cara y se dibujaba como primera card
    // en las dos. Elegir «Pagar a propietarios» y encontrarse la deuda de los
    // inquilinos es el mismo defecto que Nico señaló arriba, un piso más abajo.
    render('/panel/inmobiliaria/pagos/liquidaciones')
    const lista = cards()
    // `tableroFinanciero` va primero en las TRES caras: es la única pantalla
    // del módulo que mira todas, y el riel le pone una línea detrás.
    expect(lista.map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'liquidaciones',
      'dispersiones',
    ])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['liquidaciones'])
  })

  it('la lista de cobros emitidos deja marcada a Cartera: es una lectura suya, no un módulo', () => {
    render('/panel/inmobiliaria/pagos/cartera/cobros')
    expect(cards().filter((c) => c.activa).map((c) => c.label)).toEqual(['cartera'])
  })

  it('se dibuja como SECCIONES (cards en un riel), nunca como las pestañas de un agente', () => {
    render('/panel/inmobiliaria/reportes/resumen')
    const franja = contenedor.querySelector('[data-nivel]')
    expect(franja?.getAttribute('data-nivel')).toBe('secciones')
    // El riel: un contenedor único con las cards adentro.
    const nav = contenedor.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Secciones de reportes')
    expect(nav?.children).toHaveLength(1)
    expect(nav?.children[0].querySelectorAll('a')).toHaveLength(3)
  })

  it('no sale en la impresión', () => {
    render('/panel/inmobiliaria/reportes')
    expect(contenedor.querySelector('[data-nivel]')?.className).toContain('print:hidden')
  })
})

describe('SeccionesDelModulo — cuándo NO se dibuja', () => {
  it('en una ficha del listado (la raíz es exacta): la ficha trae su propia cabecera', () => {
    render('/panel/inmobiliaria/contratos/123')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('en un módulo de una sola sección (Conciliación), aunque sea un agente', () => {
    render('/panel/inmobiliaria/conciliacion/cola')
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('en Inmuebles: sin Avalúos le queda una sola sección y el riel no se dibuja', () => {
    render('/panel/inmobiliaria/inmuebles')
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
    // Tiene permiso de `estudio` y de `matching`, pero ninguna de las dos es
    // una card de acá: Evaluación de candidatos está oculta (Nico, 2026-09-08)
    // y Matching vive en «Agentes IA» (2026-09-16).
    // `portafolio`: Postulaciones lo pide (S3) y el AGENTE lo tiene por defecto.
    permisos.modulos = ['portafolio', 'documentos', 'matching', 'estudio']
    render('/panel/inmobiliaria/postulaciones/soportes')
    const lista = cards()
    expect(lista.map((c) => c.label)).toEqual(['postulaciones', 'soportesCorto'])
    expect(lista.filter((c) => c.activa).map((c) => c.label)).toEqual(['soportesCorto'])
  })
})

describe('🔴 SeccionesDelModulo — dentro de una sala de «Agentes IA» no aparece el riel de su anfitrión viejo', () => {
  /**
   * Las salas conservan su URL (`/pagos/cobranza`, `/postulaciones/matching`,
   * `/inmuebles/avaluos`, `/reportes/ia`), así que su ruta sigue colgando de un
   * módulo con secciones. Si el riel de ese módulo apareciera, la sala se
   * vería dentro de Pagos, de Postulaciones, de Inmuebles o de Reportes — que
   * es justo lo que la sección de Agentes vino a terminar.
   */
  it.each([
    '/panel/inmobiliaria/pagos/cobranza',
    '/panel/inmobiliaria/pagos/cobranza/deudores/abc-123',
    '/panel/inmobiliaria/pagos/agente',
    '/panel/inmobiliaria/postulaciones/matching/cola',
    '/panel/inmobiliaria/postulaciones/asegurabilidad',
    '/panel/inmobiliaria/inmuebles/avaluos/cola',
    '/panel/inmobiliaria/reportes/ia',
  ])('%s: sin riel', (pathname) => {
    render(pathname)
    expect(contenedor.querySelector('nav')).toBeNull()
    expect(contenedor.querySelector('[data-testid="selector-de-caras"]')).toBeNull()
  })

  it('y en Pagos, Cobranza ya no es una card de la cara de los inquilinos', () => {
    render('/panel/inmobiliaria/pagos/cartera')
    expect(cards().map((c) => c.label)).not.toContain('cobranza')
  })
})


describe('SeccionesDelModulo — las caras de la plata (Nico, 16 y 18-09-2026)', () => {
  /**
   * El defecto que este bloque fija: las dos caras eran dos rótulos en
   * versalitas metidos ENTRE las cards del mismo riel, y Nico no los entendía
   * («eso de arriba de inquilinos y propietarios no se entiende, esa
   * separación de las tabs de arriba»). Ahora son un selector explícito
   * ARRIBA, y debajo van sólo las secciones de la cara elegida.
   */

  /**
   * Las caras del selector: clave, texto y si está elegida.
   *
   * 🔴 Hay que ABRIR el menú: desde el 18-09 la cara no es una fila de
   * píldoras siempre a la vista sino un selector con su caret, porque dos
   * filas de cosas horizontales y clicables una encima de la otra se leían
   * como dos juegos de pestañas del mismo nivel («esta navegación no se
   * entiende un culo»). Lo que el bloque protege no cambió: son ENLACES, uno
   * por cara, cada uno con su matiz y su destino.
   */
  function abrirCaras() {
    const boton = contenedor.querySelector('[data-testid="abrir-caras"]')
    act(() => {
      boton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  function caras(): Array<{ clave: string; texto: string; activa: boolean; href: string }> {
    abrirCaras()
    const selector = contenedor.querySelector('[data-testid="selector-de-caras"]')
    return [...(selector?.querySelectorAll('a') ?? [])].map((a) => ({
      clave: a.getAttribute('data-cara') ?? '',
      texto: (a.textContent ?? '').trim(),
      activa: a.getAttribute('data-activa') === 'true',
      href: a.getAttribute('href') ?? '',
    }))
  }

  it('la cara es un SELECTOR aparte, no una pestaña más del riel', () => {
    render('/panel/inmobiliaria/pagos')
    expect(caras().map((c) => c.clave)).toEqual(['inquilinos', 'propietarios', 'tesoreria'])
    // 🔴 Y vive FUERA del `nav` de las secciones, con otra forma (un botón con
    // menú, no un enlace en un riel hundido): es lo que impide que las dos
    // capas se lean como el mismo nivel.
    expect(contenedor.querySelector('nav [data-testid="selector-de-caras"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid="abrir-caras"]')?.tagName).toBe('BUTTON')
    expect(
      contenedor.querySelector('[data-testid="abrir-caras"]')?.getAttribute('aria-haspopup'),
    ).toBe('menu')
    expect(contenedor.querySelectorAll('nav [role="group"]')).toHaveLength(0)
  })

  it('🔴 con el menú cerrado, el botón dice en qué cara estás', () => {
    // Sin esto el selector sería un botón mudo: la cara tiene que leerse sin
    // abrir nada, que es justo lo que no se entendía.
    render('/panel/inmobiliaria/pagos/dispersiones')
    const boton = contenedor.querySelector('[data-testid="abrir-caras"]')!
    expect(boton.getAttribute('data-cara-elegida')).toBe('propietarios')
    expect(boton.textContent).toContain('caraPropietarios')
    expect(boton.textContent).toContain('caraPropietariosDetalle')
    // Y cerrado no hay ningún enlace de cara suelto por ahí.
    expect(contenedor.querySelectorAll('[data-cara]')).toHaveLength(0)
  })

  it('cada cara dice de un vistazo lo que entra y lo que sale', () => {
    render('/panel/inmobiliaria/pagos')
    const [inquilinos, propietarios, tesoreria] = caras()
    expect(inquilinos?.texto).toContain('caraInquilinos')
    expect(inquilinos?.texto).toContain('caraInquilinosDetalle')
    expect(propietarios?.texto).toContain('caraPropietarios')
    expect(propietarios?.texto).toContain('caraPropietariosDetalle')
    expect(tesoreria?.texto).toContain('caraTesoreria')
    expect(tesoreria?.texto).toContain('caraTesoreriaDetalle')
  })

  it('cada cara es un ENLACE a su primera sección: la cara viaja en la URL', () => {
    render('/panel/inmobiliaria/pagos')
    // Inquilinos entra por la RAÍZ del módulo —la deuda del mes— porque desde
    // el 2026-09-16 la raíz es de esa cara.
    expect(caras().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/pagos',
      '/panel/inmobiliaria/pagos/liquidaciones',
      '/panel/inmobiliaria/pagos/cuadre',
    ])
  })

  it('en la Sala entra Inquilinos, que es donde se opera todos los días', () => {
    render('/panel/inmobiliaria/pagos')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['inquilinos'])
    expect(cards().map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'pagos',
      'recaudo',
      'recaudoBancario',
      'cartera',
    ])
  })

  it('🔴 la cara se deduce de la RUTA: en Dispersiones estás en Propietarios', () => {
    render('/panel/inmobiliaria/pagos/dispersiones')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['propietarios'])
    expect(cards().map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'liquidaciones',
      'dispersiones',
    ])
    expect(cards().filter((c) => c.activa).map((c) => c.label)).toEqual(['dispersiones'])
  })

  it('y también en una ficha que cuelga de una sección de esa cara', () => {
    render('/panel/inmobiliaria/pagos/dispersiones/lotes/2')
    expect(caras().filter((c) => c.activa).map((c) => c.clave)).toEqual(['propietarios'])
  })

  it('🔴 TODA card del riel es de la cara elegida, salvo la que mira TODAS', () => {
    // Es la regla que Nico pedía: «que las tabs de abajo estén atadas a lo
    // seleccionado arriba». La última excepción era la raíz de Pagos, que
    // mostraba la deuda de los inquilinos dentro de «Propietarios».
    //
    // 🔴 Queda UNA excepción y es legítima: el tablero financiero mira lo que
    // entra, lo que sale y lo que está en la cuenta. Por eso va PRIMERO en las
    // tres y con una línea que lo separa — mezclado, se leería como una
    // sección más de este lado de la plata.
    render('/panel/inmobiliaria/pagos/dispersiones')
    expect(cards().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/pagos/tablero',
      '/panel/inmobiliaria/pagos/liquidaciones',
      '/panel/inmobiliaria/pagos/dispersiones',
    ])
    render('/panel/inmobiliaria/pagos/cartera')
    expect(cards().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/pagos/tablero',
      '/panel/inmobiliaria/pagos',
      '/panel/inmobiliaria/pagos/recaudo',
      '/panel/inmobiliaria/pagos/recaudo-bancario',
      '/panel/inmobiliaria/pagos/cartera',
    ])
    render('/panel/inmobiliaria/pagos/cuadre')
    expect(cards().map((c) => c.href)).toEqual([
      '/panel/inmobiliaria/pagos/tablero',
      '/panel/inmobiliaria/pagos/cuadre',
      '/panel/inmobiliaria/pagos/traslados',
      '/panel/inmobiliaria/pagos/pendientes',
    ])
  })

  /*
   * 🔴 Las cinco pantallas que NO estaban en la navegación (Nico, 18-09 de
   * noche): vivían como enlaces azules apretados a la derecha del título de
   * `/pagos` —«¿eso es como tabs? porque está a nivel de UX muy mal
   * logrado»—. Parecían pestañas sin serlo, y eran pantallas de pleno derecho
   * escondidas en una esquina del encabezado. Este test es el que impide que
   * vuelvan a quedarse afuera.
   */
  it('🔴 las pantallas de tesorería y el tablero SON navegación, no enlaces del título', () => {
    const enElRiel = (ruta: string) => {
      render(ruta)
      return cards().some((c) => c.href === ruta && c.activa)
    }
    for (const ruta of [
      '/panel/inmobiliaria/pagos/tablero',
      '/panel/inmobiliaria/pagos/cuadre',
      '/panel/inmobiliaria/pagos/traslados',
      '/panel/inmobiliaria/pagos/pendientes',
      '/panel/inmobiliaria/pagos/recaudo-bancario',
    ]) {
      expect(enElRiel(ruta), ruta).toBe(true)
    }
  })

  it('🔴 la línea separa lo que mira TODAS las caras de lo que es de ESTA', () => {
    render('/panel/inmobiliaria/pagos')
    const cajas = [...contenedor.querySelectorAll('nav a')]
    // Sólo la primera card —el tablero— no pertenece a la cara elegida.
    expect(cajas[0]?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/tablero')
    // Y hay exactamente UN separador, justo detrás de ella.
    expect(contenedor.querySelectorAll('nav span[aria-hidden="true"].w-px')).toHaveLength(1)
  })

  it('el riel dice de qué CARA son sus cards, para quien no ve el selector', () => {
    render('/panel/inmobiliaria/pagos/dispersiones')
    expect(contenedor.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'pagos · caraPropietarios',
    )
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
    expect(cards().map((c) => c.label)).toEqual(['recaudo', 'recaudoBancario', 'cartera'])
    expect(contenedor.querySelector('[data-testid="selector-de-caras"]')).toBeNull()
    // Y tampoco ve el tablero financiero, que pide `dashboard`: la cara nueva
    // no le regala pantallas a nadie.
    expect(cards().map((c) => c.href)).not.toContain('/panel/inmobiliaria/pagos/tablero')
  })

  it('🔴 el contador ve las tres caras, y cada una con sus secciones', () => {
    permisos.isAdmin = false
    permisos.agencyRole = 'CONTADOR'
    permisos.modulos = null
    render('/panel/inmobiliaria/pagos')
    expect(caras()).toHaveLength(3)
    expect(cards().map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'pagos',
      'recaudo',
      'recaudoBancario',
      'cartera',
    ])
    render('/panel/inmobiliaria/pagos/liquidaciones')
    expect(cards().map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'liquidaciones',
      'dispersiones',
    ])
    render('/panel/inmobiliaria/pagos/traslados')
    expect(cards().map((c) => c.label)).toEqual([
      'tableroFinanciero',
      'cuadre',
      'trasladoComision',
      'pendientesDeAplicar',
    ])
  })

  it('un módulo sin caras (Reportes) no dibuja selector alguno', () => {
    render('/panel/inmobiliaria/reportes')
    expect(contenedor.querySelector('[data-testid="selector-de-caras"]')).toBeNull()
    expect(cards()).toHaveLength(3)
  })
})
