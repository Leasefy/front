/**
 * WorkspaceNav — que la barra de pestañas quede enganchada cuando aparece.
 *
 * El defecto que fija este archivo: la barra desbordaba 143px y no había forma
 * de llegar a las últimas pestañas. Ni con la rueda ni con las flechas.
 *
 * La causa NO era Lenis (el `data-lenis-prevent` ya estaba) ni el handler de
 * rueda (también estaba, y bien escrito). Era CUÁNDO corría el efecto:
 *
 *   1. Primer render: los permisos del agente todavía no resolvieron, así que
 *      `canAccess` falla cerrado, quedan menos de 2 pestañas y el componente
 *      devuelve `null`. No hay <nav> en el DOM.
 *   2. El efecto corre igual, encuentra `scrollRef.current === null` y se va.
 *   3. Los permisos resuelven, la barra se monta… y el efecto NO vuelve a
 *      correr: sus dependencias no cambiaron.
 *
 * Resultado: listener de rueda nunca enganchado y `syncOverflow` nunca
 * ejecutado, así que las flechas se quedaban en opacidad 0. Compilaba, no
 * lanzaba nada, y la barra simplemente no respondía.
 *
 * La cura es el nodo en `useState` en vez de `useRef`: el efecto se vuelve a
 * ejecutar el día que el elemento existe de verdad.
 *
 * Es la misma trampa que ya nos costó el reproductor de audio de Llamadas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const RUTA = '/panel/inmobiliaria/cobros/cobranza'

vi.mock('next/navigation', () => ({
  usePathname: () => RUTA,
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

/** Los permisos arrancan sin resolver, como en producción. */
let permisosResueltos = false

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: () => permisosResueltos,
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
}))

import { WorkspaceNav } from './WorkspaceNav'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  permisosResueltos = false
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => root.unmount())
  contenedor.remove()
})

describe('WorkspaceNav — la barra aparece después que el efecto', () => {
  it('sin permisos resueltos no monta la barra', async () => {
    await act(async () => {
      root.render(<WorkspaceNav />)
    })
    expect(contenedor.querySelector('nav')).toBeNull()
  })

  it('cuando la barra aparece tarde, QUEDA enganchada a la rueda', async () => {
    // La regresión exacta: con `useRef` el efecto ya había corrido en vacío y
    // no volvía, así que este listener no existía nunca.
    const enganchados: string[] = []
    const original = HTMLElement.prototype.addEventListener
    const espia = vi
      .spyOn(HTMLElement.prototype, 'addEventListener')
      .mockImplementation(function (this: HTMLElement, tipo: string, ...resto: unknown[]) {
        if (this.tagName === 'NAV') enganchados.push(tipo)
        return original.call(this, tipo, ...(resto as [never, never]))
      })

    await act(async () => {
      root.render(<WorkspaceNav />)
    })
    expect(enganchados).toEqual([])

    // Resuelven los permisos y la barra entra al DOM.
    permisosResueltos = true
    await act(async () => {
      root.render(<WorkspaceNav />)
    })

    expect(contenedor.querySelector('nav')).not.toBeNull()
    expect(enganchados).toContain('wheel')
    expect(enganchados).toContain('scroll')

    espia.mockRestore()
  })

  it('la barra trae `data-lenis-prevent`: sin eso Lenis se come la rueda', async () => {
    permisosResueltos = true
    await act(async () => {
      root.render(<WorkspaceNav />)
    })
    const nav = contenedor.querySelector('nav')
    expect(nav?.hasAttribute('data-lenis-prevent')).toBe(true)
  })

  it('las dos flechas existen, para quien no usa rueda', async () => {
    permisosResueltos = true
    await act(async () => {
      root.render(<WorkspaceNav />)
    })
    const etiquetas = [...contenedor.querySelectorAll('button[aria-label]')].map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(etiquetas).toContain('Desplazar secciones a la izquierda')
    expect(etiquetas).toContain('Desplazar secciones a la derecha')
  })
})
