/**
 * report-view.data.test.ts — la capa de datos del informe, con el fetch mockeado.
 *
 * Lo que se prueba es el contrato de acceso, no el servicio: a qué URL se pega
 * y con qué, que TODO fallo (404/429/503/red/JSON inválido/forma inválida)
 * termina en el mismo `null`, que la muestra sólo responde a su slug fuera de
 * producción, y que la vista servida sale con las fotos resueltas y el paywall
 * respetado — sin que la URL pueda moverle el pago.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FIXTURE_SLUG } from './fixture-muestra'
import { SECTION_ORDER } from './report-model'
import { servedFixtureJson } from './report-serve.fixture'
import {
  getReportView,
  reportServeUrl,
  resolveAvaluoApiBase,
  resolveMediaUrls,
} from './report-view.data'

const BASE = 'https://micro.test'
const SLUG = '0f7c2b1a-1111-4222-8333-444455556666'
const TOKEN = 'cap.token/with=chars'

type FetchMock = ReturnType<typeof vi.fn>

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function servedFor(slug: string, overrides: Parameters<typeof servedFixtureJson>[0] = {}): unknown {
  const json = servedFixtureJson(overrides) as { meta: { slug: string } }
  json.meta.slug = slug
  return json
}

let fetchMock: FetchMock

beforeEach(() => {
  vi.stubEnv('AVALUO_API_URL', BASE)
  vi.stubEnv('NEXT_PUBLIC_AVALUO_API_URL', '')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resolveAvaluoApiBase / reportServeUrl', () => {
  it('prefiere AVALUO_API_URL (server-only) y cae a NEXT_PUBLIC_AVALUO_API_URL', () => {
    expect(resolveAvaluoApiBase()).toBe(BASE)
    vi.stubEnv('AVALUO_API_URL', '')
    vi.stubEnv('NEXT_PUBLIC_AVALUO_API_URL', 'https://public.test/')
    expect(resolveAvaluoApiBase()).toBe('https://public.test')
    vi.stubEnv('NEXT_PUBLIC_AVALUO_API_URL', '')
    expect(resolveAvaluoApiBase()).toBeNull()
  })

  it('arma la URL con slug y token escapados, como certificateUrl()', () => {
    expect(reportServeUrl(BASE, 'a b', TOKEN)).toBe(
      `${BASE}/api/avaluo/report/a%20b?token=${encodeURIComponent(TOKEN)}`,
    )
  })
})

describe('getReportView — vista servida', () => {
  it('200 válido ⇒ la vista, con render y sin overrides de la URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor(SLUG)))

    const view = await getReportView({ slug: SLUG, token: TOKEN })

    expect(view).not.toBeNull()
    expect(view?.sample).toBe(false)
    expect(view?.audience).toBe('owner')
    expect(view?.paid).toBe(true)
    expect(view?.shareNotice).toBeNull()
    expect(view?.render?.seal.state).toBe('valid')
    expect(view?.meta.slug).toBe(SLUG)
    expect(view?.order).toEqual([...SECTION_ORDER])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(reportServeUrl(BASE, SLUG, TOKEN))
    expect(init.cache).toBe('no-store')
  })

  it('un 200 por OTRO slug no se pinta', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor('otro-slug')))
    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
  })

  it.each([404, 429, 503, 500])('%s ⇒ null, la misma salida neutral', async (status) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'x' }, status))
    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
  })

  it('red caída ⇒ null', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
  })

  it('JSON inválido ⇒ null', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }))
    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
  })

  it('JSON con forma inválida ⇒ null (y el aviso no copia valores)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = servedFor(SLUG) as { render?: unknown }
    delete broken.render
    fetchMock.mockResolvedValueOnce(jsonResponse(broken))

    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
    expect(warn).toHaveBeenCalled()
    expect(JSON.stringify(warn.mock.calls)).not.toContain('Torre DEMO')
  })

  it('sin token no viaja al servicio y responde null', async () => {
    expect(await getReportView({ slug: SLUG, token: null })).toBeNull()
    expect(await getReportView({ slug: SLUG, token: '  ' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin base URL configurada responde null sin salir a la red', async () => {
    vi.stubEnv('AVALUO_API_URL', '')
    vi.stubEnv('NEXT_PUBLIC_AVALUO_API_URL', '')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await getReportView({ slug: SLUG, token: TOKEN })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('paid:false del servidor ⇒ red de seguridad: ningún peso sale aunque él lo dejara', async () => {
    // El servidor dice «sin pago» pero deja el titular sin proyectar.
    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor(SLUG, { paid: false })))
    const view = await getReportView({ slug: SLUG, token: TOKEN })

    expect(view?.paid).toBe(false)
    const texto = JSON.stringify(view?.sections)
    expect(texto).not.toContain('519853230')
    expect(texto).not.toContain('467867907')
    // Y el sello sigue, sin valor ni banda.
    const seal = view?.sections['sello-verificacion'].blocks.find((b) => b.kind === 'seal')
    expect(seal?.kind).toBe('seal')
    if (seal?.kind === 'seal') {
      expect(seal.value).toBeNull()
      expect(seal.band).toBeNull()
    }
  })

  it('la CTA de pago la construye este repo desde render.submissionId; con pago no hay CTA', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(servedFor(SLUG, { paid: false, render: { submissionId: 'sub-0001' } })),
    )
    const sinPago = await getReportView({ slug: SLUG, token: TOKEN })
    expect(sinPago?.meta.paywallCtaHref).toBe('/avaluo/estado/sub-0001')

    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor(SLUG, { paid: true })))
    const pagado = await getReportView({ slug: SLUG, token: TOKEN })
    expect(pagado?.meta.paywallCtaHref).toBeNull()
  })

  it('cruza las fotos presignadas con el anexo y descarta lo que no resolvió', async () => {
    const json = servedFor(SLUG, {
      render: {
        photos: [
          { key: 'avaluo/x/uuid-fachada.jpg', url: 'https://s3.test/fachada?sig=1', expiresAtIso: '2026-08-17T20:30:00.000Z' },
        ],
      },
    }) as { sections: Record<string, { blocks: unknown[] }> }
    json.sections['anexo-fotografico'].blocks[0] = {
      kind: 'media',
      count: { raw: 3, format: 'int', origin: 'calculado', missing: false, missingText: null, pii: false },
      items: [
        { key: 'avaluo/x/uuid-fachada.jpg', caption: 'Fachada' },
        { key: 'avaluo/x/uuid-sin-firma.jpg', caption: 'Sala' },
        { src: 'https://cdn.test/ya-firmada.jpg', alt: 'Cocina', caption: 'Cocina' },
      ],
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(json))

    const view = await getReportView({ slug: SLUG, token: TOKEN })
    const media = view?.sections['anexo-fotografico'].blocks[0]
    expect(media?.kind).toBe('media')
    if (media?.kind !== 'media') return
    expect(media.items.map((i) => i.src)).toEqual([
      'https://s3.test/fachada?sig=1',
      'https://cdn.test/ya-firmada.jpg',
    ])
  })
})

describe('getReportView — delivery (T-0007)', () => {
  it('sin delivery en la respuesta ⇒ view.delivery queda undefined (no la tumba el paid-projection ni el media resolve)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor(SLUG)))
    const view = await getReportView({ slug: SLUG, token: TOKEN })
    expect(view?.delivery).toBeUndefined()
  })

  it('con delivery en la respuesta ⇒ llega intacto, aunque el pago proyecte la vista', async () => {
    const delivery = {
      signoffState: 'en_revisión',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: 'Aviso del productor.',
    }
    fetchMock.mockResolvedValueOnce(
      jsonResponse(servedFor(SLUG, { paid: false, delivery })),
    )
    const view = await getReportView({ slug: SLUG, token: TOKEN })
    expect(view?.delivery).toEqual(delivery)
    // La proyección por pago no lo toca: son ejes distintos.
    expect(view?.paid).toBe(false)
  })

  it('render nunca es null en una vista servida (lo exige el validador)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(servedFor(SLUG)))
    const view = await getReportView({ slug: SLUG, token: TOKEN })
    expect(view?.render).not.toBeNull()
    expect(view?.render.certificateId.length).toBeGreaterThan(0)
  })
})

describe('getReportView — sin muestra', () => {
  it('el slug de la muestra va al servicio como cualquier otro (no hay camino de fixture)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'report not found' }, 404))
    expect(await getReportView({ slug: FIXTURE_SLUG, token: TOKEN })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sin token no va a la red y responde null', async () => {
    expect(await getReportView({ slug: FIXTURE_SLUG, token: null })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resolveMediaUrls', () => {
  it('es idempotente y no toca los demás bloques', () => {
    const json = servedFixtureJson()
    const parsed = JSON.parse(JSON.stringify(json)) as Parameters<typeof resolveMediaUrls>[0]
    const once = resolveMediaUrls(parsed)
    const twice = resolveMediaUrls(once)
    expect(twice).toEqual(once)
    expect(once.sections['valor-estimado']).toEqual(parsed.sections['valor-estimado'])
  })
})
