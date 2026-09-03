/**
 * T-0052: a nav item marked `disabled: true` must render as a genuinely
 * non-interactive row — no `<a href>` (reachable by keyboard/middle-click),
 * no focusable element, and the `tag` pill (e.g. "Próximamente") visible.
 *
 * This is the mechanism `panel/inmobiliaria/layout.tsx` relies on to disable
 * the "Asegurabilidad" nav entry (see `NAV_ITEMS_NO_DISPONIBLES` there) — the
 * layout itself can't be mounted in a unit test (behind `useI18n` /
 * `usePermissionsContext`, see `nav-sidebar.test.ts`), so this test exercises
 * the shared primitive directly with the same `disabled`/`tag` shape.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inmobiliaria',
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}))

vi.mock('@/lib/context/SidebarContext', () => ({
  useSidebar: () => ({ isCollapsed: false, setIsCollapsed: vi.fn(), toggle: vi.fn() }),
}))

import { PlanSidebar, type NavItem } from './PlanSidebar'
import { Buildings, Umbrella } from '@phosphor-icons/react'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

const NAV_ITEMS: NavItem[] = [
  { label: 'Inmuebles', href: '/panel/inmobiliaria/inmuebles', icon: Buildings },
  {
    label: 'Asegurabilidad',
    href: '/panel/inmobiliaria/ai/asegurabilidad',
    icon: Umbrella,
    disabled: true,
    tag: 'Próximamente',
  },
]

function render() {
  act(() => {
    root.render(<PlanSidebar navItems={NAV_ITEMS} logo={{ title: 'Leasefy', href: '/' }} />)
  })
}

describe('<PlanSidebar> — fila con disabled: true', () => {
  it('no renderiza un <a> para la fila deshabilitada (no navegable, no clic del medio)', () => {
    render()
    const enlaces = Array.from(container.querySelectorAll('a'))
    const enlaceAsegurabilidad = enlaces.find((a) =>
      a.getAttribute('href') === '/panel/inmobiliaria/ai/asegurabilidad',
    )
    expect(enlaceAsegurabilidad).toBeUndefined()
  })

  it('la fila deshabilitada no tiene ningún elemento enfocable/clickeable (fuera del tab order)', () => {
    render()
    // La fila habilitada ("Inmuebles") SÍ debe seguir siendo un link real —
    // esto no es una regresión global de interactividad, sólo de esta fila.
    const enlaceInmuebles = Array.from(container.querySelectorAll('a')).find((a) =>
      a.getAttribute('href') === '/panel/inmobiliaria/inmuebles',
    )
    expect(enlaceInmuebles).toBeTruthy()

    // La fila deshabilitada es el `<div>` con `cursor-not-allowed` que
    // NavItemComponent dibuja para `item.disabled` — identificador preciso,
    // no cualquier ancestro que contenga el texto (ese matchea de más, p.ej.
    // el `<aside>` entero, que también trae el link de marca "Leasefy — inicio").
    const filaDeshabilitada = Array.from(
      container.querySelectorAll('.cursor-not-allowed'),
    ).find((el) => el.textContent?.includes('Asegurabilidad'))
    expect(filaDeshabilitada).toBeTruthy()
    // Ni <a>, ni <button>, ni tabindex explícito en toda la subrama de la fila.
    expect(filaDeshabilitada!.querySelector('a')).toBeNull()
    expect(filaDeshabilitada!.querySelector('button')).toBeNull()
    expect(filaDeshabilitada!.querySelector('[tabindex]')).toBeNull()
    expect(filaDeshabilitada!.tagName).toBe('DIV')
  })

  it('muestra el tag "Próximamente" en la fila deshabilitada', () => {
    render()
    expect(container.textContent).toContain('Próximamente')
  })
})
