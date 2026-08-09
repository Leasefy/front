/**
 * Tests de useTablePagination.
 *
 * Los dos casos que importan no son «cortar el array»: son los que dejan la
 * tabla mostrando vacío sobre datos que sí existen — cambiar de filtro estando
 * en la página 4, o que un refresh traiga menos filas.
 *
 * Patrón de montaje: createRoot + act, igual que el resto de los tests de
 * hooks del repo (no hay @testing-library acá).
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { useTablePagination, type UseTablePaginationResult } from './use-table-pagination'

void React // jsx-preserve

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

const filas = (n: number) => Array.from({ length: n }, (_, i) => `fila-${i + 1}`)

type Result = { current: UseTablePaginationResult<string> | null }

function render(items: string[], resetKey?: string, initialPageSize = 10): Result {
  const result: Result = { current: null }
  function Wrapper({ items, resetKey }: { items: string[]; resetKey?: string }) {
    result.current = useTablePagination(items, { initialPageSize, resetKey })
    return null
  }
  act(() => {
    root.render(<Wrapper items={items} resetKey={resetKey} />)
  })
  return result
}

function rerender(items: string[], resetKey?: string, initialPageSize = 10) {
  function Wrapper({ items, resetKey }: { items: string[]; resetKey?: string }) {
    useTablePagination(items, { initialPageSize, resetKey })
    return null
  }
  act(() => {
    root.render(<Wrapper items={items} resetKey={resetKey} />)
  })
}

describe('useTablePagination', () => {
  it('devuelve sólo la página actual y el total completo', () => {
    const r = render(filas(24))
    expect(r.current?.pageItems).toHaveLength(10)
    expect(r.current?.pageItems[0]).toBe('fila-1')
    expect(r.current?.total).toBe(24)
    expect(r.current?.shouldPaginate).toBe(true)
  })

  it('la última página trae el resto, no un bloque completo', () => {
    const r = render(filas(24))
    act(() => r.current?.setPage(3))
    expect(r.current?.pageItems).toEqual(['fila-21', 'fila-22', 'fila-23', 'fila-24'])
  })

  it('con todo a la vista no hay que paginar', () => {
    const r = render(filas(7))
    expect(r.current?.shouldPaginate).toBe(false)
  })

  it('cambiar el tamaño de página vuelve a la primera', () => {
    const r = render(filas(100))
    act(() => r.current?.setPage(5))
    act(() => r.current?.setPageSize(25))
    expect(r.current?.page).toBe(1)
    expect(r.current?.pageItems).toHaveLength(25)
  })

  it('cambiar de filtro vuelve a la página 1', () => {
    const result: Result = { current: null }
    function Wrapper({ items, resetKey }: { items: string[]; resetKey: string }) {
      result.current = useTablePagination(items, { initialPageSize: 10, resetKey })
      return null
    }

    act(() => {
      root.render(<Wrapper items={filas(100)} resetKey="todos" />)
    })
    act(() => result.current?.setPage(4))
    expect(result.current?.page).toBe(4)

    // Filtro nuevo con menos filas: sin el reset, la página 4 quedaba vacía y
    // se leía como «no hay nada».
    act(() => {
      root.render(<Wrapper items={filas(12)} resetKey="incumplidas" />)
    })
    expect(result.current?.page).toBe(1)
    expect(result.current?.pageItems[0]).toBe('fila-1')
  })

  it('si el total encoge por debajo de la página actual, reencuadra', () => {
    const result: Result = { current: null }
    function Wrapper({ items }: { items: string[] }) {
      result.current = useTablePagination(items, { initialPageSize: 10 })
      return null
    }

    act(() => {
      root.render(<Wrapper items={filas(100)} />)
    })
    act(() => result.current?.setPage(9))

    // Refresh con muchas menos filas, mismo filtro (no hay resetKey).
    act(() => {
      root.render(<Wrapper items={filas(15)} />)
    })
    expect(result.current?.page).toBe(2)
    expect(result.current?.pageItems).toHaveLength(5)
  })

  it('sin filas no revienta y no ofrece paginar', () => {
    const r = render([])
    expect(r.current?.pageItems).toEqual([])
    expect(r.current?.total).toBe(0)
    expect(r.current?.page).toBe(1)
    expect(r.current?.shouldPaginate).toBe(false)
  })

  it('rerender con las mismas filas no mueve la página', () => {
    const r = render(filas(50))
    act(() => r.current?.setPage(3))
    rerender(filas(50))
    expect(r.current?.page).toBe(3)
  })
})
