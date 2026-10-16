/**
 * page.test.tsx — Home (`/`), F1 final integration (landing-react-port).
 * Structure/wiring only: `landing-fx.ts` (the imperative FX engine) is
 * mocked out, matching this project's existing convention of leaving
 * WebGL/animation internals untested.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// `next/font/google` es un modulo de build: fuera del compilador de Next
// exporta vacio, y `LandingFooterV2` lo llama en el tope del modulo — asi que
// sin este mock el archivo entero revienta al importar con
// «Inter_Tight is not a function», sin llegar a correr un solo test.
// La fabrica va inline: `vi.mock` se iza sobre las declaraciones del modulo,
// asi que una const declarada arriba todavia no existe cuando corre.
vi.mock('next/font/google', () => {
  const fuente = (opts: { variable?: string }) => ({
    className: 'mock-font',
    variable: opts.variable ?? '--font-mock',
    style: { fontFamily: 'mock-font' },
  })
  return { Inter: fuente, Inter_Tight: fuente, IBM_Plex_Mono: fuente }
})

const initLandingFxMock = vi.fn(() => () => {})
vi.mock('@/components/landing-v2/landing-fx', () => ({
  initLandingFx: () => initLandingFxMock(),
}))

// LandingHome now renders <LandingAuthCta>, which calls useAuth() — mock it
// out here since this test renders HomePage without the real AuthProvider.
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}))

// El idioma lo pone el middleware en la petición (16-10-2026).
const cabeceras = vi.hoisted(() => ({ idioma: null as string | null }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(cabeceras.idioma ? { 'x-idioma': cabeceras.idioma } : {}),
}))

import HomePage, { generateMetadata } from './page'
import { landingRobots } from '@/lib/landing/landing-stage'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  initLandingFxMock.mockClear()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

describe('/ (home) page', () => {
  it('spreads landingRobots() into metadata.robots', async () => {
    expect((await generateMetadata()).robots).toEqual(landingRobots())
  })

  it('en /es y /en: canonical, hreflang y el título en su idioma (16-10-2026)', async () => {
    cabeceras.idioma = 'en'
    const en = await generateMetadata()
    expect(en.alternates?.canonical).toBe('/en')
    expect(en.alternates?.languages).toEqual({ 'es-CO': '/es', en: '/en', 'x-default': '/' })
    expect(en.title).toBe('Leasefy — The intelligent operating system for real estate agencies')
    expect((en.openGraph as { locale?: string } | undefined)?.locale).toBe('en_US')

    cabeceras.idioma = 'es'
    const es = await generateMetadata()
    expect(es.alternates?.canonical).toBe('/es')
    // El español, como estaba: su título y el Open Graph del layout raíz.
    expect(es.title).toBe('Leasefy — El sistema operativo inteligente para inmobiliarias')
    expect(es.openGraph).toBeUndefined()
    cabeceras.idioma = null
  })

  it('renders the v2 home inside the .lv2 scope', () => {
    act(() => {
      root.render(<HomePage />)
    })
    const shell = container.querySelector('[data-testid="lv2-home"]')
    expect(shell).toBeTruthy()
    expect(shell?.className).toContain('lv2')
  })

  it('renders LogoDefs alongside LandingHome so #lfLogo <use> refs resolve', () => {
    act(() => {
      root.render(<HomePage />)
    })
    const shell = container.querySelector('[data-testid="lv2-home"]') as HTMLElement
    expect(shell.querySelector('#lfLogo')).toBeTruthy()
    expect(shell.querySelector('#hdr')).toBeTruthy()
  })

  it('renders #lfLogo exactly once (no duplicate id from LandingHome + LogoDefs)', () => {
    act(() => {
      root.render(<HomePage />)
    })
    expect(container.querySelectorAll('#lfLogo').length).toBe(1)
  })

  it('renders exactly one <header> (no double header from the shared LandingHeader)', () => {
    act(() => {
      root.render(<HomePage />)
    })
    expect(container.querySelectorAll('header').length).toBe(1)
  })

  it('mounts the FX engine on effect and cleans it up on unmount', () => {
    const cleanup = vi.fn()
    initLandingFxMock.mockReturnValue(cleanup)
    act(() => {
      root.render(<HomePage />)
    })
    expect(initLandingFxMock).toHaveBeenCalledTimes(1)
    act(() => {
      root.unmount()
    })
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
