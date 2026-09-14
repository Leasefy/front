/**
 * InmueblesPage — la lista del backoffice para abrir el historial interno de
 * riesgo de un inmueble.
 *
 * createRoot + act (convención del repo, sin RTL). Mockea `listarInmuebles` y
 * `next/navigation`: la URL es el estado (`q`, `agencyId`, `page`), así que lo
 * que se verifica es qué pide al back y a qué URL manda cada acción.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { InmuebleAdminRow } from '@/lib/admin/inmuebles'
import type { Paginated } from '@/lib/admin/types'

void React

const listarInmuebles = vi.fn()
const push = vi.fn()
const replace = vi.fn()
const state = { search: '' }

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/admin/inmuebles',
  useSearchParams: () => new URLSearchParams(state.search),
}))

vi.mock('@/lib/admin/inmuebles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admin/inmuebles')>()),
  listarInmuebles: (query: unknown, signal?: AbortSignal) => listarInmuebles(query, signal),
}))

import InmueblesPage from './page'

function fila(over: Partial<InmuebleAdminRow> = {}): InmuebleAdminRow {
  return {
    id: 'inm-1',
    code: 42,
    externalId: 'A-42',
    address: 'Calle Falsa 123',
    city: 'Envigado',
    status: 'RENTED',
    agencia: { id: 'ag-1', name: 'Inmobiliaria de prueba' },
    contratos: 6,
    activos: 1,
    reparaciones: 2,
    ...over,
  }
}

function pagina(rows: InmuebleAdminRow[], total = rows.length): Paginated<InmuebleAdminRow> {
  return { data: rows, total, page: 0, pageSize: 50 }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  state.search = ''
  listarInmuebles.mockReset()
  push.mockReset()
  replace.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  container.remove()
})

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(<InmueblesPage />)
  })
}

describe('InmueblesPage', () => {
  it('pide la primera página sin filtros y pinta cada inmueble con sus conteos', async () => {
    listarInmuebles.mockResolvedValue(pagina([fila(), fila({ id: 'inm-2', code: 43, externalId: null, agencia: null, contratos: 0, activos: 0, reparaciones: 0, status: 'AVAILABLE' })], 2))
    await mount()

    expect(listarInmuebles).toHaveBeenCalledWith({ q: '', agencyId: '', page: 0 }, expect.any(AbortSignal))
    const texto = container.textContent ?? ''
    expect(texto).toContain('2 inmuebles')
    expect(texto).toContain('Calle Falsa 123')
    expect(texto).toContain('Inmobiliaria de prueba')
    expect(texto).toContain('Arrendado')
    expect(texto).toContain('6 · 1 act.')
    expect(texto).toContain('(sin inmobiliaria)')
    expect(texto).toContain('Disponible')
  })

  it('abrir una fila lleva al historial de ese inmueble', async () => {
    listarInmuebles.mockResolvedValue(pagina([fila()]))
    await mount()

    const tr = container.querySelector('tbody tr') as HTMLTableRowElement
    await act(async () => {
      tr.click()
    })
    expect(push).toHaveBeenCalledWith('/admin/inmuebles/inm-1')
  })

  it('buscar escribe `q` en la URL y limpiar la borra', async () => {
    listarInmuebles.mockResolvedValue(pagina([fila()]))
    await mount()

    const input = container.querySelector('input[type="search"]') as HTMLInputElement
    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, ' daikiry ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(replace).toHaveBeenLastCalledWith('/admin/inmuebles?q=daikiry')
  })

  it('con `q` en la URL la manda al back y ofrece limpiarla', async () => {
    state.search = 'q=2848'
    listarInmuebles.mockResolvedValue(pagina([]))
    await mount()

    expect(listarInmuebles).toHaveBeenCalledWith({ q: '2848', agencyId: '', page: 0 }, expect.any(AbortSignal))
    expect(container.textContent).toContain('Nada coincide con «2848»')

    const limpiar = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Limpiar')
    await act(async () => {
      limpiar?.click()
    })
    expect(replace).toHaveBeenLastCalledWith('/admin/inmuebles')
  })

  it('tocar la inmobiliaria de una fila acota la lista a esa inmobiliaria, sin abrir la fila', async () => {
    listarInmuebles.mockResolvedValue(pagina([fila()]))
    await mount()

    const boton = Array.from(container.querySelectorAll('tbody button')).find(
      (b) => b.textContent === 'Inmobiliaria de prueba',
    ) as HTMLButtonElement
    await act(async () => {
      boton.click()
    })
    expect(replace).toHaveBeenLastCalledWith('/admin/inmuebles?agencyId=ag-1')
    expect(push).not.toHaveBeenCalled()
  })

  it('con el filtro de inmobiliaria puesto muestra la píldora con su nombre para quitarlo', async () => {
    state.search = 'agencyId=ag-1'
    listarInmuebles.mockResolvedValue(pagina([fila()]))
    await mount()

    expect(listarInmuebles).toHaveBeenCalledWith({ q: '', agencyId: 'ag-1', page: 0 }, expect.any(AbortSignal))
    const pildora = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.startsWith('sólo Inmobiliaria de prueba'),
    )
    expect(pildora).toBeTruthy()
  })

  it('muestra el error del back sin pantalla en blanco', async () => {
    listarInmuebles.mockRejectedValue(new Error('NEXT_PUBLIC_ADMIN_API_URL is not configured'))
    await mount()
    expect(container.textContent).toContain('NEXT_PUBLIC_ADMIN_API_URL is not configured')
  })
})
