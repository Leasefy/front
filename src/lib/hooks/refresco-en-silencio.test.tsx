/**
 * El refresco automático no pasa la pantalla por «cargando».
 *
 * 🔴 Nico, 05-10-2026, en Contratos: «se carga y se va y se queda en líneas y
 * luego vuelve y carga». Cuando algo modificaba contratos (desde esta pantalla
 * o desde otra), `useRefrescoAutomatico` llamaba al `fetch` de la lista, que
 * prendía `isLoading`: los cuatro números pasaban a «—» y volvían a contar
 * desde cero. Ahora el refresco automático va en silencio: lo de la pantalla
 * se queda hasta que llega lo nuevo, y si falla se queda lo que había.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { contratos, arriendos } = vi.hoisted(() => ({
  contratos: { getMine: vi.fn() },
  arriendos: { getMine: vi.fn() },
}))

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: contratos,
  esContratoSinDocumento: () => false,
}))
vi.mock('@/lib/api/leases.service', () => ({ leasesApi: arriendos }))

import { useContracts } from './useContracts'
import { useLeases } from './useLeases'
import { invalidar, _reiniciar } from '@/lib/api/refresco-de-datos'

const contrato = (id: string, status = 'active') => ({ id, status }) as never
const arriendo = (id: string) => ({ id, status: 'active', monthlyRent: 1_000_000 }) as never

let root: Root | null = null
let vistos: Array<{ cargando: boolean; total: number | string }> = []

function SondaDeContratos() {
  const { stats, isLoading, error } = useContracts()
  vistos.push({ cargando: isLoading, total: isLoading || error ? '—' : stats.total })
  return null
}
function SondaDeArriendos() {
  const { stats, isLoading } = useLeases()
  vistos.push({ cargando: isLoading, total: isLoading ? '—' : stats.activeLeases })
  return null
}

async function montar(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(el)
  })
  await act(async () => {})
}

beforeEach(() => {
  _reiniciar()
  vistos = []
  contratos.getMine.mockReset()
  arriendos.getMine.mockReset()
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('refresco automático en silencio', () => {
  it('🔴 Contratos: cuando otro modifica contratos, los números NO pasan por «—»', async () => {
    contratos.getMine.mockResolvedValueOnce([contrato('a'), contrato('b')])
    await montar(<SondaDeContratos />)
    expect(vistos.at(-1)).toEqual({ cargando: false, total: 2 })

    let soltar!: (v: unknown) => void
    contratos.getMine.mockReturnValueOnce(new Promise((r) => (soltar = r)))
    const desde = vistos.length
    await act(async () => invalidar('contracts'))

    // Mientras llega lo nuevo, se sigue viendo lo de antes.
    expect(vistos.slice(desde).every((v) => v.total === 2 && !v.cargando)).toBe(true)

    await act(async () => soltar([contrato('a'), contrato('b'), contrato('c', 'draft')]))
    expect(vistos.at(-1)).toEqual({ cargando: false, total: 3 })
    expect(vistos.slice(desde).some((v) => v.total === '—')).toBe(false)
  })

  it('si el refresco automático falla, se queda lo que había (no «—», no lista vacía)', async () => {
    contratos.getMine.mockResolvedValueOnce([contrato('a')])
    await montar(<SondaDeContratos />)
    contratos.getMine.mockRejectedValueOnce(new Error('caído'))
    await act(async () => invalidar('contratos'))
    await act(async () => {})
    expect(vistos.at(-1)).toEqual({ cargando: false, total: 1 })
  })

  it('la primera carga sí muestra «cargando»', async () => {
    let soltar!: (v: unknown) => void
    contratos.getMine.mockReturnValueOnce(new Promise((r) => (soltar = r)))
    await montar(<SondaDeContratos />)
    expect(vistos.at(-1)).toEqual({ cargando: true, total: '—' })
    await act(async () => soltar([contrato('a')]))
    expect(vistos.at(-1)).toEqual({ cargando: false, total: 1 })
  })

  it('Arriendos: lo mismo cuando cambian contratos o cobros', async () => {
    arriendos.getMine.mockResolvedValueOnce([arriendo('x')])
    await montar(<SondaDeArriendos />)
    let soltar!: (v: unknown) => void
    arriendos.getMine.mockReturnValueOnce(new Promise((r) => (soltar = r)))
    const desde = vistos.length
    await act(async () => invalidar('cobros'))
    expect(vistos.slice(desde).every((v) => v.total === 1 && !v.cargando)).toBe(true)
    await act(async () => soltar([arriendo('x'), arriendo('y')]))
    expect(vistos.at(-1)).toEqual({ cargando: false, total: 2 })
  })
})
