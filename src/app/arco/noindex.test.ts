import { describe, it, expect, vi } from 'vitest'

vi.mock('./inmobiliaria-del-formulario', () => ({
  leerLaInmobiliaria: vi.fn(async () => ({ estado: 'no-existe' })),
  listarLasInmobiliarias: vi.fn(async () => []),
}))

const NOINDEX = { index: false, follow: false }

describe('ARCO pages are not indexable', { timeout: 30_000 }, () => {
  it('/arco', async () => {
    const { metadata } = await import('./page')
    expect(metadata.robots).toEqual(NOINDEX)
  })

  it('/arco/[inmobiliaria]', async () => {
    const { generateMetadata } = await import('./[inmobiliaria]/page')
    const m = await generateMetadata({ params: Promise.resolve({ inmobiliaria: 'x' }) })
    expect(m.robots).toEqual(NOINDEX)
  })

  it('/arco/verify/[token]', async () => {
    const { metadata } = await import('./verify/[token]/layout')
    expect(metadata.robots).toEqual(NOINDEX)
  })
})
