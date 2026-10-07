/**
 * Lo que Nico pidió el 02-10-2026 sobre la barra lateral:
 *
 *  1. ⌘B (macOS) / Ctrl+B (el resto) pliega y despliega la barra. No actúa
 *     mientras se escribe en un campo ni con un modal abierto, y en el
 *     celular (el cajón) no aplica. El tooltip del botón muestra la tecla.
 *  2. Al abrir el cajón del celular, el campo «Buscar» salía con el anillo
 *     azul de foco: ahora el foco cae en el logo, sigue atrapado y vuelve al
 *     botón que abrió el cajón al cerrarlo.
 *
 * La barra REAL con su `SidebarProvider` real y el cajón real (Radix): lo que
 * se prueba es el cableado. Las reglas sueltas, en `atajo-de-la-barra.test.ts`.
 * Convención del repo: createRoot + act + happy-dom (sin RTL).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inmobiliaria/contratos',
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1' }, logout: vi.fn() }),
}))

import { SidebarProvider } from '@/lib/context/SidebarContext'
import { PlanSidebar, openPlanMobileSidebar, type NavItem } from './PlanSidebar'
import { ChatsCircle, FilePlus, SquaresFour } from '@phosphor-icons/react'

const P = '/panel/inmobiliaria'
const NAV: NavItem[] = [
  { label: 'Chat', href: P, icon: ChatsCircle, exact: true },
  { kind: 'section', label: 'Operación', href: '#sec-operacion', icon: SquaresFour },
  { label: 'Contratos', href: `${P}/contratos`, icon: FilePlus },
]

let container: HTMLDivElement
let root: Root
/** ¿La pantalla es de escritorio (`lg`)? Lo contesta el `matchMedia` falso. */
let escritorio = true
const matchMediaOriginal = window.matchMedia

function usarPlataforma(platform: string) {
  Object.defineProperty(window.navigator, 'platform', { value: platform, configurable: true })
  Object.defineProperty(window.navigator, 'userAgentData', { value: undefined, configurable: true })
}

