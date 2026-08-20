/**
 * landing-layout.test.ts — la partición es el invariante.
 *
 * Si esta suite pasa, es imposible que la landing pierda una sección del
 * informe o que pinte una dos veces. Es el único gate que tiene ese hecho: el
 * orden canónico y el layout de presentación son dos literales separados y nada
 * más los ata.
 */

import { describe, expect, it } from 'vitest'
import {
  LANDING_CHAPTERS,
  buildLandingView,
  deriveChapterChips,
  deriveDocStatus,
  deriveHeroBand,
  deriveHeroStats,
  resolveFiller,
  resolveTreatment,
  rowSectionIds,
  rowSpan,
} from './landing-layout'
import { FIXTURE_VIEW } from './fixture-muestra'
import { SCOPE_DISCLAIMER_SECTION_ID, SECTION_ORDER } from './report-model'
import { toPaidProjection, toSharedProjection } from './audience'
import { buildServedFixture } from './report-serve.fixture'

/** Reloj fijo para todo lo temporal: 3 días después de la emisión de la muestra. */
const NOW_ISO = '2026-08-17T12:00:00.000Z'

const allRefs = LANDING_CHAPTERS.flatMap((chapter) => chapter.sections)

describe('LANDING_CHAPTERS — partición de SECTION_ORDER', () => {
  it('cubre exactamente las 39 secciones del orden canónico', () => {
    expect(new Set(allRefs.map((ref) => ref.id))).toEqual(new Set(SECTION_ORDER))
  })

  it('no repite ninguna sección', () => {
    const ids = allRefs.map((ref) => ref.id)
    expect(ids.length).toBe(new Set(ids).size)
    expect(ids.length).toBe(SECTION_ORDER.length)
  })

  it('declara seis capítulos con id único', () => {
    const ids = LANDING_CHAPTERS.map((chapter) => chapter.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
  })
})

describe('LANDING_CHAPTERS — el bento (rows) es una segunda partición, sin huecos', () => {
  it('cada fila suma exactamente 12 columnas', () => {
    for (const chapter of LANDING_CHAPTERS) {
      for (const row of chapter.rows) {
        expect(rowSpan(row), `${chapter.id}: ${rowSectionIds(row).join(',')}`).toBe(12)
      }
    }
  })

  it('las filas de cada capítulo cubren exactamente sus secciones, una vez cada una', () => {
    for (const chapter of LANDING_CHAPTERS) {
      const inRows = chapter.rows.flatMap(rowSectionIds)
      const declared = chapter.sections.map((ref) => ref.id)
      expect(inRows.length, chapter.id).toBe(new Set(inRows).size)
      expect(new Set(inRows), chapter.id).toEqual(new Set(declared))
    }
  })

  it('las 39 secciones aparecen exactamente una vez en el conjunto de filas', () => {
    const all = LANDING_CHAPTERS.flatMap((chapter) => chapter.rows.flatMap(rowSectionIds))
    expect(all).toHaveLength(SECTION_ORDER.length)
    expect(new Set(all)).toEqual(new Set(SECTION_ORDER))
  })

  it('el disclaimer de alcance ocupa una fila entera y no va dentro de un grupo', () => {
    const b1 = LANDING_CHAPTERS.find((c) => c.id === 'b1')
    const row = b1?.rows.find((r) => rowSectionIds(r).includes(SCOPE_DISCLAIMER_SECTION_ID))
    expect(row?.cells).toHaveLength(1)
    expect(row?.cells[0].kind).toBe('section')
    expect(row?.cells[0].span).toBe(12)
  })
})

describe('resolveTreatment', () => {
  it('nunca colapsa el disclaimer de alcance, en ninguna audiencia', () => {
    const node = FIXTURE_VIEW.sections[SCOPE_DISCLAIMER_SECTION_ID]

    for (const audience of ['owner', 'shared'] as const) {
      expect(
        resolveTreatment({ id: SCOPE_DISCLAIMER_SECTION_ID, treatment: 'colapsado' }, node, {
          audience,
        }),
      ).toBe('destacado')
    }
  })

  it('sube «usos-documento» a destacado sólo en la vista compartida', () => {
    const node = FIXTURE_VIEW.sections['usos-documento']
    const ref = { id: 'usos-documento', treatment: 'normal' } as const

    expect(resolveTreatment(ref, node, { audience: 'owner' })).toBe('normal')
    expect(resolveTreatment(ref, node, { audience: 'shared' })).toBe('destacado')
  })

  it('despliega una sección degradada por falta de dato, pero deja plegado un «no aplica»', () => {
    const sinDato = FIXTURE_VIEW.sections['aspectos-complementarios']
    const noAplica = FIXTURE_VIEW.sections['indicativo-venta']

    expect(
      resolveTreatment({ id: 'aspectos-complementarios', treatment: 'colapsado' }, sinDato, {
        audience: 'owner',
      }),
    ).toBe('normal')

    expect(
      resolveTreatment({ id: 'indicativo-venta', treatment: 'colapsado' }, noAplica, {
        audience: 'owner',
      }),
    ).toBe('colapsado')
  })

  it('despliega una sección restringida por falta de pago: un candado plegado no se ve', () => {
    const sinPago = toPaidProjection(FIXTURE_VIEW, false)
    const node = sinPago.sections.niif13

    // `niif13` es `owner`, así que no se restringe; el caso real es una `paid`
    // que además estuviera declarada colapsada.
    expect(node.state).toBe('ok')

    const restringida = sinPago.sections['indicativo-venta']
    expect(
      resolveTreatment({ id: 'indicativo-venta', treatment: 'colapsado' }, restringida, {
        audience: 'owner',
      }),
    ).toBe('normal')
  })
})

describe('derivados del panel', () => {
  it('la tira del héroe saca sus cinco métricas de las secciones que las producen', () => {
    const stats = deriveHeroStats(FIXTURE_VIEW, NOW_ISO)
    const byId = Object.fromEntries(stats.map((s) => [s.id, s]))

    expect(stats).toHaveLength(5)
    expect(byId.confianza.value).toBe('MEDIA')
    expect(byId.confianza.anchor).toBe('nivel-confianza')
    expect(byId.cobertura.value).toBe('80 %')
    expect(byId.vigencia.value).toBe('362 d')
    expect(byId.regimen.value).toBe('COMPETITIVO')
    expect(byId.exposicion.value).toBe('60–90 d')
  })

  it('sin pago, lo que depende del número sale null y no se reconstruye desde otro lado', () => {
    const stats = deriveHeroStats(toPaidProjection(FIXTURE_VIEW, false), NOW_ISO)
    const byId = Object.fromEntries(stats.map((s) => [s.id, s]))

    expect(byId.cobertura.value).toBeNull()
    // Lo que no depende del número sigue.
    expect(byId.vigencia.value).toBe('362 d')
    expect(byId.exposicion.value).toBe('60–90 d')
    expect(JSON.stringify(stats)).not.toContain('519')
  })

  it('la banda del héroe sale de la figura de valor-estimado (sin ticks: el certificado ya no publica los comparables), y sin pago desaparece', () => {
    const band = deriveHeroBand(FIXTURE_VIEW)
    expect(band).not.toBeNull()
    expect(band?.low).toBe(467867907)
    expect(band?.high).toBe(571838553)
    expect(band?.point).toBe(519853230)
    expect(band?.subjectArea).toBe(78)
    expect(band?.ticks).toEqual([])

    expect(deriveHeroBand(toPaidProjection(FIXTURE_VIEW, false))).toBeNull()
  })

  it('el estado del documento sale del meta en la muestra y del sello real cuando lo hay', () => {
    expect(deriveDocStatus(FIXTURE_VIEW, NOW_ISO)).toMatchObject({
      chain: 'VIGENTE',
      daysLeft: 362,
      label: 'VIGENTE · 362 d',
    })
    expect(deriveDocStatus(FIXTURE_VIEW, '2028-01-01T00:00:00.000Z').chain).toBe('VENCIDO')

    const served = buildServedFixture()
    expect(deriveDocStatus(served, NOW_ISO).chain).toBe(served.render.seal.chainStatus)
    expect(deriveDocStatus(FIXTURE_VIEW, null).label).toBe('VIGENTE')
  })

  it('los chips de capítulo cuentan parciales, sin datos y bloqueadas', () => {
    const b2 = LANDING_CHAPTERS.find((c) => c.id === 'b2')!

    const chipsB2 = deriveChapterChips(b2, FIXTURE_VIEW.sections)
    expect(chipsB2.some((c) => c.tone === 'warning')).toBe(true)
    expect(chipsB2.some((c) => c.tone === 'critical')).toBe(true)

    const sinPago = toPaidProjection(FIXTURE_VIEW, false)
    expect(deriveChapterChips(b2, sinPago.sections).some((c) => c.tone === 'info')).toBe(true)
  })

  it('los rellenos derivan del dato real y devuelven null cuando no está', () => {
    const ctx = { meta: FIXTURE_VIEW.meta, nowIso: NOW_ISO }
    const vig = resolveFiller('vigencia-meter', FIXTURE_VIEW.sections.vigencia, ctx)
    expect(vig).toMatchObject({ kind: 'vigencia-meter', daysLeft: 362, totalDays: 365 })

    const sector = resolveFiller('sector-gauge', FIXTURE_VIEW.sections['descripcion-sector'], ctx)
    expect(sector).toMatchObject({ kind: 'sector-gauge', score: 68, max: 100 })

    const exp = resolveFiller('exposure-meter', FIXTURE_VIEW.sections['tiempo-exposicion'], ctx)
    expect(exp).toMatchObject({ kind: 'exposure-meter', low: 60, high: 90 })

    const split = resolveFiller(
      'split-donut',
      FIXTURE_VIEW.sections['valor-terreno-construccion'],
      ctx,
    )
    expect(split?.kind).toBe('split-donut')

    const div = resolveFiller(
      'divergence-gauge',
      FIXTURE_VIEW.sections['divergencia-referencia'],
      ctx,
    )
    expect(div?.kind).toBe('divergence-gauge')

    // Sin pago la sección de terreno/construcción queda restringida: sin relleno.
    const sinPago = toPaidProjection(FIXTURE_VIEW, false)
    expect(
      resolveFiller('split-donut', sinPago.sections['valor-terreno-construccion'], ctx),
    ).toBeNull()
    // Sin reloj no hay medidor de vigencia.
    expect(
      resolveFiller('vigencia-meter', FIXTURE_VIEW.sections.vigencia, { ...ctx, nowIso: null }),
    ).toBeNull()
  })
})

describe('buildLandingView', () => {
  it('renderiza cada sección exactamente una vez', () => {
    const view = buildLandingView(FIXTURE_VIEW)
    const ids = view.chapters.flatMap((chapter) => chapter.sections.map((s) => s.node.id))

    expect(ids).toHaveLength(SECTION_ORDER.length)
    expect(new Set(ids).size).toBe(SECTION_ORDER.length)
  })

  it('las filas renderizadas cubren las 39 una vez y traen los rellenos resueltos', () => {
    const view = buildLandingView(FIXTURE_VIEW, { nowIso: NOW_ISO })
    const ids = view.chapters.flatMap((chapter) =>
      chapter.rows.flatMap((row) =>
        row.cells.flatMap((cell) =>
          cell.kind === 'section' ? [cell.section.node.id] : cell.sections.map((s) => s.node.id),
        ),
      ),
    )
    expect(ids).toHaveLength(SECTION_ORDER.length)
    expect(new Set(ids)).toEqual(new Set(SECTION_ORDER))

    const vigencia = view.chapters[0].rows
      .flatMap((r) => r.cells)
      .find((c) => c.kind === 'section' && c.section.node.id === 'vigencia')
    expect(vigencia?.kind === 'section' && vigencia.filler?.kind).toBe('vigencia-meter')
    expect(view.nowIso).toBe(NOW_ISO)
    expect(view.status.chain).toBe('VIGENTE')
    expect(view.heroStats).toHaveLength(5)
  })

  it('con documento servido, el reloj es el del servidor y no el que le pasen', () => {
    const served = buildServedFixture()
    const view = buildLandingView(served, { nowIso: '2030-01-01T00:00:00.000Z' })
    expect(view.nowIso).toBe(served.render.nowIso)
  })

  it('marca como no plegable el disclaimer de alcance', () => {
    const view = buildLandingView(FIXTURE_VIEW)
    const disclaimer = view.chapters
      .flatMap((chapter) => chapter.sections)
      .find((section) => section.node.id === SCOPE_DISCLAIMER_SECTION_ID)

    expect(disclaimer).toBeDefined()
    expect(disclaimer?.collapsible).toBe(false)
    expect(disclaimer?.treatment).toBe('destacado')
  })

  it('propaga el aviso de caducidad de la vista compartida', () => {
    const shared = toSharedProjection(FIXTURE_VIEW, {
      expiresAtIso: '2026-09-16',
      sharedByLabel: 'el propietario',
    })
    const view = buildLandingView(shared)

    expect(view.audience).toBe('shared')
    expect(view.shareNotice?.expiresAtIso).toBe('2026-09-16')
  })
})
