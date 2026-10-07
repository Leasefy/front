/**
 * Estudio — la Sala no promete una bandeja que nadie llena (PROMESAS-Y-DIRECTOR, 05-10-2026).
 *
 * La tarjeta «Qué necesita tu atención · Revisa los estudios priorizados por
 * severidad → Abrir bandeja» y el botón «Ver estudios» llevaban a
 * `/estudio/estudios`, que lee la cola del micro para `agente=estudio`. Esa
 * cola SIEMPRE vuelve vacía, y el resumen también:
 *
 *   · `wt-agent-bugs/src/server/routes/agency-ai-hub-work-items.ts:783-787`
 *     (`case 'estudio'` → `emptyResponse`);
 *   · `…/agency-ai-hub-overview.ts:617-621` (`emptyOverview`), con el porqué
 *     en su cabecera (`:46-52`): el estudio guarda en `pipeline_runs` /
 *     `agent_risk_score_results`, que no tienen inmobiliaria por la que filtrar.
 *
 * Lo que pasa de verdad: el estudio es OPCIONAL, lo pide el candidato desde su
 * portal y su resultado se ve en la ficha de su postulación. La tarjeta y el
 * botón se van, el subtítulo dice eso, y la sala vacía dice dónde mirar en vez
 * de «cuando llegue un estudio… aparecerán aquí».
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...resto }, children),
}))

const { overviewMock } = vi.hoisted(() => ({ overviewMock: vi.fn() }))
vi.mock('@/lib/hooks/estudio/use-estudio-overview', () => ({
  useEstudioOverview: () => overviewMock(),
}))

import EstudioOverviewPage from './page'

/** Lo que el micro responde HOY para `estudio`: la estructura vacía (`emptyOverview`). */
const RESUMEN_DEL_MICRO = {
  data: { agente: 'estudio', kpis: [], pipeline: [], feed: [], generatedAt: '2026-10-05T10:00:00-05:00' },
  isLoading: false,
  error: null,
  errorCrudo: null,
  notAvailable: false,
  refetch: vi.fn(),
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function pintar(): HTMLDivElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<EstudioOverviewPage />)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  overviewMock.mockReset()
})

describe('Estudio — sin bandeja prometida', () => {
  it('no ofrece «Qué necesita tu atención», «Abrir bandeja» ni «Ver estudios»: la cola del estudio nunca trae nada', () => {
    overviewMock.mockReturnValue(RESUMEN_DEL_MICRO)
    const el = pintar()
    expect(el.textContent).not.toContain('Qué necesita tu atención')
    expect(el.textContent).not.toContain('Abrir bandeja')
    expect(el.textContent).not.toContain('Ver estudios')
    expect(el.textContent).not.toContain('priorizados por severidad')
    expect(el.querySelector('a[href="/panel/inmobiliaria/postulaciones/estudio/estudios"]')).toBeNull()
  })

  it('el subtítulo dice lo que pasa: lo pide el candidato y el resultado está en su postulación', () => {
    overviewMock.mockReturnValue(RESUMEN_DEL_MICRO)
    const el = pintar()
    const subtitulo = el.querySelector('header p')!.textContent ?? ''
    expect(subtitulo).not.toContain('Evalúa candidatos')
    expect(subtitulo).toContain('lo pide el candidato')
    expect(subtitulo).toContain('postulación')
  })

  it('la sala vacía dice dónde se ve cada estudio y lleva a Postulaciones, sin prometer que «aparecerán aquí»', () => {
    overviewMock.mockReturnValue(RESUMEN_DEL_MICRO)
    const el = pintar()
    expect(el.textContent).not.toContain('aparecerán aquí')
    expect(el.textContent).toContain('ficha del candidato')
    expect(el.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).not.toBeNull()
  })

  it('con datos reales (si algún día llegan) se pintan los números y no el vacío', () => {
    overviewMock.mockReturnValue({
      ...RESUMEN_DEL_MICRO,
      data: {
        ...RESUMEN_DEL_MICRO.data,
        kpis: [{ id: 'en_cola', label: 'En cola', value: 3, format: 'number' }],
      },
    })
    const el = pintar()
    expect(el.querySelector('[data-testid="estudio-kpi-strip"]')).not.toBeNull()
    expect(el.textContent).not.toContain('Cada estudio se ve en su postulación')
    expect(el.querySelector('a[href="/panel/inmobiliaria/postulaciones"]')).toBeNull()
  })
})
