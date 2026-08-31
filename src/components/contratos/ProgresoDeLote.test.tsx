import * as React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { ProgresoDeLote } from './ProgresoDeLote'
import type { EstadoDeLote } from '@/lib/api/contracts.service'

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
  vi.restoreAllMocks()
})

function render(props: React.ComponentProps<typeof ProgresoDeLote>) {
  act(() => {
    root.render(<ProgresoDeLote {...props} />)
  })
}

const base: EstadoDeLote = {
  lote: 'lote-1',
  estado: 'PROCESANDO',
  total: 10,
  procesadas: 4,
  pendientes: 0,
  listos: 0,
  activados: 0,
  descartados: 0,
  jobId: null,
  error: null,
}

/**
 * Ítem 1 del brief WU-4: mostrar progreso mientras el usuario elige
 * esperar, y hacer explícito que irse es seguro (el lote es durable
 * server-side, WU-2). El sondeo es una conveniencia, nunca el mecanismo de
 * finalización — por eso el mensaje de "podés cerrar esta pestaña" es
 * obligatorio, no cosmético.
 */
describe('<ProgresoDeLote>', () => {
  it('muestra el progreso procesadas/total cuando está PROCESANDO', () => {
    render({ estado: base, agotado: false })
    expect(container.textContent).toContain('4')
    expect(container.textContent).toContain('10')
  })

  it('nunca renderiza la lista de trabajo — sólo progreso', () => {
    render({ estado: base, agotado: false })
    expect(container.querySelector('[data-testid="lista-de-trabajo"]')).toBeNull()
  })

  it('deja explícito que cerrar la pestaña es seguro', () => {
    render({ estado: base, agotado: false })
    expect(container.textContent?.toLowerCase()).toContain('cerrar')
  })

  it('sin estado todavía (primer sondeo en vuelo), no crashea y no muestra un progreso inventado', () => {
    render({ estado: null, agotado: false })
    expect(container.textContent).not.toContain('undefined')
    expect(container.textContent).not.toContain('NaN')
  })

  it('agotado (10 min sin LISTO/FALLIDO): explica que sigue procesando del lado del servidor', () => {
    render({ estado: base, agotado: true })
    expect(container.textContent?.toLowerCase()).toMatch(/tardando|más tiempo/)
  })

  it('estado FALLIDO: muestra el error, nunca un progreso', () => {
    render({
      estado: { ...base, estado: 'FALLIDO', error: 'No pudimos preparar la migración.' },
      agotado: false,
    })
    expect(container.textContent).toContain('No pudimos preparar la migración.')
    expect(container.textContent).not.toContain('4')
  })
})
