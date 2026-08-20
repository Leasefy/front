/**
 * report-serve.fixture.ts — una respuesta de report-serve v1 SINTÉTICA, sólo
 * para tests.
 *
 * ⚠️ NO es la fixture de la landing (`fixture-muestra.ts`, que es `sample:true`
 * y sin `render`). Esto es la MISMA vista de muestra vestida como si la hubiera
 * servido el micro: `sample:false`, `verifyUrl` absoluta y habilitada, y un
 * `render` con sello `valid` / `VIGENTE`, un QR determinístico y sin fotos.
 * Sirve para probar el validador, la capa de datos y la tarjeta del sello hasta
 * que exista `report-serve.sample.json` (que la reemplaza en el test de
 * adaptación, ver `report-serve.schema.test.ts`).
 *
 * Ningún módulo de producción debe importar esto.
 */

import { FIXTURE_SLUG, FIXTURE_VIEW } from './fixture-muestra'
import type {
  ReportRender,
  ReportRenderQr,
  ReportRenderSeal,
  ReportSectionNode,
  ReportWebView,
  SealBlock,
  SectionId,
} from './report-model'
import type { DeliveryCapabilities, ReportServeResponse } from './report-serve.schema'

export const SERVED_VERIFY_BASE = 'https://verify.portofino.test/verify'
export const SERVED_VERIFY_URL = `${SERVED_VERIFY_BASE}/${FIXTURE_SLUG}`
export const SERVED_NOW_ISO = '2026-08-17T20:15:00.000Z'
export const SERVED_HASH = '3f9a41c7d20b8e6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7081'

/**
 * Una matriz cuadrada determinística con pinta de QR (tres «ojos» y un patrón
 * pseudoaleatorio estable). No es un QR legible: acá sólo importa la forma.
 */
export function syntheticQr(size = 21): ReportRenderQr {
  // Un «ojo» de 7×7: anillo exterior oscuro, anillo claro, núcleo 3×3 oscuro.
  const finder = (x: number, y: number): boolean =>
    x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)

  const rows: string[] = []
  for (let y = 0; y < size; y += 1) {
    let row = ''
    for (let x = 0; x < size; x += 1) {
      let dark: boolean
      if (x < 7 && y < 7) dark = finder(x, y)
      else if (x >= size - 7 && y < 7) dark = finder(x - (size - 7), y)
      else if (x < 7 && y >= size - 7) dark = finder(x, y - (size - 7))
      else dark = (x * 7 + y * 13 + x * y) % 5 < 2
      row += dark ? '1' : '0'
    }
    rows.push(row)
  }
  return { size, rows }
}

export function servedSeal(overrides: Partial<ReportRenderSeal> = {}): ReportRenderSeal {
  return {
    state: 'valid',
    tamperVerdict: 'valido',
    chainStatus: 'VIGENTE',
    supersededBy: null,
    certContentHash: SERVED_HASH,
    issuer: 'Portofino',
    signedAtIso: '2026-08-14T15:22:00.000Z',
    expiresAtIso: '2027-08-14T15:22:00.000Z',
    signedBy: 'Revisor de Muestra (demo)',
    methods: ['comparación de mercado'],
    verifyUrl: SERVED_VERIFY_URL,
    ...overrides,
  }
}

export function servedRender(overrides: Partial<ReportRender> = {}): ReportRender {
  return {
    nowIso: SERVED_NOW_ISO,
    submissionId: '00000000-0000-4000-8000-0000000000f1',
    certificateId: '00000000-0000-4000-8000-0000000000c1',
    seal: servedSeal(),
    qr: syntheticQr(),
    photos: [],
    ...overrides,
  }
}

function withRealSeal(node: ReportSectionNode): ReportSectionNode {
  return {
    ...node,
    blocks: node.blocks.map((block) => {
      if (block.kind !== 'seal') return block
      const seal: SealBlock = {
        ...block,
        certContentHashCorto: SERVED_HASH.slice(0, 12),
        verifyUrl: SERVED_VERIFY_URL,
        verifyUrlEnabled: true,
        note: null,
      }
      return seal
    }),
  }
}

/**
 * Un `delivery` (T-0007) listo para las pruebas: released, todo permitido,
 * sin aviso. Acepta overrides — p. ej. `servedDelivery({ released: false, ... })`
 * para el modo observe-only.
 */
export function servedDelivery(overrides: Partial<DeliveryCapabilities> = {}): DeliveryCapabilities {
  return {
    signoffState: 'entregado',
    released: true,
    canDownloadPdf: true,
    canVerify: true,
    canExport: true,
    estimateNotice: null,
    ...overrides,
  }
}

/**
 * La vista de muestra servida «de verdad»: `sample:false`, sello habilitado y
 * `render` presente. Acepta overrides de primer nivel, de `render` y de
 * `delivery` (T-0007) — `delivery` NO es parte de `ReportWebView` (D-1), así
 * que se trata aparte igual que `render`. Sin override queda `undefined`
 * (ausente), el mismo estado que la fixture compartida `report-serve.sample.json`.
 */
export function buildServedFixture(
  overrides: Partial<Omit<ReportWebView, 'render'>> & {
    readonly render?: Partial<ReportRender>
    readonly delivery?: DeliveryCapabilities
  } = {},
): ReportServeResponse {
  const { render, delivery, ...rest } = overrides
  const sections: Record<SectionId, ReportSectionNode> = {
    ...FIXTURE_VIEW.sections,
    'sello-verificacion': withRealSeal(FIXTURE_VIEW.sections['sello-verificacion']),
  }
  return {
    ...FIXTURE_VIEW,
    meta: {
      ...FIXTURE_VIEW.meta,
      verifyUrl: SERVED_VERIFY_URL,
      verifyUrlEnabled: true,
      paywallCtaHref: `/avaluo/pago/${FIXTURE_SLUG}`,
    },
    sample: false,
    sections,
    ...rest,
    render: servedRender(render),
    delivery,
  }
}

/** El JSON tal como llegaría por la red: sin `undefined`, sin prototipos. */
export function servedFixtureJson(
  overrides: Parameters<typeof buildServedFixture>[0] = {},
): unknown {
  return JSON.parse(JSON.stringify(buildServedFixture(overrides)))
}
