/**
 * report-serve.schema.test.ts — el validador de report-serve v1.
 *
 * Dos familias: (1) la respuesta sintética entra y las variantes rotas no; (2)
 * la fixture COMPARTIDA con el micro (`report-serve.sample.json`, la escribe el
 * otro agente) pasa por el validador y por `buildLandingView` — se salta con
 * aviso si todavía no existe.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { FIXTURE_SLUG } from './fixture-muestra'
import { buildLandingView } from './landing-layout'
import { SECTION_ORDER } from './report-model'
import { buildServedFixture, servedFixtureJson } from './report-serve.fixture'
import { parseReportServeResponse } from './report-serve.schema'

/**
 * La fixture COMPARTIDA con el micro: la genera `buildSampleServeResponse` en
 * `src/avaluo/report-serve/sample-serve-response.ts` del micro (repo `avaluo`)
 * y se copia acá tal cual. Si el contrato cambia, se regenera allá y se vuelve
 * a copiar — nunca se edita a mano.
 */
const SAMPLE_JSON_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'report-serve.sample.json')

/** Muta un JSON plano en un camino dado; devuelve la copia. */
function withPath(json: unknown, path: readonly (string | number)[], value: unknown): unknown {
  const copy = JSON.parse(JSON.stringify(json)) as Record<string, unknown>
  let cursor: Record<string, unknown> = copy
  for (const key of path.slice(0, -1)) {
    cursor = cursor[String(key)] as Record<string, unknown>
  }
  const last = path[path.length - 1]
  if (value === undefined) delete cursor[String(last)]
  else cursor[String(last)] = value
  return copy
}

describe('parseReportServeResponse — la respuesta sintética', () => {
  it('acepta la vista servida y devuelve una vista tipada con render', () => {
    const result = parseReportServeResponse(servedFixtureJson())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.sample).toBe(false)
    expect(result.view.render.seal.state).toBe('valid')
    expect(result.view.render.qr.size).toBe(21)
    expect(result.view.order).toEqual([...SECTION_ORDER])
    expect(Object.keys(result.view.sections)).toHaveLength(39)
  })

  it('el JSON parseado es deep-equal a la vista de origen (JSON puro)', () => {
    const view = buildServedFixture()
    const result = parseReportServeResponse(JSON.parse(JSON.stringify(view)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view).toEqual(view)
  })

  it('normaliza ítems del anexo que llegan con `key` en vez de `src`', () => {
    const json = servedFixtureJson()
    // El anexo del certificado actual es prose · media · prose: el bloque de
    // medios es el segundo.
    const mutated = withPath(json, ['sections', 'anexo-fotografico', 'blocks', 1, 'items'], [
      { key: 'avaluo/abc/uuid-fachada.jpg', caption: 'Fachada' },
      { src: 'https://cdn.test/x.jpg', alt: 'x', caption: null },
    ])
    const result = parseReportServeResponse(mutated)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const media = result.view.sections['anexo-fotografico'].blocks[1]
    expect(media.kind).toBe('media')
    if (media.kind !== 'media') return
    expect(media.items[0]).toEqual({
      src: 'avaluo/abc/uuid-fachada.jpg',
      alt: 'Fachada',
      caption: 'Fachada',
    })
    expect(media.items[1].src).toBe('https://cdn.test/x.jpg')
  })

  it('acepta sample:true cuando lo declara el servidor (la fixture compartida viene así)', () => {
    const result = parseReportServeResponse(withPath(servedFixtureJson(), ['sample'], true))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.sample).toBe(true)
  })

  const broken: [string, unknown][] = [
    ['schema distinto', withPath(servedFixtureJson(), ['schema'], 'report-v2')],
    ['sin render', withPath(servedFixtureJson(), ['render'], undefined)],
    ['sin render.seal', withPath(servedFixtureJson(), ['render', 'seal'], undefined)],
    ['render.seal.state fuera del enum', withPath(servedFixtureJson(), ['render', 'seal', 'state'], 'ok')],
    ['certContentHash que no es sha256 hex', withPath(servedFixtureJson(), ['render', 'seal', 'certContentHash'], 'abc')],
    ['qr con filas de otro largo', withPath(servedFixtureJson(), ['render', 'qr', 'rows', 3], '101')],
    ['qr con menos filas que size', withPath(servedFixtureJson(), ['render', 'qr', 'size'], 22)],
    ['nowIso ilegible', withPath(servedFixtureJson(), ['render', 'nowIso'], 'ayer')],
    ['una sección ausente', withPath(servedFixtureJson(), ['sections', 'niif13'], undefined)],
    ['una sección con id que no coincide con su clave', withPath(servedFixtureJson(), ['sections', 'niif13', 'id'], 'vigencia')],
    ['order con una sección menos', withPath(servedFixtureJson(), ['order'], SECTION_ORDER.slice(1))],
    ['order reordenado', withPath(servedFixtureJson(), ['order'], [...SECTION_ORDER].reverse())],
    ['un bloque con kind desconocido', withPath(servedFixtureJson(), ['sections', 'vigencia', 'blocks', 0, 'kind'], 'html')],
    ['meta.paywallCtaHref ausente', withPath(servedFixtureJson(), ['meta', 'paywallCtaHref'], undefined)],
    ['audiencia inventada', withPath(servedFixtureJson(), ['audience'], 'public')],
    ['no es un objeto', 'texto'],
    ['null', null],
  ]

  it.each(broken)('rechaza: %s', (_label, json) => {
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('los problemas describen la forma, no copian valores del documento', () => {
    const result = parseReportServeResponse(
      withPath(servedFixtureJson(), ['render', 'seal', 'signedBy'], 12345),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.join('\n')).toContain('render.seal.signedBy')
    expect(result.issues.join('\n')).not.toContain('12345')
  })
})

describe('parseReportServeResponse — delivery (T-0007)', () => {
  it('sin delivery en el JSON ⇒ parsea igual, delivery queda undefined', () => {
    const json = withPath(servedFixtureJson(), ['delivery'], undefined)
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.delivery).toBeUndefined()
  })

  it('con delivery completo y released:true ⇒ lo parsea tal cual', () => {
    const delivery = {
      signoffState: 'entregado',
      released: true,
      canDownloadPdf: true,
      canVerify: true,
      canExport: true,
      estimateNotice: null,
    }
    const json = withPath(servedFixtureJson(), ['delivery'], delivery)
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.delivery).toEqual(delivery)
  })

  it('con delivery completo y released:false ⇒ lo parsea con el aviso', () => {
    const delivery = {
      signoffState: 'en_revisión',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: 'Documento preliminar.',
    }
    const json = withPath(servedFixtureJson(), ['delivery'], delivery)
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.delivery).toEqual(delivery)
  })

  it('signoffState con un valor futuro no reconocido NO tumba el parseo (no es z.enum)', () => {
    const delivery = {
      signoffState: 'un-estado-que-todavia-no-existe',
      released: false,
      canDownloadPdf: false,
      canVerify: false,
      canExport: false,
      estimateNotice: 'x',
    }
    const json = withPath(servedFixtureJson(), ['delivery'], delivery)
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.delivery?.signoffState).toBe('un-estado-que-todavia-no-existe')
  })

  it.each([
    ['released no booleano', { ...{ signoffState: 'firmado', released: 'sí', canDownloadPdf: false, canVerify: false, canExport: false, estimateNotice: null } }],
    ['falta canVerify', { signoffState: 'firmado', released: true, canDownloadPdf: true, canExport: true, estimateNotice: null }],
    ['delivery no es un objeto', 'released'],
  ])('delivery roto (%s) ⇒ degrada a undefined, NUNCA tumba el resto del payload', (_label, broken) => {
    const json = withPath(servedFixtureJson(), ['delivery'], broken)
    const result = parseReportServeResponse(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.view.delivery).toBeUndefined()
    // El resto del payload sigue intacto: esto NUNCA es un 404 de todo el informe.
    expect(result.view.meta.slug.length).toBeGreaterThan(0)
    expect(Object.keys(result.view.sections)).toHaveLength(39)
  })
})

