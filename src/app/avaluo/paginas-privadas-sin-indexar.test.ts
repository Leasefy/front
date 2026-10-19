import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))

const NO_INDEXAR = { index: false, follow: false }

describe('private avaluo pages emit noindex', () => {
  it('report page', async () => {
    const mod = await import('./reporte/[slug]/page')
    expect(mod.metadata?.robots).toEqual(NO_INDEXAR)
  })
  it('verification page', async () => {
    const mod = await import('./verificar/[slug]/page')
    expect(mod.metadata?.robots).toEqual(NO_INDEXAR)
  })
  it('status page (client component, metadata lives in its layout)', async () => {
    const mod = await import('./estado/[submissionId]/layout')
    expect(mod.metadata?.robots).toEqual(NO_INDEXAR)
  })
})
