/**
 * DocVignette.test.tsx — checklist document vignette (standalone `VG.doc`,
 * `landing-standalone/index.html` ~L3716-3720). Structure/wiring only.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { DocVignette } from './DocVignette'
import type { DocVignetteData } from '@/lib/landing/types'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

const DATA: DocVignetteData = {
  title: 'CT-1042 · Apto 402',
  lines: ['3 visitas · oferta aceptada', 'Estudio del inquilino aprobado', 'Documentos completos'],
}

describe('<DocVignette>', () => {
  it('renders the document title as a heading', () => {
    act(() => {
      root.render(<DocVignette data={DATA} />)
    })
    expect(container.querySelector('[data-testid="vg-doc"] h4')?.textContent).toBe('CT-1042 · Apto 402')
  })

  it('renders one line per data.lines entry', () => {
    act(() => {
      root.render(<DocVignette data={DATA} />)
    })
    const lines = container.querySelectorAll('[data-testid="vg-doc"] .landing-vg-doc__lines span')
    expect(lines).toHaveLength(3)
    expect(lines[1].textContent).toBe('Estudio del inquilino aprobado')
  })
})
