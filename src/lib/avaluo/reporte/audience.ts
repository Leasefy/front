/**
 * audience.ts — la proyección por pago, aplicada ANTES de renderizar.
 *
 * 🔴 DÓNDE VIVE ESTO DE VERDAD. En el diseño (REPORT-MODEL-v1.md §3.8, INV-10)
 * la proyección se aplica **en el servidor que emite el modelo**, antes de
 * cualquier serialización que salga de él: un JSON con valor, banda,
 * comparables y ajustes esquiva el paywall aunque el PDF siga protegido. Con el
 * servicio cableado (report-serve v1) **el servicio ya devuelve la vista
 * proyectada**; esta función es la red de seguridad que `getReportView()`
 * aplica igual sobre `paid:false` (y la única defensa sobre la fixture local).
 * Nunca al revés.
 *
 * Qué hace `toPaidProjection(view, false)`:
 *
 *  1. Las secciones `visibility:'paid'` se sustituyen por un nodo `degraded`
 *     con `reason:'restringido'`, CONSERVANDO posición y título. La landing
 *     muestra el esqueleto completo con overlay y CTA, no un documento mutilado.
 *  2. En lo que queda visible, **ningún peso sale sin pago**: los escalares de
 *     formato `cop`/`copPerM2` se marcan como restringidos y las figuras que
 *     dibujan el número (banda, split, precios por m²) se retiran.
 *
 * El punto 2 es lo que cierra el paywall de verdad. Sin él quedan tres fugas
 * medidas sobre el material de diseño:
 *   · `resumen-ejecutivo` imprime el titular y la banda en texto plano;
 *   · `nivel-confianza` publica la banda numérica al dibujar su figura;
 *   · el sello — que es `public` — lleva `valueCop` y `banda` dentro.
 *
 * ⚠️ Esto NO cierra el hallazgo de fondo: el verificador público `/verify/<slug>`
 * expone valor y banda a quien tenga el slug, y el slug viaja impreso en el QR
 * del PDF. Eso se decide en el servicio, no acá.
 */

import type {
  BandSpec,
  ReportBlock,
  ReportSectionNode,
  ReportWebView,
  Scalar,
  SectionId,
} from './report-model'

/** El texto del hueco cuando la razón es la falta de pago. Contrato de bytes. */
export const RESTRICTED_TEXT = 'Disponible con el informe completo'

/** Lo que se le dice al lector que hay detrás del pago, por sección. */
const RESTRICTED_MISSING: Readonly<Partial<Record<SectionId, readonly string[]>>> = {
  'resumen-ejecutivo': ['la estimación', 'el rango de confianza'],
  'valor-estimado': ['la estimación', 'el rango de confianza', 'el valor en letras'],
  'identificacion-predio': ['la dirección exacta', 'los identificadores catastrales'],
  'aspectos-legales': ['la matrícula inmobiliaria', 'el código catastral (CHIP)'],
  'descripcion-inmueble': ['la ficha completa del inmueble'],
  'aspectos-complementarios': ['los aspectos legales y físicos complementarios'],
  'indicativo-venta': ['el indicativo de valor de venta'],
  'valor-terreno-construccion': ['el reparto entre terreno y construcción'],
  'homogenizacion-igac': ['la cadena estadística completa'],
  'conciliacion-metodos': ['la conciliación entre métodos'],
  'anexo-fotografico': ['el anexo fotográfico'],
}

const COP_FORMATS: ReadonlySet<Scalar['format']> = new Set(['cop', 'copPerM2'])

/** true ⇒ este escalar publica un peso y no puede salir sin pago. */
function isMoney(scalar: Scalar): boolean {
  return COP_FORMATS.has(scalar.format)
}

function redactScalar(scalar: Scalar): Scalar {
  if (!isMoney(scalar) || scalar.missing) return scalar
  return { ...scalar, raw: null, missing: true, missingText: RESTRICTED_TEXT }
}