beforeEach(() => {
  escritorio = true
  usarPlataforma('MacIntel')
  window.matchMedia = ((media: string) => ({
    matches: escritorio,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  document.body.innerHTML = ''
  window.matchMedia = matchMediaOriginal
  delete (window.navigator as unknown as Record<string, unknown>).platform
  delete (window.navigator as unknown as Record<string, unknown>).userAgentData
})

async function pintar(props: Partial<React.ComponentProps<typeof PlanSidebar>> = {}) {
  await act(async () => {
    root.render(
      <SidebarProvider>
        <PlanSidebar navItems={NAV} logo={{ title: 'Leasefy', href: P }} {...props} />
      </SidebarProvider>,
    )
  })
}

const boton = () => container.querySelector<HTMLButtonElement>('aside [data-testid="boton-de-la-barra"]')!
const plegada = () => boton().getAttribute('aria-expanded') === 'false'

async function teclear(objetivo: EventTarget, init: KeyboardEventInit) {
  const e = new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true, ...init })
  await act(async () => {
    objetivo.dispatchEvent(e)
  })
  return e
}

/** Deja correr los `setTimeout(0)` del FocusScope de Radix (el foco al cerrar). */
async function dejarCorrer() {
  await act(async () => {
    await new Promise((listo) => setTimeout(listo, 20))
  })
}

describe('el atajo ⌘B / Ctrl+B pliega y despliega la barra', () => {
  it('macOS: ⌘B pliega y vuelve a desplegar, y se queda con la tecla', async () => {
    await pintar()
    expect(plegada()).toBe(false)

    const e = await teclear(document.body, { metaKey: true })
    expect(plegada()).toBe(true)
    expect(boton().getAttribute('aria-label')).toBe('Mostrar la barra lateral')
    expect(e.defaultPrevented).toBe(true)

    await teclear(document.body, { metaKey: true })
    expect(plegada()).toBe(false)
  })

  it('macOS: Ctrl+B no hace nada', async () => {
    await pintar()
    const e = await teclear(document.body, { ctrlKey: true })
    expect(plegada()).toBe(false)
    expect(e.defaultPrevented).toBe(false)
  })

  it('Windows y Linux: Ctrl+B sí; ⌘/Windows+B no', async () => {
    usarPlataforma('Win32')
    await pintar()
    await teclear(document.body, { metaKey: true })
    expect(plegada()).toBe(false)
    await teclear(document.body, { ctrlKey: true })
    expect(plegada()).toBe(true)
  })

  it('con Mayúscula no (⌘⇧B es la barra de favoritos del navegador)', async () => {
    await pintar()
    const e = await teclear(document.body, { key: 'B', metaKey: true, shiftKey: true })
    expect(plegada()).toBe(false)
    expect(e.defaultPrevented).toBe(false)
  })

  it('dejarla apretada no la hace parpadear: la repetición no cuenta', async () => {
    await pintar()
    await teclear(document.body, { metaKey: true })
    const repetida = await teclear(document.body, { metaKey: true, repeat: true })
    expect(plegada()).toBe(true)
    expect(repetida.defaultPrevented).toBe(true)
  })

  it('si otro ya atendió la tecla (un editor con su negrita), no se mete', async () => {
    await pintar()
    const ajeno = (e: KeyboardEvent) => e.preventDefault()
    document.addEventListener('keydown', ajeno)
    await teclear(document.body, { metaKey: true })
    document.removeEventListener('keydown', ajeno)
    expect(plegada()).toBe(false)
  })
})

describe('el atajo NO actúa', () => {
  it.each([
    ['un input', '<input id="campo" />'],
    ['un textarea', '<textarea id="campo"></textarea>'],
    ['un select', '<select id="campo"><option>Bogotá</option></select>'],
    ['un contenteditable', '<div id="campo" contenteditable="true">texto</div>'],
  ])('mientras se escribe en %s', async (_, html) => {
    await pintar()
    const caja = document.createElement('div')
    caja.innerHTML = html
    document.body.appendChild(caja)
    const campo = document.getElementById('campo')!
    campo.focus()
    const e = await teclear(campo, { metaKey: true })
    expect(plegada()).toBe(false)
    expect(e.defaultPrevented).toBe(false)
  })

  it.each([
    ['un diálogo de Radix (⌘K, cajón, confirmación)', '<div role="dialog" data-state="open"></div>'],
    ['una confirmación', '<div role="alertdialog" data-state="open"></div>'],
    ['un modal hecho a mano (aria-modal)', '<section role="dialog" aria-modal="true"></section>'],
  ])('con %s abierto', async (_, html) => {
    await pintar()
    const caja = document.createElement('div')
    caja.innerHTML = html
    document.body.appendChild(caja)
    const e = await teclear(document.body, { metaKey: true })
    expect(plegada()).toBe(false)
    expect(e.defaultPrevented).toBe(false)
  })

  it('en el celular: ahí no hay barra, hay cajón', async () => {
    escritorio = false
    await pintar()
    const e = await teclear(document.body, { metaKey: true })
    expect(plegada()).toBe(false)
    expect(e.defaultPrevented).toBe(false)
  })
})

describe('el botón de plegar anuncia el atajo', () => {
  it('macOS: tooltip «Ocultar barra» + ⌘B en el Kbd del producto, y aria-keyshortcuts', async () => {
    await pintar()
    expect(boton().getAttribute('aria-keyshortcuts')).toBe('Meta+B')
    await act(async () => boton().focus())
    const tip = document.querySelector('[data-testid="tooltip-de-la-barra"]')!
    expect(tip.textContent).toContain('Ocultar barra')
    expect(tip.querySelector('kbd')?.textContent).toBe('⌘B')
  })

  it('Windows y Linux: «Ctrl B» y Control+B; plegada dice «Mostrar barra»', async () => {
    usarPlataforma('Win32')
    await pintar()
    expect(boton().getAttribute('aria-keyshortcuts')).toBe('Control+B')
    await teclear(document.body, { ctrlKey: true })
    await act(async () => boton().focus())
    const tip = document.querySelector('[data-testid="tooltip-de-la-barra"]')!
    expect(tip.textContent).toContain('Mostrar barra')
    expect(tip.querySelector('kbd')?.textContent).toBe('Ctrl B')
  })

  it('con el foco en el botón, ⌘B no lo tira al <body>: queda en el botón nuevo', async () => {
    await pintar()
    await act(async () => boton().focus())
    await teclear(boton(), { metaKey: true })
    expect(plegada()).toBe(true)
    expect(document.activeElement).toBe(boton())
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Mostrar la barra lateral')
  })

  it('con el foco en el contenido, ⌘B no se lo lleva', async () => {
    await pintar()
    const afuera = document.createElement('button')
    afuera.textContent = 'Guardar'
    document.body.appendChild(afuera)
    afuera.focus()
    await teclear(afuera, { metaKey: true })
    expect(plegada()).toBe(true)
    expect(document.activeElement).toBe(afuera)
  })
})

describe('el cajón del celular: el foco', () => {
  /** El botón de menú de PlanHeader: `onClick={openPlanMobileSidebar}`. */
  function botonDeMenu() {
    const b = document.createElement('button')
    b.textContent = 'Abrir menú de navegación'
    b.addEventListener('click', (e) => openPlanMobileSidebar(e))
    document.body.appendChild(b)
    return b
  }
  const dialogo = () => document.querySelector<HTMLElement>('[role="dialog"]')

  async function abrirElCajon() {
    escritorio = false
    await pintar({ onSearchClick: vi.fn(), searchPlaceholder: 'Buscar' })
    const menu = botonDeMenu()
    menu.focus()
    await act(async () => menu.click())
    await dejarCorrer()
    return menu
  }

  it('al abrir cae en el logo, no en el campo «Buscar»', async () => {
    await abrirElCajon()
    const d = dialogo()!
    expect(d).toBeTruthy()
    expect(d.querySelector('input[placeholder="Buscar"]')).toBeTruthy()
    expect(document.activeElement).toBe(d.querySelector('a[aria-label="Leasefy — inicio"]'))
    expect(document.activeElement?.tagName).not.toBe('INPUT')
  })

  it('el anillo del logo es de teclado (`focus-visible`), y el diálogo se llama «Menú de navegación»', async () => {
    await abrirElCajon()
    const logo = dialogo()!.querySelector('a[aria-label="Leasefy — inicio"]')!
    expect(logo.className).toContain('focus-visible:ring-2')
    expect(logo.className).not.toMatch(/(^|\s)focus:ring/)
    const titulo = document.getElementById(dialogo()!.getAttribute('aria-labelledby')!)
    expect(titulo?.textContent).toBe('Menú de navegación')
  })

  it('el foco sigue atrapado: Mayús+Tab desde el logo da la vuelta a la ✕ y Tab desde la ✕ vuelve al logo', async () => {
    await abrirElCajon()
    const d = dialogo()!
    const logo = d.querySelector<HTMLElement>('a[aria-label="Leasefy — inicio"]')!
    const cerrar = d.querySelector<HTMLElement>('[data-testid="dialog-close"]')!
    expect(cerrar).toBeTruthy()

    await teclear(logo, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(cerrar)
    await teclear(cerrar, { key: 'Tab' })
    expect(document.activeElement).toBe(logo)
  })

  it('al cerrar (Esc), el foco vuelve al botón que lo abrió', async () => {
    const menu = await abrirElCajon()
    await teclear(document.activeElement!, { key: 'Escape' })
    await dejarCorrer()
    expect(dialogo()).toBeNull()
    expect(document.activeElement).toBe(menu)
  })

  it('al cerrar con la ✕, también', async () => {
    const menu = await abrirElCajon()
    await act(async () => dialogo()!.querySelector<HTMLElement>('[data-testid="dialog-close"]')!.click())
    await dejarCorrer()
    expect(dialogo()).toBeNull()
    expect(document.activeElement).toBe(menu)
  })

  it('si al cerrar otro ya tomó el foco (el ⌘K que abre «Buscar»), no se lo quita', async () => {
    await abrirElCajon()
    const delBuscador = document.createElement('input')
    document.body.appendChild(delBuscador)
    await teclear(document.activeElement!, { key: 'Escape' })
    delBuscador.focus()
    await dejarCorrer()
    expect(document.activeElement).toBe(delBuscador)
  })

  it('con el cajón abierto, el atajo no hace nada (es un modal y no hay barra)', async () => {
    await abrirElCajon()
    const e = await teclear(document.activeElement!, { metaKey: true })
    expect(e.defaultPrevented).toBe(false)
    expect(dialogo()).toBeTruthy()
  })
})
