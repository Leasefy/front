/**
 * Desempeño IA: la pantalla no afirma nada que no haya pasado.
 *
 * Tenía cuatro mentiras:
 *
 *   · «Exportar PDF / Excel»: el handler entero era un `toast.success`. Ni una
 *     petición; nunca hubo archivo.
 *   · El selector de período (7d/30d/90d/1a): `setState` + «Período
 *     actualizado», sin cambiar un solo número. `useAiMetrics()` no recibe
 *     parámetros y la ruta del back tampoco.
 *   · Seis insignias de tendencia fabricadas — cinco `stable` con 0 % y una
 *     `up` con 0 %, o sea una flecha verde de crecimiento sobre un delta que
 *     nadie midió— y tres «metas» que eran constantes escritas en el archivo.
 *   · Los cuatro KPI de arriba eran `<button>` sin `onClick`: cursor de mano,
 *     elevación al pasar, foco de teclado y rol `button` para nada.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() as string, locale: 'es' }),
}))

/** El guard no es lo que se prueba acá. */
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const avisos: unknown[] = []
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (t: unknown) => avisos.push(t),
    error: (t: unknown) => avisos.push(t),
    info: (t: unknown) => avisos.push(t),
  },
}))

const METRICAS = {
  scoring: {
    evaluationsThisMonth: 12,
    avgTimeMin: '< 1 min',
    escalationRate: '8%',
    accuracyRate: '92%',
  },
  summary: { actionsThisWeek: 5, hoursSavedThisMonth: '6h' },
}

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAiMetrics: () => ({
    metrics: METRICAS,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useAiActivity: () => {
    throw new Error('useAiActivity no debería usarse: su resultado no se pinta')
  },
}))

import AnalyticsPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  avisos.length = 0
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
    root.render(<AnalyticsPage />)
  })
}

const fuente = () => container.innerHTML

describe('Desempeño IA', () => {
  it('pinta las métricas reales del agente', async () => {
    await render()
    const texto = container.textContent ?? ''
    expect(texto).toContain('12')
    expect(texto).toContain('92%')
    expect(texto).toContain('8%')
  })

  it('🔴 no ofrece exportar: no hay endpoint que produzca ese archivo', async () => {
    await render()
    const botones = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '')
    expect(botones.some((t) => t.toLowerCase().includes('export'))).toBe(false)
  })

  it('🔴 no ofrece elegir período: las métricas son siempre «este mes»', async () => {
    await render()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('7d')
    expect(texto).not.toContain('90d')
    expect(texto).not.toContain('1y')
  })

  it('🔴 no afirma nada al abrir: cero avisos', async () => {
    await render()
    expect(avisos).toHaveLength(0)
  })

  it('🔴 sin tendencia medida no hay insignia de tendencia: nada de «+0.0 %»', async () => {
    await render()
    expect(fuente()).not.toContain('0.0%')
    expect(container.textContent).not.toContain('+0.0')
  })

  it('🔴 no inventa metas de la agencia («Meta: 95%», «Meta: < 3 min»)', async () => {
    await render()
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('Meta:')
  })

  it('🔴 las tarjetas de arriba no son botones: no llevan a ningún lado', async () => {
    await render()
    const textos = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '')
    expect(textos.some((t) => t.includes('Evaluaciones este mes'))).toBe(false)
    expect(textos.some((t) => t.includes('Horas ahorradas'))).toBe(false)
  })

  it('🔴 llama a las métricas por lo que el back mide, no por lo que suena mejor', async () => {
    await render()
    const texto = container.textContent ?? ''
    // `accuracyRate` es completadas/total y `escalationRate` es fallidas/total.
    expect(texto).toContain('Evaluaciones completadas')
    expect(texto).toContain('Evaluaciones que fallaron')
    expect(texto).not.toContain('Tasa de precisión')
    expect(texto).not.toContain('Tasa de escalación')
    // Y las horas son una estimación (evaluaciones × media hora), no una medición.
    expect(texto).toContain('estimadas')
  })

  it('🔴 no deja un encabezado «Visualizaciones» con nada debajo', async () => {
    await render()
    expect(container.textContent).not.toContain('visualizations')
  })
})
