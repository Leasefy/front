/**
 * Secciones plegables del sidebar (Nico, 2026-09-22: «no se distingue muy
 * bien entre la sección y las opciones; deberíamos volverlas secciones con
 * dropdown»), con la regla de entrada del 02-10-2026: al entrar, UNA sola
 * sección abierta —«Operación»— más la de la página actual; nada se guarda
 * entre visitas. Lo que se prueba es el COMPORTAMIENTO: abrir/cerrar, la
 * regla al montar, que lo decidido se respete mientras se navega, que un
 * almacenamiento roto no tumbe el menú, el resumen de contadores al plegar,
 * el teclado y el riel plegado.
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
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, logout: vi.fn() }),
}))
vi.mock('@/lib/context/SidebarContext', () => ({
  useSidebar: () => ({ isCollapsed: false, setIsCollapsed: vi.fn(), toggle: vi.fn() }),
}))

import { SidebarContent, type NavItem } from './PlanSidebar'
import { Buildings, FilePlus, Wrench, ChatsCircle, ChartLine, CurrencyDollar, SquaresFour, Robot, Users } from '@phosphor-icons/react'

const LLAVE_VIEJA = 'leasefy-sidebar-secciones:u-1'
const P = '/panel/inmobiliaria'
const NAV: NavItem[] = [
  { label: 'Chat', href: P, icon: ChatsCircle, exact: true },
  { kind: 'section', label: 'Agentes IA', href: '#sec-agentes', icon: SquaresFour },
  { label: 'Cobranza', href: `${P}/pagos/cobranza`, icon: Robot, ai: true },
  { kind: 'section', label: 'Operación', href: '#sec-operacion', icon: SquaresFour },
  { label: 'Contratos', href: `${P}/contratos`, icon: FilePlus, badge: 16 },
  { label: 'Mantenimientos', href: `${P}/mantenimientos`, icon: Wrench, badge: 2 },
  { kind: 'section', label: 'Dinero', href: '#sec-dinero', icon: SquaresFour },
  { label: 'Pagos', href: `${P}/pagos`, icon: CurrencyDollar },
  { label: 'Inmuebles', href: `${P}/inmuebles`, icon: Buildings },
  { kind: 'section', label: 'Directorio', href: '#sec-directorio', icon: SquaresFour },
  { label: 'Propietarios', href: `${P}/propietarios`, icon: Users },
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
/** Desmonta y vuelve a montar: es «entrar» de nuevo al panel. */
async function volverAEntrar(props: Partial<React.ComponentProps<typeof SidebarContent>> = {}) {
  await act(async () => root.unmount())
  root = createRoot(container)
  await pintar(props)
}
const cabecera = (nombre: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-controls]')).find((b) => b.textContent?.startsWith(nombre))!
const filasDe = (b: HTMLButtonElement) => document.getElementById(b.getAttribute('aria-controls')!)!
const clic = async (el: HTMLElement) => { await act(async () => { el.click() }) }
const abiertas = () =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-controls]'))
    .filter((b) => b.getAttribute('aria-expanded') === 'true')
    .map((b) => b.textContent?.replace(/\s*\(contiene la página actual\)/, '').replace(/\d+\s*pendientes/, '').trim())

