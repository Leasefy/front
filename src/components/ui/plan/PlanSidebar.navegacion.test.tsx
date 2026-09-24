/**
 * La fila del menú navega sin `<Link legacyBehavior>` (QA 23-09: Next 15 lo
 * depreca y lo avisaba en la consola). Lo que tiene que seguir igual: el
 * `href` real en el ancla, el clic simple navega en el cliente (sin
 * recargar), ⌘/Ctrl-clic abre otra pestaña, y la marca del recorrido guiado.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { push, prefetch } = vi.hoisted(() => ({ push: vi.fn(), prefetch: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inmobiliaria/contratos',
  useRouter: () => ({ push, prefetch, back: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, logout: vi.fn() }),
}))
vi.mock('@/lib/context/SidebarContext', () => ({
  useSidebar: () => ({ isCollapsed: false, setIsCollapsed: vi.fn(), toggle: vi.fn() }),
}))

import { SidebarContent, type NavItem } from './PlanSidebar'
import { ChatsCircle, FilePlus } from '@phosphor-icons/react'

const P = '/panel/inmobiliaria'
const NAV: NavItem[] = [
  { label: 'Chat', href: P, icon: ChatsCircle, exact: true, dataTourTarget: 'sidebar-chat' },
  { label: 'Contratos', href: `${P}/contratos`, icon: FilePlus },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  push.mockClear()
  prefetch.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function pintar(onItemClick = vi.fn()) {
  await act(async () => {
    root.render(
      <SidebarContent navItems={NAV} isCollapsed={false} onCollapse={() => {}} showCollapseButton={false} onItemClick={onItemClick} />,
    )
  })
  return onItemClick
}
const fila = (texto: string) =>
  Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((a) => a.textContent?.includes(texto))!

describe('la fila del menú navega sin legacyBehavior', () => {
  it('el código ya no usa `legacyBehavior`', () => {
    const fuente = readFileSync(join(process.cwd(), 'src/components/ui/plan/PlanSidebar.tsx'), 'utf8')
    expect(fuente).not.toMatch(/<Link[^>]*legacyBehavior/)
  })

  it('el ancla lleva el href real y el clic simple navega en el cliente', async () => {
    const alClic = await pintar()
    const a = fila('Contratos')
    expect(a.getAttribute('href')).toBe(`${P}/contratos`)
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    await act(async () => {
      a.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(push).toHaveBeenCalledWith(`${P}/contratos`)
    expect(alClic).toHaveBeenCalled()
  })

  it('⌘/Ctrl-clic no se intercepta: abre otra pestaña como cualquier enlace', async () => {
    await pintar()
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true })
    await act(async () => {
      fila('Contratos').dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('la marca del recorrido guiado sigue en su fila', async () => {
    await pintar()
    expect(container.querySelector('[data-tour-target="sidebar-chat"] a')?.getAttribute('href')).toBe(P)
  })
})
