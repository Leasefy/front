/**
 * Ronda 30 (K8, Nico 23-10-2026: «K8 fusionar»): «Resultados del agente» se
 * fusionó en el Resumen de Cobranza. Estas pruebas protegían la pantalla; ahora
 * protegen que su ruta lleve al Resumen y que lo que la pantalla decía siga
 * dicho ahí, en «Cómo trabajó la cobranza» (`CobranzaResultadosKpis`):
 *   1. la ruta redirige a `#como-trabajo` (respaldo de `next.config.mjs`);
 *   2. lo recuperado, los casos cerrados y los escalados están; «Ahorro
 *      operativo» (siempre sin dato) no sale;
 *   3. la mora que SUBE no se anuncia como buena noticia;
 *   4. sin el agregado de recuperación, la cifra dice «Pagado hoy» (era lo
 *      propio de Resultados; antes el Resumen la llamaba «Valor recuperado»).
 * «Revisar N escalados» ya es una columna de «Te toca a ti» (su prueba vive en
 * `CobranzaTeTocaATi.test.tsx`).
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  recovery: { data: null as unknown, isLoading: false, error: null as unknown, refetch: () => undefined },
  daily: { data: null as unknown, isLoading: false, error: null as unknown, refetch: () => undefined },
  redirect: (() => undefined) as (url: string) => void,
}))

vi.mock('next/navigation', () => ({ redirect: (url: string) => h.redirect(url) }))
vi.mock('@/lib/hooks/cobranza/use-recovery', () => ({ useRecovery: () => h.recovery }))
vi.mock('@/lib/hooks/cobranza/use-daily-report', () => ({ useDailyReport: () => h.daily }))
vi.mock('@/lib/i18n', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
    formatNumber: (n: number) => n.toLocaleString('es-CO'),
  }),
}))
vi.mock('@/lib/i18n/use-tr', () => ({
  useTr: () => (s: string, v?: Record<string, unknown>) => s.replace(/\{(\w+)\}/g, (_m, k: string) => String(v?.[k] ?? '')),
  useLocaleDeFechas: () => 'es-CO',
}))

import ResultadosPage from './page'
import { CobranzaResultadosKpis } from '@/components/inmobiliaria/cobranza/CobranzaResultadosKpis'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

let host: HTMLDivElement
let root: Root
let overview: CarteraOverviewResponse

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  h.recovery.data = {
    recoveredValueCop: 12_500_000,
    casesClosed: 8,
    casesManaged: 40,
    avgRecoveryDays: 6,
    responseRatePct: 62,
    promisesKept: 5,
    promisesTotal: 7,
    agreementsKept: 2,
    agreementsTotal: 3,
    casesEscalated: 9,
    moraReducedPct: -3.5,
    moraWindowDays: 90,
  }
  h.daily.data = null
  overview = { kpis: { escalacionesPendientes: 2, llamadasHoy: 10, pagadoHoyCop: 0 } } as unknown as CarteraOverviewResponse
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const montar = async () => {
  await act(async () => {
    root.render(<CobranzaResultadosKpis overview={overview} />)
  })
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`)

describe('Resultados del agente, fusionado en el Resumen (ronda 30, K8)', () => {
  it('la ruta vieja lleva al Resumen, a «Cómo trabajó la cobranza»', () => {
    let destino = ''
    h.redirect = (url) => {
      destino = url
    }
    ResultadosPage()
    expect(destino).toBe('/panel/inmobiliaria/pagos/cobranza#como-trabajo')
  })

  it('lo recuperado, los casos cerrados y los escalados están; «Ahorro operativo» (siempre sin dato) no sale', async () => {
    await montar()
    expect(q('cobranza-kpi-recuperado')?.textContent).toContain('Valor recuperado')
    expect(q('cobranza-kpi-casos-cerrados')).not.toBeNull()
    expect(q('cobranza-kpi-escalados')).not.toBeNull()
    expect(q('cobranza-kpi-ahorro-operativo')).toBeNull()
  })

  it('la mora que sube se dice como subida', async () => {
    await montar()
    const mora = q('cobranza-kpi-mora')
    expect(mora?.textContent).toContain('Mora aumentada')
    expect(mora?.textContent).toContain('Subió en 90 días')
  })

  it('sin el agregado de recuperación, la cifra es lo pagado hoy y se dice así', async () => {
    h.recovery.data = null
    h.daily.data = { summary: { payments_today_total_cop: 850_000 } }
    await montar()
    const recuperado = q('cobranza-kpi-recuperado')
    expect(recuperado?.textContent).toContain('Pagado hoy')
    expect(recuperado?.textContent).not.toContain('Valor recuperado')
  })
})
