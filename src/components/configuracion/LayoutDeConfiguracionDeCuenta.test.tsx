/**
 * La configuración del inquilino y la del propietario usan el marco de la
 * inmobiliaria (Nico, 2026-09-15): nav agrupada con una URL por sección, la
 * activa marcada y su título al lado.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let pathname = '/inquilino/configuracion'
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import ConfiguracionDelInquilinoLayout from '@/app/inquilino/configuracion/layout'
import ConfiguracionDelPropietarioLayout from '@/app/panel/(landlord)/configuracion/layout'

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
})

async function render(Layout: React.ComponentType<{ children: React.ReactNode }>) {
  await act(async () => {
    root.render(
      <Layout>
        <p data-testid="contenido">contenido</p>
      </Layout>,
    )
  })
}

const enlaces = () => [...container.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))
const marcado = () => [...container.querySelectorAll('nav a[aria-current="page"]')].map((a) => a.getAttribute('href'))

describe('Configuración del inquilino', () => {
  it('ofrece sus cinco secciones, cada una con su URL, agrupadas', async () => {
    await render(ConfiguracionDelInquilinoLayout)
    expect(enlaces()).toEqual([
      '/inquilino/configuracion',
      '/inquilino/configuracion/seguridad',
      '/inquilino/configuracion/preferencias',
      '/inquilino/configuracion/datos',
      '/inquilino/configuracion/eliminar-cuenta',
    ])
    expect(container.textContent).toContain('Tu cuenta')
    expect(container.textContent).toContain('Privacidad')
    expect(container.querySelector('[data-testid="contenido"]')).not.toBeNull()
  })

  it('en la raíz marca Notificaciones y pone su título al lado', async () => {
    await render(ConfiguracionDelInquilinoLayout)
    expect(marcado()).toEqual(['/inquilino/configuracion'])
    expect(container.querySelector('h2')?.textContent).toBe('Notificaciones')
  })

  it('marca la sección que estás mirando, y sólo esa', async () => {
    pathname = '/inquilino/configuracion/seguridad'
    await render(ConfiguracionDelInquilinoLayout)
    expect(marcado()).toEqual(['/inquilino/configuracion/seguridad'])
    pathname = '/inquilino/configuracion'
  })
})

describe('Configuración del propietario', () => {
  it('abre en «Tu plan» y trae equipo y cuentas de recaudo', async () => {
    pathname = '/panel/configuracion'
    await render(ConfiguracionDelPropietarioLayout)
    expect(enlaces()).toEqual([
      '/panel/configuracion',
      '/panel/configuracion/notificaciones',
      '/panel/configuracion/seguridad',
      '/panel/configuracion/preferencias',
      '/panel/configuracion/equipo',
      '/panel/configuracion/cuentas-de-recaudo',
      '/panel/configuracion/datos',
      '/panel/configuracion/eliminar-cuenta',
    ])
    expect(marcado()).toEqual(['/panel/configuracion'])
    expect(container.querySelector('h2')?.textContent).toBe('Tu plan')
    pathname = '/inquilino/configuracion'
  })
})
