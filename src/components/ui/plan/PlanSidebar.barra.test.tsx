/**
 * La barra lateral, lo que Nico pidió el 02-10-2026:
 *
 *  1. El botón de plegar ya no es la media luna con «<» pegada al borde: es un
 *     cuadrado de 12 px de radio con el ícono de panel lateral, en la cabecera
 *     junto al logo; plegada, debajo del símbolo, a la vista.
 *  2. El elemento activo del menú era una píldora índigo saturada + un tramo
 *     con halo sobre la guía. El 02-10 pasó a un tinte gris con un tramo gris;
 *     el 03-10 Nico: «eso se sigue viendo horrible y en light debería de verse
 *     con el azul como estaba, quiero que cuando esté seleccionada se vea algo
 *     hermoso». Ahora: la píldora AZUL del menú (`--menu-activa` +
 *     `--menu-activa-tinta`: en claro #edf1ff + #1A40FF; en oscuro un azul
 *     apagado), que se desliza (`layoutId`), sin tramo en la guía, sin halo.
 *  3. El logo de la barra, NEGRO como el de la landing (`text-fg`; Nico,
 *     03-10: «pon el logo de la sidebar en todas las plataformas negro»).
 *
 * Convención del repo: createRoot + act + happy-dom (sin RTL).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let rutaActual = '/panel/inmobiliaria/contratos'
vi.mock('next/navigation', () => ({
  usePathname: () => rutaActual,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, logout: vi.fn() }),
}))
vi.mock('@/lib/context/SidebarContext', () => ({
  useSidebar: () => ({ isCollapsed: false, setIsCollapsed: vi.fn(), toggle: vi.fn() }),
}))

import { SidebarContent, type NavItem } from './PlanSidebar'
import { ChatsCircle, FilePlus, Wrench, SquaresFour } from '@phosphor-icons/react'

const P = '/panel/inmobiliaria'
const NAV: NavItem[] = [
  { label: 'Chat', href: P, icon: ChatsCircle, exact: true },
  { kind: 'section', label: 'Operación', href: '#sec-operacion', icon: SquaresFour },
  { label: 'Contratos', href: `${P}/contratos`, icon: FilePlus },
  { label: 'Mantenimientos', href: `${P}/mantenimientos`, icon: Wrench },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  rutaActual = `${P}/contratos`
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function pintar(props: Partial<React.ComponentProps<typeof SidebarContent>> = {}) {
  await act(async () => {
    root.render(<SidebarContent navItems={NAV} isCollapsed={false} onCollapse={() => {}} {...props} />)
  })
}
const boton = () => container.querySelector<HTMLButtonElement>('[data-testid="boton-de-la-barra"]')

describe('el botón de plegar la barra', () => {
  it('abierta: vive en la cabecera junto al logo, cuadrado de 12 px con el ícono de panel lateral', async () => {
    await pintar()
    const b = boton()!
    expect(b).toBeTruthy()
    expect(b.getAttribute('type')).toBe('button')
    expect(b.getAttribute('aria-label')).toBe('Ocultar la barra lateral')
    expect(b.getAttribute('aria-expanded')).toBe('true')
    expect(b.className).toContain('rounded-[12px]')
    expect(b.className).toContain('border-border')
    expect(b.className).toContain('bg-surface')
    // Comparte fila con el logo (no flota en el borde de la barra).
    expect(b.parentElement?.querySelector('a[aria-label="Leasefy — inicio"]')).toBeTruthy()
    expect(b.className).not.toContain('-right-3')
    expect(b.querySelectorAll('svg').length).toBe(1)
  })

  it('al apretarlo llama a plegar', async () => {
    const onCollapse = vi.fn()
    await pintar({ onCollapse })
    await act(async () => boton()!.click())
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('plegada: sigue a la vista debajo del símbolo, y dice que la muestra', async () => {
    const onCollapse = vi.fn()
    await pintar({ isCollapsed: true, onCollapse })
    const b = boton()!
    expect(b.getAttribute('aria-label')).toBe('Mostrar la barra lateral')
    expect(b.getAttribute('aria-expanded')).toBe('false')
    await act(async () => b.click())
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('en el cajón del celular no aparece (ahí se cierra con la ✕ del cajón)', async () => {
    await pintar({ showCollapseButton: false })
    expect(boton()).toBeNull()
  })
})

describe('el elemento activo del menú, en el azul del menú', () => {
  it('la fila activa tiene la píldora azul detrás; ninguna otra', async () => {
    await pintar()
    const resaltes = container.querySelectorAll('[data-testid="resalte-de-la-fila-activa"]')
    expect(resaltes.length).toBe(1)
    const r = resaltes[0] as HTMLElement
    expect(r.className).toContain('bg-[color:var(--menu-activa)]')
    expect(r.className).toContain('rounded-[12px]')
    expect(r.className).not.toContain('bg-surface-selected')
    expect(r.className).not.toContain('shadow')
    expect(r.parentElement?.querySelector(`a[href="${P}/contratos"]`)).toBeTruthy()
  })

  it('texto e ícono en la tinta de la activa (relleno); sin halo, sin degradado y sin tramo en la guía', async () => {
    await pintar()
    const fila = container.querySelector<HTMLAnchorElement>(`a[href="${P}/contratos"]`)!
    expect(fila.hasAttribute('data-active')).toBe(true)
    expect(fila.className).toContain('data-[active]:bg-transparent')
    expect(fila.className).toContain('data-[active]:text-[color:var(--menu-activa-tinta)]')
    expect(fila.className).not.toContain('data-[active]:text-fg')
    expect(fila.className).not.toContain('shadow-[0_0_10px')
    expect(fila.className).not.toContain('from-primary')
    expect(fila.querySelector('svg')?.getAttribute('class') ?? '').toContain('!text-[color:var(--menu-activa-tinta)]')
    // Ni la raya que brillaba ni la gris: ningún tramo encima de la guía.
    const contenedor = fila.parentElement!
    const tramo = Array.from(contenedor.querySelectorAll<HTMLElement>('span[aria-hidden="true"]')).find(
      (s) => s.className.includes('w-[2px]') || s.className.includes('w-[3px]'),
    )
    expect(tramo).toBeUndefined()
  })

  it('la cabecera de una sección plegada con la página actual adentro va en la tinta de la activa', async () => {
    await pintar()
    // «Operación» contiene Contratos (la actual): se pliega y se mira la cabecera.
    const cabecera = container.querySelector<HTMLButtonElement>('[data-seccion] > button[aria-expanded]')!
    await act(async () => cabecera.click())
    expect(cabecera.getAttribute('aria-expanded')).toBe('false')
    const rotulo = cabecera.querySelector('span')!
    expect(rotulo.className).toContain('text-[color:var(--menu-activa-tinta)]')
  })

  it('al navegar, el resaltado pasa a la nueva fila', async () => {
    await pintar()
    rutaActual = `${P}/mantenimientos`
    await pintar()
    const r = container.querySelector('[data-testid="resalte-de-la-fila-activa"]')!
    expect(r.parentElement?.querySelector(`a[href="${P}/mantenimientos"]`)).toBeTruthy()
    expect(container.querySelectorAll('[data-testid="resalte-de-la-fila-activa"]').length).toBe(1)
  })

  it('en el riel plegado, la misma píldora azul detrás (no `bg-primary-soft`, saturado en oscuro)', async () => {
    await pintar({ isCollapsed: true })
    const fila = container.querySelector<HTMLAnchorElement>(`a[href="${P}/contratos"]`)!
    expect(fila.getAttribute('aria-current')).toBe('page')
    expect(fila.className).toContain('text-[color:var(--menu-activa-tinta)]')
    expect(fila.className).not.toContain('bg-primary-soft')
    const resaltes = container.querySelectorAll('[data-testid="resalte-de-la-fila-activa"]')
    expect(resaltes.length).toBe(1)
    expect((resaltes[0] as HTMLElement).className).toContain('bg-[color:var(--menu-activa)]')
    expect(resaltes[0]!.parentElement?.contains(fila)).toBe(true)
  })

  it('en el riel, al navegar a OTRA sección la píldora pasa a esa fila (viaja por todo el riel)', async () => {
    await pintar({ isCollapsed: true })
    rutaActual = P
    await pintar({ isCollapsed: true })
    const resaltes = container.querySelectorAll('[data-testid="resalte-de-la-fila-activa"]')
    expect(resaltes.length).toBe(1)
    expect(resaltes[0]!.parentElement?.querySelector(`a[href="${P}"]`)).toBeTruthy()
  })
})

describe('el logo de la barra, negro como el de la landing', () => {
  it('abierta: el logotipo en la tinta del tema (`text-fg`), no en el azul', async () => {
    await pintar()
    const logo = container.querySelector<HTMLAnchorElement>('a[aria-label="Leasefy — inicio"]')!
    expect(logo.className).toContain('text-fg')
    expect(logo.className).not.toContain('text-primary')
  })

  it('plegada: el símbolo también', async () => {
    await pintar({ isCollapsed: true })
    const simbolo = container.querySelector('svg[viewBox]')!.parentElement!
    expect(simbolo.className).toContain('text-fg')
    expect(simbolo.className).not.toContain('text-primary')
  })
})

describe('el movimiento al plegar (framer-motion)', () => {
  it('el HTML del servidor no esconde nada: el fundido es sólo para lo que aparece DESPUÉS', () => {
    const html = renderToString(<SidebarContent navItems={NAV} isCollapsed={false} onCollapse={() => {}} />)
    expect(html).toContain('Leasefy — inicio')
    expect(html).not.toMatch(/opacity:\s*0[;"]/)
  })

  it('al plegar, la cabecera y el riel nuevos se pintan (con su botón para volver)', async () => {
    await pintar()
    await pintar({ isCollapsed: true })
    expect(boton()?.getAttribute('aria-label')).toBe('Mostrar la barra lateral')
    expect(container.querySelector(`a[href="${P}/contratos"]`)?.getAttribute('aria-current')).toBe('page')
  })
})
