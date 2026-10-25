/**
 * GLOW UP 21-10: cada agente que trabajó lleva a su pantalla, con el gate del sidebar.
 *
 * Desempeño IA (QA 04-10, IA-C-05): una tarjeta por agente con cifras REALES de
 * su actividad, «Sin actividad todavía» cuando no hay, y nada estimado (fuera
 * «Tiempo promedio < 1 min» con cero evaluaciones y las «horas ahorradas»).
 *
 * Lo que la pantalla vieja ya había sacado por mentiroso sigue afuera: exportar
 * sin archivo, selector de período, tendencias y metas inventadas.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { permisos } = vi.hoisted(() => ({
  permisos: { valor: null as unknown },
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const { metricasMock, overviewMock } = vi.hoisted(() => ({
  metricasMock: vi.fn(),
  overviewMock: vi.fn(),
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAiMetrics: () => metricasMock(),
}))
vi.mock('@/lib/hooks/ai/use-agent-overview', () => ({
  useAgentOverview: (agente: string) => overviewMock(agente),
}))
// QA-IA-95 (IA95-08): lo que hicieron los agentes con manos (acciones del Piloto del back).
const { conManos } = vi.hoisted(() => ({
  conManos: { valor: { data: null as unknown, isLoading: false, error: null as unknown, sinLaRuta: true, refetch: () => {} } },
}))
vi.mock('@/lib/hooks/ai/use-desempeno-de-los-agentes', () => ({ useDesempenoDeLosAgentes: () => conManos.valor }))

import AnalyticsPage from './page'

const vacio = (agente: string) => ({ agente, kpis: [], pipeline: [], feed: [], generatedAt: '2026-10-04T04:00:00-05:00' })

const COBRANZA = {
  agente: 'cobranza',
  kpis: [
    { id: 'recovered_30d_cop', label: 'Recaudo recuperado (30 días)', value: 1500000, format: 'cop' },
    { id: 'recovery_rate_30d', label: 'Tasa de recuperación (30 días)', value: 0.25, format: 'percent' },
    { id: 'open_escalations', label: 'Escalaciones abiertas', value: 2, format: 'number' },
  ],
  // QA-IA-95: los 19 en S0 («detectado», pre-vencimiento) no son casos en curso; los 6 en S1 sí.
  pipeline: [{ estado: 'detectado', count: 19 }, { estado: 'sugerido', count: 6 }],
  feed: [{ id: 'f1', titulo: 'x', detalle: 'y', actorType: 'agent', occurredAt: '2026-10-03T10:00:00-05:00' }],
  generatedAt: '2026-10-04T04:00:00-05:00',
}

const CONCILIACION_EN_CERO = {
  agente: 'conciliacion',
  kpis: [
    { id: 'matched_30d_cop', label: 'Monto conciliado (30 días)', value: 0, format: 'cop' },
    { id: 'auto_match_rate_30d', label: 'Tasa de auto-match (30 días)', value: 0, format: 'percent' },
  ],
  pipeline: [],
  feed: [],
  generatedAt: '2026-10-04T04:00:00-05:00',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  overviewMock.mockImplementation((agente: string) => ({
    data: agente === 'cobranza' ? COBRANZA : agente === 'conciliacion' ? CONCILIACION_EN_CERO : vacio(agente),
    isLoading: false,
    errorCrudo: null,
    notAvailable: false,
    refetch: vi.fn(),
  }))
  metricasMock.mockReturnValue({
    metrics: {
      scoring: { evaluationsThisMonth: 0, avgTimeMin: '< 1 min', escalationRate: '0%', accuracyRate: '0%' },
      summary: { actionsThisWeek: 0, hoursSavedThisMonth: '0h' },
    },
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  })
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<AnalyticsPage />)
  })
}


const conPermiso = (modulos: string[]) => ({
  canAccess: (m: string) => modulos.includes(m),
  isAdmin: false,
  agencyRole: 'ADMIN',
  agentAccessStatus: 'verificado',
})

describe('Desempeño IA — ir a la pantalla del agente', () => {
  it('con el módulo de cobranza, la tarjeta ofrece ir a Cobranza', async () => {
    permisos.valor = conPermiso(['cobranza', 'analytics'])
    await render()
    const ir = container.querySelector('[data-testid="desempeno-cobranza-ir"]')
    expect(ir?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cobranza')
    expect(ir?.textContent).toContain('Ir a Cobranza')
  })

  it('sin el módulo, no se ofrece: el sidebar tampoco se la da', async () => {
    permisos.valor = conPermiso(['analytics'])
    await render()
    expect(container.querySelector('[data-testid="desempeno-cobranza-ir"]')).toBeNull()
  })
})
