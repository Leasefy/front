/**
 * PPF-02b (QA-PAGOS-95 ronda 2): en Cobros emitidos, los recargos escritos sin
 * plazo fijado que quedaron (pagados o facturados) salen para revisarlos.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

void React
import { RecargosSinPlazo } from './RecargosSinPlazo'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const $ = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

describe('PPF-02b · Recargos cobrados sin plazo fijado', () => {
  it('🔴 lista los que quedan, con por qué, y avisa los que se quitan solos', async () => {
    const leer = vi.fn().mockResolvedValue({
      plazoSinFijar: true,
      porQuitar: 2,
      quedan: [
        {
          cobroId: 'c1',
          mes: '2026-10',
          inquilino: 'Santiago Bedoya',
          inmueble: 'Apto 301',
          recargoCop: 76_000,
          motivo: 'PAGADO',
          porQue: 'El cobro ya recibió plata y esa plata se aplicó primero al recargo.',
        },
      ],
    })
    await act(async () => root.render(<RecargosSinPlazo leer={leer} />))
    expect($('recargos-sin-plazo')!.textContent).toContain('Un cobro tiene un recargo de mora')
    expect($('recargos-sin-plazo-lista')!.textContent).toContain('Santiago Bedoya')
    expect($('recargos-sin-plazo-lista')!.textContent).toContain('76.000')
    expect($('recargos-sin-plazo-por-quitar')!.textContent).toContain('Otros 2 cobros')
  })

  it('con el plazo fijado (o sin nada) no se pinta', async () => {
    const leer = vi.fn().mockResolvedValue({ plazoSinFijar: false, quedan: [], porQuitar: 0 })
    await act(async () => root.render(<RecargosSinPlazo leer={leer} />))
    expect($('recargos-sin-plazo')).toBeNull()
  })

  it('Cobros emitidos lo muestra', () => {
    const p = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx'), 'utf8')
    expect(p).toContain('<RecargosSinPlazo />')
  })
})

describe('B-09/N-28 · «Configurar recordatorios» salió de Cobros emitidos', () => {
  it('🔴 no hay engranaje ni cajón de recordatorios; se va a Cobranza › Recordatorios', () => {
    const p = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx'), 'utf8')
    expect(p).not.toContain('<RecordatorioConfig')
    expect(p).not.toContain('data-testid="configuracion-de-cobros"')
    expect(p).toContain("'/panel/inmobiliaria/pagos/cobranza/recordatorios'")
  })
})
