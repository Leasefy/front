/** `procesosApi.anotar`: lo que manda el navegador cabe en el back (20-10-2026). */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn(async () => ({}))
vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...a: unknown[]) => post(...(a as [])) , get: vi.fn() },
  ApiError: class extends Error {},
  fetchConSesion: vi.fn(),
}))

import { procesosApi } from './procesos.service'

beforeEach(() => post.mockClear())

describe('procesosApi.anotar', () => {
  it('recorta cada texto a su columna, quita lo vacío y descarta el renglón sin título', async () => {
    await procesosApi.anotar('p-1', [
      { estado: 'OK', titulo: '  Ana   Ruiz ', detalle: '', motivo: null, montoCop: 2_350_000.5, recurso: { tipo: 'COBRO', id: 'c-1' } },
      { estado: 'FALLO', titulo: '   ', motivo: 'no cuenta' },
      { estado: 'FALLO', titulo: 'x'.repeat(400), motivo: 'm'.repeat(1200), montoCop: Number.NaN },
    ])
    expect(post).toHaveBeenCalledTimes(1)
    const [url, cuerpo] = post.mock.calls[0] as unknown as [string, { renglones: Record<string, unknown>[] }]
    expect(url).toBe('/inmobiliaria/procesos/p-1/renglones')
    expect(cuerpo.renglones).toHaveLength(2)
    expect(cuerpo.renglones[0]).toEqual({
      estado: 'OK',
      titulo: 'Ana Ruiz',
      montoCop: 2_350_000.5,
      recurso: { tipo: 'COBRO', id: 'c-1' },
    })
    expect((cuerpo.renglones[1].titulo as string).length).toBe(300)
    expect((cuerpo.renglones[1].motivo as string).length).toBe(1000)
    expect(cuerpo.renglones[1]).not.toHaveProperty('montoCop')
  })

  it('parte de a 500 (el tope del back por llamada)', async () => {
    const muchos = Array.from({ length: 1201 }, (_, i) => ({ estado: 'OK' as const, titulo: `Fila ${i}` }))
    await procesosApi.anotar('p-1', muchos)
    expect(post.mock.calls.map((c) => ((c as unknown as [string, { renglones: unknown[] }])[1].renglones.length))).toEqual([500, 500, 201])
  })
})
