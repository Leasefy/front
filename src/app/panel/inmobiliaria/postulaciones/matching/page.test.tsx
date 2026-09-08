/**
 * page.test.tsx — Resumen de Matching: el vacío dice la verdad.
 *
 * Hoy el micro no corre Matching para ninguna inmobiliaria (las corridas de
 * smart-matching no guardan agencyId): el overview vuelve 404 o vacío por
 * diseño. Antes la pantalla pintaba «Casos por etapa: sin casos» y «Sin
 * actividad reciente», que se lee como «el agente trabaja y no encontró
 * nada». Estas pruebas fijan que:
 *
 * 1. Sin overview (404) y con overview sin KPIs se dice «todavía no está
 *    trabajando tu cartera», sin pipeline ni feed en cero y sin un botón que
 *    no haga nada.
 * 2. Con KPIs reales se pintan los números: el cableado sigue vivo para el
 *    día que el micro persista agencyId.
 * 3. «¿Cómo funciona?» tiene tres pasos y ninguno promete un contacto que el
 *    producto no hace.
 * 4. El namespace `pages.matching` tiene la misma forma en es y en, y las
 *    claves que prometían el contacto ya no existen.
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function leer(dic: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>(
      (acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined),
      dic,
    )
}

/* `t` resuelve contra el es.json REAL: la prueba afirma la frase que ve el
   usuario, no una clave, y de paso falla si la clave no existe. */
vi.mock('@/lib/i18n', async () => {
  const diccionario = (await import('@/lib/i18n/locales/es.json')).default
  const resolver = (k: string): string => {
    const v = k
      .split('.')
      .reduce<unknown>(
        (acc, p) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[p] : undefined),
        diccionario,
      )
    return typeof v === 'string' ? v : k
  }
  return {
    useI18n: () => ({
      locale: 'es',
      t: resolver,
      formatCurrency: (n: number) => String(n),
    }),
  }
})

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

const { overviewMock } = vi.hoisted(() => ({ overviewMock: vi.fn() }))
vi.mock('@/lib/hooks/ai/use-agent-overview', () => ({
  useAgentOverview: () => overviewMock(),
}))

import MatchingResumenPage from './page'

const NS = 'inmobiliaria.ai.workspace.pages.matching'

const overviewBase = {
  data: null,
  isLoading: false,
  error: null,
  errorCrudo: null,
  notAvailable: true,
  refetch: vi.fn(),
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function montar(): Promise<HTMLDivElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(<MatchingResumenPage />)
  })
  return host
}

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('Resumen de Matching — el vacío honesto', () => {
  it('sin overview (404): dice que todavía no trabaja tu cartera, sin pipeline, feed ni botón', async () => {
    overviewMock.mockReturnValue({ ...overviewBase })
    const pantalla = await montar()

    const vacio = pantalla.querySelector('[data-testid="empty-state"]')
    expect(vacio).not.toBeNull()
    expect(vacio!.textContent).toContain('Matching todavía no está trabajando tu cartera')
    expect(vacio!.textContent).toContain('Cuando se encienda para tu inmobiliaria')
    expect(vacio!.querySelector('a, button')).toBeNull()

    expect(pantalla.querySelector('[data-testid="matching-resumen-datos"]')).toBeNull()
    expect(pantalla.textContent).not.toContain('Sin casos en el pipeline')
    expect(pantalla.textContent).not.toContain('Sin actividad reciente')
  })

  it('overview con todo en cero: el mismo vacío honesto, no un pipeline vacío', async () => {
    overviewMock.mockReturnValue({
      ...overviewBase,
      notAvailable: false,
      data: {
        agente: 'matching',
        kpis: [],
        pipeline: [{ estado: 'sugerido', count: 0 }],
        feed: [],
        generatedAt: '2026-09-08T12:00:00.000Z',
      },
    })
    const pantalla = await montar()

    expect(pantalla.querySelector('[data-testid="empty-state"]')?.textContent).toContain(
      'Matching todavía no está trabajando tu cartera',
    )
    expect(pantalla.querySelector('[data-testid="matching-resumen-datos"]')).toBeNull()
  })

  it('con KPIs reales se pintan los números y el CTA lleva el conteo', async () => {
    overviewMock.mockReturnValue({
      ...overviewBase,
      notAvailable: false,
      data: {
        agente: 'matching',
        kpis: [{ id: 'en_cola', label: 'Por revisar', value: 3, format: 'number' }],
        pipeline: [{ estado: 'sugerido', count: 3 }],
        feed: [],
        generatedAt: '2026-09-08T12:00:00.000Z',
      },
    })
    const pantalla = await montar()

    expect(pantalla.querySelector('[data-testid="empty-state"]')).toBeNull()
    expect(pantalla.querySelector('[data-testid="matching-kpis"]')?.textContent).toContain('Por revisar')
    expect(pantalla.querySelector('header a')?.textContent).toContain('(3)')
  })

  it('el encabezado es el de la casa: eyebrow «Matching» y un CTA que navega a la cola', async () => {
    overviewMock.mockReturnValue({ ...overviewBase })
    const pantalla = await montar()

    const header = pantalla.querySelector('header')!
    expect(header.textContent).toContain('Matching')
    expect(header.querySelector('h1')?.textContent).toBe('Resumen')
    expect(header.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/postulaciones/matching/cola',
    )
  })

  it('«¿Cómo funciona?» tiene tres pasos y no promete el contacto', async () => {
    overviewMock.mockReturnValue({ ...overviewBase })
    const pantalla = await montar()

    const pasos = pantalla.querySelectorAll('[data-testid="matching-como-funciona"] li')
    expect(pasos.length).toBe(3)
    expect(pasos[2].textContent).toContain('Revisas la coincidencia y decides')
    expect(pantalla.textContent).not.toMatch(/contacto|se envía|nada se hace sin ti/i)
  })
})

describe('claves de inmobiliaria.ai.workspace.pages.matching', () => {
  function forma(o: unknown, prefijo = ''): string[] {
    if (!o || typeof o !== 'object') return [prefijo]
    return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
      forma(v, prefijo ? `${prefijo}.${k}` : k),
    )
  }

  it('es y en tienen la misma forma', () => {
    expect(forma(leer(en, NS)).sort()).toEqual(forma(leer(es, NS)).sort())
  })

  it('las claves de las pantallas existen y las que prometían el contacto ya no', () => {
    for (const k of [
      'salaTitulo',
      'salaDesc',
      'colaTitle',
      'colaLabel',
      'colaDesc',
      'queEs',
      'sinTrabajo.title',
      'sinTrabajo.desc',
      'comoFunciona.title',
      'comoFunciona.step1.title',
      'comoFunciona.step2.title',
      'comoFunciona.step3.title',
    ]) {
      expect(typeof leer(es, `${NS}.${k}`), k).toBe('string')
    }
    expect(leer(es, `${NS}.comoFunciona.step4`)).toBeUndefined()
    expect(leer(es, `${NS}.analiticaDesc`)).toBeUndefined()
    expect(leer(es, `${NS}.colaEmptyHint`)).toBeUndefined()
  })
})
