/**
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

const tarjeta = (id: string) => container.querySelector(`[data-testid="desempeno-${id}"]`)?.textContent ?? ''

describe('Desempeño IA', () => {
  it('se titula «Desempeño IA», no «Analítica»', async () => {
    await render()
    expect(container.querySelector('h1')?.textContent).toContain('Desempeño IA')
    expect(container.textContent).not.toContain('Analítica')
    expect(container.textContent).not.toContain('proyecciones')
  })

  it('una tarjeta por agente: cobranza, pagos, conciliación, matching, asegurabilidad, estudio y chat', async () => {
    await render()
    for (const id of ['cobranza', 'pagos', 'conciliacion', 'matching', 'cotizador', 'estudio', 'chat']) {
      expect(container.querySelector(`[data-testid="desempeno-${id}"]`)).not.toBeNull()
    }
  })

  it('con actividad pinta sus cifras reales y la última actividad en palabras', async () => {
    await render()
    const t = tarjeta('cobranza')
    expect(t).toContain('Recaudo recuperado (30 días)')
    expect(t).toMatch(/1\.500\.000/)
    expect(t).toContain('Tasa de recuperación (30 días)')
    expect(t).toContain('25 %')
    expect(t).toContain('3 de octubre de 2026')
  })

  it('primero dice cuántos casos tiene en curso (de su cola), con la plata como en la casa', async () => {
    await render()
    const t = tarjeta('cobranza')
    expect(t).toContain('Casos en curso6')
    // La plata de la casa: UNA sola `formatCurrency`, «$ 1.234.567» con espacio
    // (C1-ESQUEMA Q4 a, unificada en C4 de «centavos en todo»).
    expect(t).toContain('$\u00a01.500.000')
  })

  it('🔴 QA-IA-95: los deudores en S0 (pre-vencimiento) no son «casos en curso» de la cobranza (Cobranza › Casos no los cuenta)', async () => {
    overviewMock.mockImplementation((agente: string) => ({
      data: agente === 'cobranza' ? { ...COBRANZA, pipeline: [{ estado: 'detectado', count: 19 }] } : vacio(agente),
      isLoading: false,
      errorCrudo: null,
      notAvailable: false,
      refetch: vi.fn(),
    }))
    await render()
    expect(tarjeta('cobranza')).not.toContain('Casos en curso')
    expect(tarjeta('cobranza')).toContain('Recaudo recuperado (30 días)')
  })

  it('🔴 sin actividad dice «Sin actividad todavía», no una fila de ceros', async () => {
    await render()
    expect(tarjeta('conciliacion')).toContain('Sin actividad todavía')
    expect(tarjeta('conciliacion')).not.toContain('Monto conciliado')
    expect(tarjeta('pagos')).toContain('Sin actividad todavía')
  })

  it('🔴 nada estimado: ni «< 1 min» con cero evaluaciones ni «horas ahorradas»', async () => {
    await render()
    expect(container.textContent).not.toContain('< 1 min')
    expect(container.textContent).not.toMatch(/horas ahorradas/i)
    expect(tarjeta('estudio')).toContain('Sin actividad todavía')
  })

  it('con evaluaciones, el estudio dice cuántas y cómo terminaron (por lo que el back mide)', async () => {
    metricasMock.mockReturnValue({
      metrics: {
        scoring: { evaluationsThisMonth: 12, avgTimeMin: '3 min', escalationRate: '8%', accuracyRate: '92%' },
        summary: { actionsThisWeek: 5, hoursSavedThisMonth: '6h' },
      },
      isLoading: false,
      errorCrudo: null,
      refetch: vi.fn(),
    })
    await render()
    const t = tarjeta('estudio')
    expect(t).toContain('12')
    expect(t).toContain('Evaluaciones completadas')
    expect(t).toContain('92%')
    expect(t).toContain('Evaluaciones que fallaron')
    expect(t).not.toContain('Tasa de precisión')
  })

  it('🔴 no ofrece exportar ni elegir período, y no inventa tendencias ni metas', async () => {
    await render()
    const botones = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '')
    expect(botones.some((t) => t.toLowerCase().includes('export'))).toBe(false)
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('90d')
    expect(texto).not.toContain('Meta:')
    expect(texto).not.toContain('+0.0')
  })
})

describe('🔴 QA-IA-95 (IA95-08): los agentes con manos tienen tarjeta', () => {
  const agente = (a: string, nombre: string, extra: Record<string, number> = {}) => ({ agente: a, nombre, hechas: 0, fallidas: 0, deshechas: 0, descartadas: 0, programadas: 0, esperan: 0, ...extra })
  it('Fixi, Avali, Vidi, Niti, Imana y el precio salen con lo que hicieron en 30 días; sin nada, «Sin actividad todavía»', async () => {
    conManos.valor = {
      data: {
        disponible: true, dias: 30, recortado: false,
        agentes: [
          agente('mantenimiento', 'Fixi · mantenimiento', { hechas: 3, esperan: 1 }),
          agente('aprobaciones', 'Avali · aprobaciones'),
          agente('inspeccion', 'Vidi · inspección', { programadas: 2 }),
          agente('calidad', 'Niti · calidad', { deshechas: 1 }),
          agente('prospectos', 'Imana · prospectos'),
          agente('avaluos', 'Avalúos'),
          agente('matching', 'Matching', { hechas: 9 }),
        ],
      },
      isLoading: false, error: null, sinLaRuta: false, refetch: () => {},
    }
    await render()
    const fixi = container.querySelector('[data-testid="desempeno-mantenimiento"]')?.textContent ?? ''
    expect(fixi).toContain('Fixi · mantenimiento')
    expect(fixi).toContain('Hechas en 30 días')
    expect(fixi).toContain('Esperan tu decisión')
    expect(container.querySelector('[data-testid="desempeno-inspeccion"]')?.textContent).toContain('Programadas')
    expect(container.querySelector('[data-testid="desempeno-aprobaciones"]')?.textContent).toContain('Sin actividad todavía')
    for (const id of ['calidad', 'prospectos', 'avaluos']) expect(container.querySelector(`[data-testid="desempeno-${id}"]`)).not.toBeNull()
    // Matching ya tiene su tarjeta (la de su Sala): no se repite.
    expect(container.querySelectorAll('[data-testid="desempeno-matching"]').length).toBe(1)
  })
  it('sin poder leerlo, lo dice (no pinta ceros)', async () => {
    conManos.valor = { data: { disponible: false, dias: 30, recortado: false, agentes: [] }, isLoading: false, error: null, sinLaRuta: false, refetch: () => {} }
    await render()
    expect(container.querySelector('[data-testid="desempeno-con-manos-sin-dato"]')?.textContent).toContain('No pudimos leer')
  })
})