describe('report-serve.sample.json — la fixture compartida con el micro', () => {
  const exists = existsSync(SAMPLE_JSON_PATH)

  it.skipIf(!exists)('pasa por el validador y por buildLandingView', () => {
    const json: unknown = JSON.parse(readFileSync(SAMPLE_JSON_PATH, 'utf8'))
    const result = parseReportServeResponse(json)
    if (!result.ok) {
      // Que el fallo diga QUÉ no encaja, no sólo que no encaja.
      throw new Error(`report-serve.sample.json no valida:\n${result.issues.join('\n')}`)
    }
    const { view } = result
    expect(view.render.seal.state).toBe('valid')
    expect(view.render.seal.chainStatus).toBe('VIGENTE')
    expect(view.render.qr.rows).toHaveLength(view.render.qr.size)
    expect(view.render.seal.verifyUrl).toBe(view.meta.verifyUrl)

    const landing = buildLandingView(view)
    expect(landing.chapters).toHaveLength(6)
    expect(landing.render).not.toBeNull()
    const sealSection = landing.chapters
      .flatMap((c) => c.sections)
      .find((s) => s.node.id === 'sello-verificacion')
    expect(sealSection?.node.blocks.some((b) => b.kind === 'seal')).toBe(true)
  })

  it.skipIf(!exists)(
    'no trae `delivery` (T-0007): regresión fail-closed — es la fixture de referencia de que un micro sin delivery deja el informe en modo más restrictivo',
    () => {
      const json: unknown = JSON.parse(readFileSync(SAMPLE_JSON_PATH, 'utf8'))
      const result = parseReportServeResponse(json)
      if (!result.ok) throw new Error(`report-serve.sample.json no valida:\n${result.issues.join('\n')}`)
      expect(result.view.delivery).toBeUndefined()
    },
  )

  if (!exists) {
    it('todavía no existe: se salta el test de adaptación', () => {
      console.warn(
        `[report-serve] ${SAMPLE_JSON_PATH} no existe todavía; el test de adaptación se saltó (la fixture sintética cubre el contrato mientras tanto).`,
      )
      expect(FIXTURE_SLUG.length).toBeGreaterThan(0)
    })
  }
})
