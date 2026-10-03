/**
 * El Resumen de Cobranza con su movimiento (MOV-A2, movimiento ola 2,
 * 03-10-2026), con las animaciones DE VERDAD
 * (`MotionGlobalConfig.skipAnimations = false`).
 *
 * Lo que fija:
 *  · la cifra de una etapa CUENTA desde 0 cuando la pantalla acaba de cargar
 *    (`contarDesdeCero`), y sin eso se muestra tal cual;
 *  · «Los que más pesan» ENTRA con su animación cuando llega el reporte
 *    (antes `return null` → tarjeta de golpe) y sus filas son las del cuerpo
 *    animado de la tabla.
 */
import * as React from 'react'
import { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

const { reporte } = vi.hoisted(() => ({
  reporte: { data: null as unknown, isLoading: true },
}))
vi.mock('@/lib/hooks/cobranza/use-daily-report', () => ({
  useDailyReport: () => reporte,
}))

import { CobranzaStageCard } from './CobranzaStageCard'
import { CobranzaDeudoresQuePesan } from './CobranzaDeudoresQuePesan'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  MotionGlobalConfig.skipAnimations = false
  reporte.data = null
  reporte.isLoading = true
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

const pintar = (el: React.ReactElement) => act(() => root.render(el))
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

const tarjeta = (contarDesdeCero?: boolean) => (
  <CobranzaStageCard
    stage="S1"
    count={7}
    avgDaysInStage={3}
    weeklyDelta={0}
    onStageClick={() => {}}
    contarDesdeCero={contarDesdeCero}
  />
)
const cifra = () => host.querySelector('p.text-3xl')?.textContent

describe('CobranzaStageCard — la cifra', () => {
  it('recién cargada la pantalla, cuenta desde 0 hasta la cifra', async () => {
    pintar(tarjeta(true))
    expect(cifra()).toBe('0')
    await esperar(800)
    expect(cifra()).toBe('7')
  })

  it('sin `contarDesdeCero` se muestra tal cual, sin contar', () => {
    pintar(tarjeta())
    expect(cifra()).toBe('7')
  })
})

describe('CobranzaDeudoresQuePesan — entra al llegar el reporte', () => {
  it('mientras carga no se monta; al llegar entra con su animación', async () => {
    pintar(<CobranzaDeudoresQuePesan />)
    expect(host.textContent).not.toContain('Los que más pesan')

    reporte.isLoading = false
    reporte.data = {
      top_debtors: [
        { debtor_id: 'd-1', debtor_name: 'Iván Laboratorio', dpd: 45, balance_cop: 3_200_000 },
      ],
    }
    pintar(<CobranzaDeudoresQuePesan />)
    const card = host.firstElementChild as HTMLElement
    expect(card.textContent).toContain('Los que más pesan')
    // Arranca transparente y llega a 1: entra, no aparece de golpe.
    expect(card.style.opacity).toBe('0')
    await esperar(600)
    expect(card.style.opacity).toBe('1')
    // La fila es del cuerpo animado de la tabla (un `<tr>` dentro de un `<tbody>`).
    const fila = host.querySelector('tbody tr')!
    expect(fila.textContent).toContain('Iván Laboratorio')
  })
})
