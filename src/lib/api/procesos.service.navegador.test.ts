/**
 * El proceso del navegador en el cable (01-10-2026): lo que `procesosApi`
 * manda a `POST /inmobiliaria/procesos` y sus tres hermanas. `terminar` es
 * multipart, así que no pasa por `apiClient` sino por `fetchConSesion`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { post, fetchConSesion } = vi.hoisted(() => ({ post: vi.fn(), fetchConSesion: vi.fn() }))

vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  apiClient: { post, get: vi.fn() },
  fetchConSesion,
}))

import { ApiError } from '@/lib/api/client'
import { procesosApi } from './procesos.service'

beforeEach(() => {
  post.mockReset().mockResolvedValue({})
  fetchConSesion.mockReset()
})

describe('procesosApi — el proceso del navegador', () => {
  it('crear, avance y fallar mandan JSON con lo que el DTO del back acepta', async () => {
    await procesosApi.crear({ tipo: 'CARGA', titulo: 'Extracto', total: 12.7 })
    expect(post).toHaveBeenLastCalledWith('/inmobiliaria/procesos', { tipo: 'CARGA', titulo: 'Extracto', total: 12 })

    await procesosApi.crear({ tipo: 'EXPORTACION', titulo: 'x' })
    expect(post).toHaveBeenLastCalledWith('/inmobiliaria/procesos', { tipo: 'EXPORTACION', titulo: 'x' })

    await procesosApi.avance('p-1', { hechos: 3, mensaje: '3 de 10' })
    expect(post).toHaveBeenLastCalledWith('/inmobiliaria/procesos/p-1/avance', { hechos: 3, mensaje: '3 de 10' })

    await procesosApi.fallar('p-1', 'Se cayó la red.')
    expect(post).toHaveBeenLastCalledWith('/inmobiliaria/procesos/p-1/fallar', { mensaje: 'Se cayó la red.' })
  })

  it('terminar manda multipart con el archivo en el campo `archivo` y los textos', async () => {
    fetchConSesion.mockResolvedValue(new Response(JSON.stringify({ id: 'p-1', estado: 'TERMINADO' }), { status: 200 }))
    const blob = new Blob(['a;b'], { type: 'text/csv' })
    const vista = await procesosApi.terminar('p-1', {
      archivo: blob,
      nombreDelArchivo: 'propietarios.csv',
      mensaje: '2 filas',
      titulo: 'Propietarios (CSV)',
    })
    expect(vista).toEqual({ id: 'p-1', estado: 'TERMINADO' })
    const [url, init] = fetchConSesion.mock.calls[0]!
    expect(url).toMatch(/\/inmobiliaria\/procesos\/p-1\/terminar$/)
    expect(init.method).toBe('POST')
    const form = init.body as FormData
    expect((form.get('archivo') as File).name).toBe('propietarios.csv')
    expect(form.get('mensaje')).toBe('2 filas')
    expect(form.get('titulo')).toBe('Propietarios (CSV)')
  })

  it('terminar sin archivo no manda el campo; un error del back sale como ApiError con su código', async () => {
    fetchConSesion.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Ese proceso no existe.', code: 'NOT_FOUND' }), { status: 404 }),
    )
    const error = await procesosApi.terminar('p-9', { mensaje: 'Listo' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: 'Ese proceso no existe.', code: 'NOT_FOUND' })
    const form = fetchConSesion.mock.calls[0]![1].body as FormData
    expect(form.has('archivo')).toBe(false)
  })
})
