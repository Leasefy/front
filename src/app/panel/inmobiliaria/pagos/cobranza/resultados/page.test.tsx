/**
 * Resultados del agente (GLOW UP, 21-10-2026): lo que recuperó y cómo trabajó,
 * y lo que espera de ti.
 *
 * Lo que fija:
 *   1. «Revisar N escalados» sale sólo con escalaciones PENDIENTES (las del
 *      overview), no con las de la ventana (que incluyen las ya resueltas);
 *   2. las cifras van en dos franjas y la que nunca tiene dato («Ahorro
 *      operativo») ya no se pinta;
 *   3. la mora que SUBE no se anuncia como buena noticia.
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
  recovery: { data: null as unknown, isLoading: false, error: null as unknown, refetch: vi.fn() },
  overview: { data: null as unknown, isLoading: false, error: null as unknown, refetch: vi.fn() },
  daily: { data: null as unknown, isLoading: false, error: null as unknown, refetch: vi.fn() },
}))

vi.mock('@/lib/hooks/cobranza/use-recovery', () => ({ useRecovery: () => h.recovery }))
vi.mock('@/lib/hooks/cobranza/use-cartera-overview', () => ({ useCarteraOverview: () => h.overview }))
vi.mock('@/lib/hooks/cobranza/use-daily-report', () => ({ useDailyReport: () => h.daily }))
vi.mock('@/lib/hooks/use-auto-refresh', () => ({ useAutoRefresh: () => undefined }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { name: 'Portofino' } }) }))
vi.mock('@/lib/i18n', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
    formatNumber: (n: number) => n.toLocaleString('es-CO'),
  }),
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

import ResultadosPage from './page'

let host: HTMLDivElement
let root: Root

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
  h.overview.data = { kpis: { escalacionesPendientes: 2, llamadasHoy: 10, pagadoHoyCop: 0 } }
  h.daily.data = null
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const montar = async () => {
  await act(async () => {
    root.render(<ResultadosPage />)
  })
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`)

describe('Resultados del agente', () => {
  it('con escalaciones pendientes, la acción principal es revisarlas (las pendientes, no las de la ventana)', async () => {
    await montar()
    const cta = q('resultados-revisar-escalados')
    expect(cta?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cobranza/escalaciones')
    expect(cta?.textContent).toContain('Revisar 2 escalados')
  })

  it('sin escalaciones pendientes no hay acción principal; la analítica y el reporte siguen a la mano', async () => {
    h.overview.data = { kpis: { escalacionesPendientes: 0, llamadasHoy: 10, pagadoHoyCop: 0 } }
    await montar()
    expect(q('resultados-revisar-escalados')).toBeNull()
    expect(q('resultados-ver-analitica')).not.toBeNull()
    expect(q('resultados-ver-reporte')).not.toBeNull()
  })

  it('las cifras van en dos franjas y «Ahorro operativo» (siempre sin dato) ya no sale', async () => {
    await montar()
    expect(q('franja-recupero')?.querySelector('[data-testid="resultado-kpi-recuperado"]')).not.toBeNull()
    expect(q('franja-trabajo')?.querySelector('[data-testid="resultado-kpi-escalados"]')).not.toBeNull()
    expect(q('resultado-kpi-ahorro-operativo')).toBeNull()
  })

  it('la mora que sube se dice como subida', async () => {
    await montar()
    const mora = q('resultado-kpi-mora-reducida')
    expect(mora?.textContent).toContain('Mora aumentada')
    expect(mora?.textContent).toContain('Subió en 90 días')
  })

  it('sin ningún dato, el vacío con su ilustración y el encabezado con sus acciones', async () => {
    h.recovery.data = null
    h.overview.data = null
    await montar()
    expect(q('resultados-vacio')).not.toBeNull()
    expect(q('resultados-ver-analitica')).not.toBeNull()
  })
})
