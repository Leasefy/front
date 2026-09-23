/**
 * Secciones plegables del sidebar (Nico, 2026-09-22: «no se distingue muy
 * bien entre la sección y las opciones; deberíamos volverlas secciones con
 * dropdown»). Lo que se prueba es el COMPORTAMIENTO que la captura pedía:
 * abrir/cerrar, la sección de la página actual abierta sola, lo recordado
 * por persona (y que un almacenamiento roto no tumbe el menú), el resumen de
 * contadores al plegar, el teclado y el riel plegado.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let rutaActual = '/panel/inmobiliaria/contratos'
vi.mock('next/navigation', () => ({
  usePathname: () => rutaActual,
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, logout: vi.fn() }),
}))
vi.mock('@/lib/context/SidebarContext', () => ({
  useSidebar: () => ({ isCollapsed: false, setIsCollapsed: vi.fn(), toggle: vi.fn() }),
}))

import { SidebarContent, type NavItem } from './PlanSidebar'
import { Buildings, FilePlus, Wrench, ChatsCircle, ChartLine, CurrencyDollar, SquaresFour } from '@phosphor-icons/react'

const LLAVE = 'leasefy-sidebar-secciones:u-1'
const P = '/panel/inmobiliaria'
const NAV: NavItem[] = [
  { label: 'Chat', href: P, icon: ChatsCircle, exact: true },
  { kind: 'section', label: 'Operación', href: '#sec-operacion', icon: SquaresFour },
  { label: 'Contratos', href: `${P}/contratos`, icon: FilePlus, badge: 16 },
  { label: 'Mantenimientos', href: `${P}/mantenimientos`, icon: Wrench, badge: 2 },
  { kind: 'section', label: 'Dinero', href: '#sec-dinero', icon: SquaresFour },
  { label: 'Pagos', href: `${P}/pagos`, icon: CurrencyDollar },
  { label: 'Inmuebles', href: `${P}/inmuebles`, icon: Buildings },
  { label: 'Reportes', href: `${P}/reportes`, icon: ChartLine, suelta: true },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  rutaActual = `${P}/contratos`
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function pintar(props: Partial<React.ComponentProps<typeof SidebarContent>> = {}) {
  await act(async () => {
    root.render(<SidebarContent navItems={NAV} isCollapsed={false} onCollapse={() => {}} showCollapseButton={false} {...props} />)
  })
}
const cabecera = (nombre: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-controls]')).find((b) => b.textContent?.startsWith(nombre))!
const filasDe = (b: HTMLButtonElement) => document.getElementById(b.getAttribute('aria-controls')!)!
const clic = async (el: HTMLElement) => { await act(async () => { el.click() }) }

describe('secciones plegables del sidebar', () => {
  it('cada sección es un botón con aria-expanded/aria-controls; abiertas por defecto', async () => {
    await pintar()
    for (const n of ['Operación', 'Dinero']) {
      const b = cabecera(n)
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('type')).toBe('button')
      expect(b.getAttribute('aria-expanded')).toBe('true')
      expect(filasDe(b)).toBeTruthy()
      expect(filasDe(b).hasAttribute('inert')).toBe(false)
    }
  })

  it('cerrar vuelve la caja inerte (fuera del Tab) y lo guarda por usuario', async () => {
    await pintar()
    await clic(cabecera('Dinero'))
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('false')
    expect(filasDe(cabecera('Dinero')).getAttribute('inert')).toBe('')
    expect(JSON.parse(localStorage.getItem(LLAVE)!)).toMatchObject({ 'sec-dinero': false })
    await clic(cabecera('Dinero'))
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
    expect(filasDe(cabecera('Dinero')).hasAttribute('inert')).toBe(false)
  })

  it('recuerda lo cerrado al volver a montar', async () => {
    localStorage.setItem(LLAVE, JSON.stringify({ 'sec-dinero': false }))
    await pintar()
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('false')
  })

  it('la sección de la página actual se abre sola aunque estuviera guardada cerrada', async () => {
    localStorage.setItem(LLAVE, JSON.stringify({ 'sec-operacion': false, 'sec-dinero': false }))
    await pintar()
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('true')
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('false')
    expect(JSON.parse(localStorage.getItem(LLAVE)!)).toMatchObject({ 'sec-operacion': true })
  })

  it('pero si la persona la cierra, se respeta hasta la próxima navegación', async () => {
    await pintar()
    await clic(cabecera('Operación'))
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
    // Cerrada con la página actual adentro: la cabecera lo dice.
    expect(cabecera('Operación').textContent).toContain('contiene la página actual')
    rutaActual = `${P}/pagos`
    await pintar()
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
  })

  it('plegada, la cabecera resume los contadores de adentro (16 + 2 = 18); abierta no', async () => {
    await pintar()
    expect(cabecera('Operación').querySelector('[data-testid="resumen-de-seccion"]')).toBeNull()
    await clic(cabecera('Operación'))
    const resumen = cabecera('Operación').querySelector('[data-testid="resumen-de-seccion"]')
    expect(resumen?.textContent).toContain('18')
    // Sin contadores, sin resumen: un cero afirmaría que no hay nada.
    await clic(cabecera('Dinero'))
    expect(cabecera('Dinero').querySelector('[data-testid="resumen-de-seccion"]')).toBeNull()
  })

  it('con el almacenamiento roto (tira al leer, al escribir y al nombrarlo) el menú funciona igual', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError') } })
    try {
      await pintar()
      expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
      await clic(cabecera('Dinero'))
      expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('false')
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('cuota') })
    await pintar()
    await clic(cabecera('Operación'))
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
  })

  it('un JSON basura guardado no rompe: todo en su valor por defecto', async () => {
    localStorage.setItem(LLAVE, '{no es json')
    await pintar()
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
  })

  it('teclado: la cabecera recibe foco y es un botón nativo (Enter/Espacio lo activan)', async () => {
    await pintar()
    const b = cabecera('Dinero')
    b.focus()
    expect(document.activeElement).toBe(b)
    expect(b.className).toContain('focus-visible:ring-2')
  })

  it('las filas sueltas no se meten en una sección: Chat arriba, Reportes abajo', async () => {
    await pintar()
    const reportes = container.querySelector(`a[href="${P}/reportes"]`)!
    expect(reportes.closest('[data-seccion]')).toBeNull()
    expect(container.querySelector(`a[href="${P}"]`)!.closest('[data-seccion]')).toBeNull()
    expect(container.querySelector(`a[href="${P}/inmuebles"]`)!.closest('[data-seccion]')?.getAttribute('data-seccion')).toBe('sec-dinero')
  })

  it('riel plegado: sin acordeones, cada sección es un grupo con nombre y todos sus íconos', async () => {
    localStorage.setItem(LLAVE, JSON.stringify({ 'sec-dinero': false }))
    await pintar({ isCollapsed: true })
    expect(container.querySelectorAll('button[aria-controls]').length).toBe(0)
    const grupos = Array.from(container.querySelectorAll('[role="group"]')).map((g) => g.getAttribute('aria-label'))
    expect(grupos).toEqual(['Operación', 'Dinero'])
    // Aunque «Dinero» esté guardada cerrada, en el riel sus íconos están.
    expect(container.querySelector(`a[href="${P}/pagos"]`)).toBeTruthy()
  })
})