describe('secciones plegables del sidebar', () => {
  it('cada sección es un botón nativo con aria-expanded/aria-controls', async () => {
    await pintar()
    for (const n of ['Agentes IA', 'Operación', 'Dinero', 'Directorio']) {
      const b = cabecera(n)
      expect(b.tagName).toBe('BUTTON')
      expect(b.getAttribute('type')).toBe('button')
      expect(filasDe(b)).toBeTruthy()
    }
  })

  it('al entrar, sólo «Operación» está abierta; las demás plegadas e inertes', async () => {
    await pintar()
    expect(abiertas()).toEqual(['Operación'])
    expect(filasDe(cabecera('Dinero')).getAttribute('inert')).toBe('')
    expect(filasDe(cabecera('Agentes IA')).getAttribute('inert')).toBe('')
    expect(filasDe(cabecera('Operación')).hasAttribute('inert')).toBe(false)
  })

  it('si la página actual vive en otra sección, ésa también se abre al entrar', async () => {
    rutaActual = `${P}/pagos`
    await pintar()
    expect(abiertas()).toEqual(['Operación', 'Dinero'])
  })

  it('abrir y cerrar funciona; cerrar vuelve la caja inerte (fuera del Tab)', async () => {
    await pintar()
    await clic(cabecera('Dinero'))
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
    expect(filasDe(cabecera('Dinero')).hasAttribute('inert')).toBe(false)
    await clic(cabecera('Dinero'))
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('false')
    expect(filasDe(cabecera('Dinero')).getAttribute('inert')).toBe('')
  })

  it('lo decidido NO se guarda: al volver a entrar manda otra vez la regla', async () => {
    await pintar()
    await clic(cabecera('Directorio'))
    await clic(cabecera('Operación'))
    expect(abiertas()).toEqual(['Directorio'])
    expect(localStorage.getItem(LLAVE_VIEJA)).toBeNull()
    rutaActual = `${P}/inmuebles` // otra página fuera de Operación
    await volverAEntrar()
    expect(abiertas()).toEqual(['Operación', 'Dinero'])
  })

  it('lo que se guardaba antes en el navegador ya no manda, y se borra', async () => {
    localStorage.setItem(LLAVE_VIEJA, JSON.stringify({ 'sec-operacion': false, 'sec-agentes': true }))
    await pintar()
    expect(abiertas()).toEqual(['Operación'])
    expect(localStorage.getItem(LLAVE_VIEJA)).toBeNull()
  })

  it('si la persona cierra la de la página actual, se respeta hasta la próxima navegación', async () => {
    await pintar()
    await clic(cabecera('Operación'))
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
    // Cerrada con la página actual adentro: la cabecera lo dice.
    expect(cabecera('Operación').textContent).toContain('contiene la página actual')
    rutaActual = `${P}/pagos`
    await pintar()
    expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
    // Y volver a una página de Operación la abre de nuevo.
    rutaActual = `${P}/mantenimientos`
    await pintar()
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('true')
  })

  it('plegada, la cabecera resume los contadores de adentro (16 + 2 = 18); abierta no', async () => {
    await pintar()
    expect(cabecera('Operación').querySelector('[data-testid="resumen-de-seccion"]')).toBeNull()
    await clic(cabecera('Operación'))
    const resumen = cabecera('Operación').querySelector('[data-testid="resumen-de-seccion"]')
    expect(resumen?.textContent).toContain('18')
    // Sin contadores, sin resumen: un cero afirmaría que no hay nada.
    expect(cabecera('Dinero').querySelector('[data-testid="resumen-de-seccion"]')).toBeNull()
  })

  it('con el almacenamiento roto (tira al nombrarlo y al borrar) el menú funciona igual', async () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('SecurityError') } })
    try {
      await pintar()
      expect(abiertas()).toEqual(['Operación'])
      await clic(cabecera('Dinero'))
      expect(cabecera('Dinero').getAttribute('aria-expanded')).toBe('true')
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
    }
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('bloqueado') })
    await volverAEntrar()
    await clic(cabecera('Operación'))
    expect(cabecera('Operación').getAttribute('aria-expanded')).toBe('false')
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

  it('un panel sin «Operación» (el del propietario) abre su primera sección', async () => {
    const LANDLORD: NavItem[] = [
      { label: 'Inicio', href: '/panel', icon: ChatsCircle, exact: true },
      { kind: 'section', label: 'Mi arriendo', href: '#sec-mi-arriendo', icon: SquaresFour },
      { label: 'Pagos', href: '/panel/pagos', icon: CurrencyDollar },
    ]
    rutaActual = '/panel'
    await pintar({ navItems: LANDLORD })
    expect(abiertas()).toEqual(['Mi arriendo'])
  })

  it('riel plegado: sin acordeones, cada sección es un grupo con nombre y todos sus íconos', async () => {
    await pintar({ isCollapsed: true })
    expect(container.querySelectorAll('button[aria-controls]').length).toBe(0)
    const grupos = Array.from(container.querySelectorAll('[role="group"]')).map((g) => g.getAttribute('aria-label'))
    expect(grupos).toEqual(['Agentes IA', 'Operación', 'Dinero', 'Directorio'])
    // Aunque «Dinero» arranque plegada, en el riel sus íconos están.
    expect(container.querySelector(`a[href="${P}/pagos"]`)).toBeTruthy()
  })
})