function redactBand(band: BandSpec | null): BandSpec | null {
  if (band === null) return null
  return {
    ...band,
    low: redactScalar(band.low),
    high: redactScalar(band.high),
    lowWords: null,
    highWords: null,
  }
}

/**
 * Retira la plata de un bloque que por lo demás sigue visible. Devuelve `null`
 * cuando el bloque entero deja de tener sentido sin el número (las figuras).
 */
function redactBlock(block: ReportBlock): ReportBlock | null {
  switch (block.kind) {
    case 'headline':
      return {
        ...block,
        value: redactScalar(block.value),
        words: null,
        band: redactBand(block.band),
      }
    case 'keyValues':
      return {
        ...block,
        rows: block.rows.map((row) => ({ ...row, value: redactScalar(row.value) })),
      }
    case 'table':
      return {
        ...block,
        rows: block.rows.map((row) => ({
          ...row,
          cells: Object.fromEntries(
            Object.entries(row.cells).map(([key, cell]) => [key, redactScalar(cell)]),
          ),
          detail: row.detail === null ? null : (redactBlock(row.detail) as typeof row.detail),
        })),
      }
    case 'verdict':
      return { ...block, metric: block.metric === null ? null : redactScalar(block.metric) }
    case 'statChain':
      return {
        ...block,
        steps: block.steps.map((step) => ({
          ...step,
          value: step.value === null ? null : redactScalar(step.value),
          // `note` es la línea ya renderizada por el emisor y lleva la cifra
          // adentro: sin pago no se imprime.
          note: null,
        })),
      }
    case 'seal':
      return { ...block, value: null, band: null }
    case 'figure':
      // La banda, el reparto y la nube de precios SON el número dibujado.
      return block.figure.type === 'rangeDays' || block.figure.type === 'divergence' ? block : null
    case 'prose':
    case 'bulletList':
    case 'placeholder':
    case 'media':
      return block
  }
}

function restrictSection(node: ReportSectionNode): ReportSectionNode {
  return {
    ...node,
    state: 'degraded',
    gaps: [],
    blocks: [
      {
        kind: 'placeholder',
        text: RESTRICTED_TEXT,
        reason: 'restringido',
        severity: 'restricted',
        missing: RESTRICTED_MISSING[node.id] ?? [],
      },
    ],
    // La nota legal se conserva: es prosa fija y no publica el número.
    legalNote: node.legalNote,
  }
}

/**
 * Aplica el pago sobre la vista. `paid === true` la devuelve intacta;
 * `paid === false` es la paridad web del watermark del PDF.
 */
export function toPaidProjection(view: ReportWebView, paid: boolean): ReportWebView {
  if (paid) return { ...view, paid: true }

  const sections = Object.fromEntries(
    (Object.entries(view.sections) as [SectionId, ReportSectionNode][]).map(([id, node]) => {
      if (node.visibility === 'paid') return [id, restrictSection(node)]
      const blocks = node.blocks
        .map(redactBlock)
        .filter((b): b is ReportBlock => b !== null)
      return [id, { ...node, blocks }]
    }),
  ) as Record<SectionId, ReportSectionNode>

  return { ...view, paid: false, sections }
}

/**
 * La vista compartida: igual que la del dueño salvo por lo que ya resuelve
 * `resolveTreatment` (usos-documento sube a destacado) y por el aviso de
 * caducidad. Acá sólo se sella la audiencia y el aviso; **no** se toca el
 * contenido, porque un tercero con enlace válido ve lo mismo que el dueño.
 *
 * Lo que la vista compartida NO tiene, y por eso no se construye: el panel de
 * compartir. Un banco no puede re-compartir el informe de otro.
 */
export function toSharedProjection(
  view: ReportWebView,
  notice: ReportWebView['shareNotice'],
): ReportWebView {
  return { ...view, audience: 'shared', shareNotice: notice }
}
