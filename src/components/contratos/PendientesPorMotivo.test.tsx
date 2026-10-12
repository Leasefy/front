import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

import { PendientesPorMotivo } from './PendientesPorMotivo'

void React

function montar(props: Partial<React.ComponentProps<typeof PendientesPorMotivo>>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onSeguir = vi.fn()
  act(() => {
    root.render(
      <PendientesPorMotivo
        porMotivo={{}}
        seleccionando={null}
        onSeguir={onSeguir}
        onCrearInmuebles={() => {}}
        {...props}
      />,
    )
  })
  return { container, root, onSeguir }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('<PendientesPorMotivo> (T-0156)', () => {
  it('lista cada motivo con su número, su explicación y dónde se arregla', () => {
    const { container } = montar({
      porMotivo: { consecutivo_repetido: 19, inmueble_codigo: 10, inmueble_en_venta: 4, canon: 2, uso: 5 },
    })
    const t = container.textContent ?? ''
    expect(t).toContain('19 contratos')
    expect(t).toContain('10 contratos')
    expect(t).toContain('4 contratos')
    expect(t).toContain('2 contratos')
    expect(container.querySelector('[data-testid="pendientes-consecutivo_repetido"]')).toBeTruthy()
    expect(container.querySelector('[data-testid="pendientes-canon"]')?.textContent).toContain(
      'Se escribe en cada fila',
    )
    // uso y propietario ya los muestra el bloque de arriba.
    expect(container.querySelector('[data-testid="pendientes-uso"]')).toBeNull()
  })

  it('el reparto ofrece la acción en bloque y avisa cuál', () => {
    const { container, onSeguir } = montar({ porMotivo: { reparto_del_canon: 1 } })
    const b = container.querySelector('[data-testid="seguir-reparto_del_canon"]') as HTMLButtonElement
    expect(b.textContent).toContain('partes iguales')
    act(() => b.click())
    expect(onSeguir).toHaveBeenCalledWith('reparto_del_canon')
  })

  it('T-0163: el reparto de inquilinos se cuenta y dice que sólo se arregla en el archivo o descartando', () => {
    const { container } = montar({ porMotivo: { reparto_de_inquilinos: 2 } })
    const li = container.querySelector('[data-testid="pendientes-reparto_de_inquilinos"]')
    expect(li?.textContent).toContain('2 contratos')
    expect(li?.textContent).toContain('La plata por inquilino no cuadra')
    expect(li?.textContent).toContain('descarta')
    expect(container.querySelector('[data-testid="seguir-reparto_de_inquilinos"]')).toBeNull()
  })

  it('sin motivos no pinta nada', () => {
    const { container } = montar({ porMotivo: undefined })
    expect(container.querySelector('[data-testid="pendientes-por-motivo"]')).toBeNull()
  })
})
