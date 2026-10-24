/**
 * page.test.tsx — Candidatos del propietario, layout en móvil (T-0173).
 *
 * A 360/412 px el filtro por estado (419 px) y el botón del scoring (407 px)
 * ensanchaban la página. El filtro scrollea por dentro y el botón se parte.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('@/lib/hooks/useLandlord', () => ({
  useCandidates: () => ({
    candidates: [],
    stats: { total: 0, pending: 0, approved: 0, rejected: 0, moreInfo: 0 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCandidate: () => ({ candidate: null, isLoading: false }),
  useCandidateDecision: () => ({ decide: vi.fn() }),
  mensajeDelFalloAlDecidir: () => '',
}))

import CandidatosPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
})

describe('Candidatos del propietario en móvil', () => {
  it('el filtro por estado scrollea por dentro', async () => {
    await act(async () => { root.render(React.createElement(CandidatosPage)) })
    const filtro = container.querySelector('[aria-label="Filtrar por estado"]') as HTMLElement
    expect(filtro).not.toBeNull()
    const contenedor = filtro.parentElement as HTMLElement
    expect(contenedor.className).toContain('max-w-full')
    expect(contenedor.className).toContain('overflow-x-auto')
  })

  it('el botón de la guía de scoring puede partirse en líneas', async () => {
    await act(async () => { root.render(React.createElement(CandidatosPage)) })
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('scoringGuideToggle'),
    ) as HTMLButtonElement
    expect(boton).toBeTruthy()
    expect(boton.className).toContain('whitespace-normal')
    expect(boton.className).toContain('max-w-full')
  })
})
