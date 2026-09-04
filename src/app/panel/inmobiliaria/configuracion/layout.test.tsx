/**
 * El marco de Configuración: una sola nav, con lo que cada rol puede abrir.
 *
 * Lo que se cuida acá es lo que se ve: que la nav ofrezca exactamente las
 * secciones permitidas (ni una de más, ni «Agentes IA», que quedó oculta), que
 * marque la que estás mirando, y que en la ficha de un miembro se aparte para
 * no encajonar una pantalla completa.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let pathname = '/panel/inmobiliaria/configuracion'
const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

let permisos: { isAdmin: boolean; canAccess: (module: string, action: string) => boolean; isLoading: boolean } = {
  isAdmin: true,
  canAccess: () => false,
  isLoading: false,
}
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisos,
}))

import ConfiguracionLayout from './layout'
import { SECCIONES_DE_CONFIGURACION } from './secciones'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  pathname = '/panel/inmobiliaria/configuracion'
  permisos = { isAdmin: true, canAccess: () => false, isLoading: false }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(
      <ConfiguracionLayout>
        <p data-testid="contenido">contenido</p>
      </ConfiguracionLayout>,
    )
  })
}

/** Los enlaces de la nav lateral (el selector de celular no dibuja <a>). */
function enlaces(): string[] {
  return [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href') ?? '')
}

describe('marco de Configuración', () => {
  it('el ADMIN tiene todas las secciones en la nav, cada una con su URL', async () => {
    await render()
    const href = enlaces()
    expect(href).toHaveLength(SECCIONES_DE_CONFIGURACION.length)
    expect(href).toContain('/panel/inmobiliaria/configuracion')
    expect(href).toContain('/panel/inmobiliaria/configuracion/equipo')
    expect(href).toContain('/panel/inmobiliaria/configuracion/medios-de-pago')
    expect(href).toContain('/panel/inmobiliaria/configuracion/ia')
  })

  it('«Agentes IA» no está en ninguna parte de la nav', async () => {
    await render()
    expect(enlaces().some((h) => h.endsWith('/agentes'))).toBe(false)
    expect(container.textContent).not.toContain('Agentes IA')
  })

  it('marca la sección que estás mirando, y sólo esa', async () => {
    pathname = '/panel/inmobiliaria/configuracion/permisos'
    await render()
    const marcados = [...container.querySelectorAll('nav a[aria-current="page"]')]
    expect(marcados).toHaveLength(1)
    expect(marcados[0]?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion/permisos')
  })

  it('en la raíz la marcada es Perfil (la raíz ES Perfil)', async () => {
    await render()
    const marcado = container.querySelector('nav a[aria-current="page"]')
    expect(marcado?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion')
  })

  it('quien sólo tiene el módulo `agentes` ve dos secciones, no once', async () => {
    permisos = { isAdmin: false, canAccess: (m: string) => m === 'agentes', isLoading: false }
    await render()
    expect(enlaces()).toEqual([
      '/panel/inmobiliaria/configuracion/equipo',
      '/panel/inmobiliaria/configuracion/ia',
    ])
  })

  it('en la ficha de un miembro el marco se aparta y deja la pantalla entera', async () => {
    pathname = '/panel/inmobiliaria/configuracion/equipo/abc-123'
    await render()
    expect(container.querySelector('nav')).toBeNull()
    expect(container.querySelector('[data-testid="contenido"]')).not.toBeNull()
  })

  it('siempre dibuja el contenido de la sección al lado de la nav', async () => {
    await render()
    expect(container.querySelector('[data-testid="contenido"]')).not.toBeNull()
  })
})
