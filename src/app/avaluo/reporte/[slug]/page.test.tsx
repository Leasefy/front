/**
 * page.test.tsx — la cáscara de ruta /avaluo/reporte/[slug].
 *
 * Lo que se prueba acá es el contrato de la ruta, no el diseño: el `noindex`,
 * el 404 simétrico, que TODO sale del servicio (sin bandera, sin muestra, sin
 * overrides por URL) y que la vista llega armada al componente. El render del
 * documento vive en `ReporteAvaluoShell.test.tsx`.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundError()
  },
}))

vi.mock('@/components/avaluo/reporte/ReporteAvaluoShell', () => ({
  ReporteAvaluoShell: ({
    view,
    downloadHref,
    capabilities,
  }: {
    view: { chapters: { id: string }[]; paid: boolean }
    downloadHref?: string | null
    capabilities?: { released: boolean; canDownloadPdf: boolean; estimateNotice: string | null }
  }) => (
    <div
      data-testid="reporte-shell"
      data-chapters={String(view.chapters.length)}
      data-paid={String(view.paid)}
      data-download-href={downloadHref ?? ''}
      data-released={String(capabilities?.released)}
      data-can-download-pdf={String(capabilities?.canDownloadPdf)}
      data-estimate-notice={capabilities?.estimateNotice ?? ''}
    />
  ),
}))

import ReporteAvaluoPage, { metadata } from './page'
import { FIXTURE_SLUG } from '@/lib/avaluo/reporte/fixture-muestra'
import { servedFixtureJson, servedDelivery } from '@/lib/avaluo/reporte/report-serve.fixture'

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
  vi.restoreAllMocks()
})

/** Un servicio que responde el JSON servido para `slug` (mock de `fetch`). */
function stubService(
  slug: string,
  overrides: Parameters<typeof servedFixtureJson>[0] = {},
): ReturnType<typeof vi.fn> {
  vi.stubEnv('AVALUO_API_URL', 'https://micro.test')
  const json = servedFixtureJson(overrides) as { meta: { slug: string } }
  json.meta.slug = slug
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(json), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function call(slug: string, query: Record<string, string> = {}) {
  return ReporteAvaluoPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(query),
  })
}

describe('/avaluo/reporte/[slug] — metadata', () => {
  it('no se indexa: lleva datos del inmueble y de su dueño', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

describe('/avaluo/reporte/[slug] — siempre encendida, siempre por el servicio', () => {
  it('sin ?token= responde 404 sin ir al servicio, sin decir por qué', async () => {
    const fetchMock = stubService('doc-real-0000')
    try {
      await expect(call('doc-real-0000')).rejects.toBeInstanceOf(NotFoundError)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('el slug de la muestra NO tiene camino propio: va al servicio como cualquier otro', async () => {
    vi.stubEnv('AVALUO_API_URL', 'https://micro.test')
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"report not found"}', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    try {
      await expect(call(FIXTURE_SLUG, { token: 'cap-token' })).rejects.toBeInstanceOf(NotFoundError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('con ?token= y el servicio respondiendo, arma la vista servida', async () => {
    const slug = 'doc-real-0001'
    const fetchMock = stubService(slug)
    try {
      // `pago=pendiente` NO puede mover el pago de un documento real.
      const ui = await call(slug, { token: 'cap-token', pago: 'pendiente' })
      act(() => {
        root.render(ui)
      })
      const shell = container.querySelector('[data-testid="reporte-shell"]')
      expect(shell?.getAttribute('data-chapters')).toBe('6')
      expect(shell?.getAttribute('data-paid')).toBe('true')
      expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
        'https://micro.test/api/avaluo/report/doc-real-0001?token=cap-token',
      )
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('con el servicio respondiendo 404 la ruta no existe, sin decir por qué', async () => {
    vi.stubEnv('AVALUO_API_URL', 'https://micro.test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"error":"report not found"}', { status: 404 })),
    )
    try {
      await expect(call('doc-real-0002', { token: 'cap-token' })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('?vista= y ?pago= no existen: la audiencia y el pago los decide el servicio', async () => {
    const slug = 'doc-real-0003'
    stubService(slug)
    try {
      const ui = await call(slug, { token: 'cap-token', vista: 'compartida', pago: 'pendiente' })
      act(() => {
        root.render(ui)
      })
      expect(
        container.querySelector('[data-testid="reporte-shell"]')?.getAttribute('data-paid'),
      ).toBe('true')
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})

describe('/avaluo/reporte/[slug] — capabilities y downloadHref (T-0007)', () => {
  it('delivery released + canDownloadPdf:true ⇒ downloadHref apunta a la PDF route (E2), no a certificate', async () => {
    const slug = 'doc-real-0010'
    stubService(slug, { delivery: servedDelivery() })
    try {
      const ui = await call(slug, { token: 'cap-token' })
      act(() => {
        root.render(ui)
      })
      const shell = container.querySelector('[data-testid="reporte-shell"]')
      const href = shell?.getAttribute('data-download-href') ?? ''
      expect(href).toMatch(/\/api\/avaluo\/report\/doc-real-0010\/pdf\?token=cap-token/)
      expect(href).not.toContain('/certificate')
      expect(shell?.getAttribute('data-released')).toBe('true')
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('delivery ausente ⇒ downloadHref null y capabilities denegadas (fallback pinneado)', async () => {
    const slug = 'doc-real-0011'
    stubService(slug)
    try {
      const ui = await call(slug, { token: 'cap-token' })
      act(() => {
        root.render(ui)
      })
      const shell = container.querySelector('[data-testid="reporte-shell"]')
      expect(shell?.getAttribute('data-download-href')).toBe('')
      expect(shell?.getAttribute('data-released')).toBe('false')
      expect(shell?.getAttribute('data-can-download-pdf')).toBe('false')
      expect(shell?.getAttribute('data-estimate-notice')).toContain('Documento preliminar')
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('delivery released pero canDownloadPdf:false (sin pago) ⇒ downloadHref null igual', async () => {
    const slug = 'doc-real-0012'
    stubService(slug, { delivery: servedDelivery({ canDownloadPdf: false }) })
    try {
      const ui = await call(slug, { token: 'cap-token' })
      act(() => {
        root.render(ui)
      })
      const shell = container.querySelector('[data-testid="reporte-shell"]')
      expect(shell?.getAttribute('data-download-href')).toBe('')
      expect(shell?.getAttribute('data-released')).toBe('true')
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })

  it('con token pero sin delivery.canDownloadPdf, ningún token viaja en el HTML vía downloadHref', async () => {
    const slug = 'doc-real-0013'
    stubService(slug)
    try {
      const ui = await call(slug, { token: 'secreto-del-dueno' })
      act(() => {
        root.render(ui)
      })
      const shell = container.querySelector('[data-testid="reporte-shell"]')
      expect(shell?.getAttribute('data-download-href') ?? '').not.toContain('secreto-del-dueno')
    } finally {
      vi.unstubAllGlobals()
      vi.unstubAllEnvs()
    }
  })
})
