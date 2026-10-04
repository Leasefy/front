/**
 * La tabla accesible del gráfico de etapas no corre la portada de lado
 * (QA-IA-B, 04-10-2026).
 *
 * 🔴 A 390 px la portada de Cobranza medía 439 px de ancho: la tabla
 * alternativa para lectores de pantalla llevaba `sr-only` en el propio
 * <table>, y una tabla no se encoge a 1 px (`width` no le aplica), así que
 * medía 395 px y empujaba la página. El `sr-only` va en un contenedor.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))

import { CobranzaFunnelChart } from './CobranzaFunnelChart'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

describe('CobranzaFunnelChart — la tabla para lectores de pantalla', () => {
  it('vive dentro de un contenedor sr-only, no es la tabla la que lleva sr-only', () => {
    act(() =>
      raiz.render(
        <CobranzaFunnelChart
          stages={[
            { stage: 'S1', count: 2 },
            { stage: 'S2', count: 3 },
          ]}
        />,
      ),
    )
    const tabla = contenedor.querySelector('#funnel-summary-table')
    expect(tabla).not.toBeNull()
    expect(tabla!.classList.contains('sr-only')).toBe(false)
    expect(tabla!.parentElement?.classList.contains('sr-only')).toBe(true)
  })
})
