/**
 * QA-INQ I-30 (03-10-2026), el bloque «Respaldo del arriendo» del contrato
 * manual:
 *  · «Vigencia desde(opcional)»: al texto le faltaba el espacio;
 *  · «El análisis de este inquilino no trajo…» salía antes de elegir a nadie,
 *    en un contrato que no tiene análisis (no viene de una postulación).
 */
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { RespaldoDelArriendo } from './RespaldoDelArriendo'

let host: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
function montar(props: Partial<React.ComponentProps<typeof RespaldoDelArriendo>> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(<RespaldoDelArriendo valor={{ tipo: 'seguro' }} onCambio={() => {}} {...props} />)
  })
}

describe('RespaldoDelArriendo', () => {
  it('🔴 «Vigencia desde (opcional)», con su espacio en el texto', () => {
    montar()
    const etiqueta = host.querySelector('label[for="respaldo-desde"]')!
    expect(etiqueta.textContent).toBe('Vigencia desde (opcional)')
  })

  it('🔴 en el contrato manual (sin análisis) no habla del análisis del inquilino', () => {
    montar({ conAnalisis: false })
    expect(host.textContent).not.toContain('El análisis de este inquilino')
  })

  it('con postulación y sin lista de aseguradoras, sí lo dice (como antes)', () => {
    montar()
    expect(host.textContent).toContain('El análisis de este inquilino no trajo la lista de aseguradoras.')
  })
})
