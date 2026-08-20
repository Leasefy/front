/**
 * report-serve.schema.ts — el validador de la respuesta de report-serve v1.
 *
 * `GET {MICRO}/api/avaluo/report/[slug]?token=…` responde un `ReportWebView`
 * más `render` (sello real, QR como matriz, fotos presignadas, reloj). Este
 * archivo es lo que separa «un JSON que llegó por la red» de «una vista que la
 * landing puede pintar»: NUNCA `as` sobre datos del servidor. Cada esquema de
 * bloque está anotado como `z.ZodType<XBlock>`, así que TypeScript comprueba en
 * compilación que lo que sale del parser ES el tipo del modelo — si un campo se
 * agrega al modelo y no acá, no compila.
 *
 * Qué valida y qué no:
 *   · Estructura completa: schema, meta, `order` = `SECTION_ORDER` exacto, las
 *     39 secciones con su id, los 11 arquetipos de bloque, `render.seal`,
 *     `render.qr` (matriz cuadrada) y `render.photos`.
 *   · NO valida el contenido (que la banda envuelva al valor, que el hash sea el
 *     del PDF): eso lo hace el emisor y su verificador. Acá sólo se decide si el
 *     JSON tiene la forma que la landing sabe pintar.
 *
 * Los enums se declaran como arrays `as const` y se cotejan contra los tipos del
 * modelo en las dos direcciones (`satisfies` + `Exhaustive`), para que un valor
 * nuevo del modelo sin espejo acá tampoco compile.
 */

import { z } from 'zod'
import {
  SECTION_ORDER,
  type BlockEmphasis,
  type BulletListBlock,
  type CellAlign,
  type DataOrigin,
  type DegradationReason,
  type DegradationSeverity,
  type FigureBlock,
  type HeadlineBlock,
  type KeyValuesBlock,
  type MediaBlock,
  type PlaceholderBlock,
  type ProseBlock,
  type ReportAudience,
  type ReportRender,
  type ReportSectionNode,
  type ReportWebView,
  type Scalar,
  type SealBlock,
  type SealChainStatus,
  type SealTamperVerdict,
  type SealVerifyState,
  type SectionEmphasis,
  type SectionId,
  type SectionState,
  type SectionVisibility,
  type StatChainBlock,
  type TableBlock,
  type TableRow,
  type ValueFormat,
  type VerdictBlock,
  type VerdictTone,
} from './report-model'

// ---------------------------------------------------------------------------
// Enums espejo (cotejados contra el modelo en compilación)
// ---------------------------------------------------------------------------

/**
 * `true` sólo si `Values` cubre TODO `Union`. Se usa como
 * `const _: Exhaustive<Union, typeof ARRAY[number]> = true` — si al modelo se
 * le agrega un valor que acá falta, la asignación deja de compilar.
 */
type Exhaustive<Union, Values extends Union> = [Exclude<Union, Values>] extends [never]
  ? true
  : never

const VALUE_FORMATS = [
  'text',
  'cop',
  'copPerM2',
  'int',
  'bps',
  'pct2',
  'coverage',
  'dateIso',
  'days',
] as const satisfies readonly ValueFormat[]
const _valueFormats: Exhaustive<ValueFormat, (typeof VALUE_FORMATS)[number]> = true

const DATA_ORIGINS = [
  'usuario',
  'usuario_features',
  'declarado',
  'calculado',
  'catalogo',
  'no_verificado',
] as const satisfies readonly DataOrigin[]
const _dataOrigins: Exhaustive<DataOrigin, (typeof DATA_ORIGINS)[number]> = true

const BLOCK_EMPHASES = ['plain', 'note', 'warning', 'disclaimer'] as const satisfies readonly BlockEmphasis[]
const _blockEmphases: Exhaustive<BlockEmphasis, (typeof BLOCK_EMPHASES)[number]> = true

const VERDICT_TONES = ['positive', 'neutral', 'negative'] as const satisfies readonly VerdictTone[]
const _verdictTones: Exhaustive<VerdictTone, (typeof VERDICT_TONES)[number]> = true

const CELL_ALIGNS = ['left', 'right'] as const satisfies readonly CellAlign[]
const _cellAligns: Exhaustive<CellAlign, (typeof CELL_ALIGNS)[number]> = true

const DEGRADATION_REASONS = [
  'sin_productor',
  'columna_ausente',
  'no_aplica',
  'insuficiente',
  'rechazado',
  'restringido',
] as const satisfies readonly DegradationReason[]
const _degradationReasons: Exhaustive<DegradationReason, (typeof DEGRADATION_REASONS)[number]> = true

const DEGRADATION_SEVERITIES = [
  'no_data',
  'not_applicable',
  'not_computable',
  'restricted',
] as const satisfies readonly DegradationSeverity[]
const _degradationSeverities: Exhaustive<
  DegradationSeverity,
  (typeof DEGRADATION_SEVERITIES)[number]
> = true

const SECTION_VISIBILITIES = ['public', 'owner', 'paid'] as const satisfies readonly SectionVisibility[]
const _sectionVisibilities: Exhaustive<SectionVisibility, (typeof SECTION_VISIBILITIES)[number]> = true

const SECTION_EMPHASES = ['normal', 'disclaimer', 'headline'] as const satisfies readonly SectionEmphasis[]
const _sectionEmphases: Exhaustive<SectionEmphasis, (typeof SECTION_EMPHASES)[number]> = true

const SECTION_STATES = ['ok', 'partial', 'degraded'] as const satisfies readonly SectionState[]
const _sectionStates: Exhaustive<SectionState, (typeof SECTION_STATES)[number]> = true

const AUDIENCES = ['owner', 'shared'] as const satisfies readonly ReportAudience[]
const _audiences: Exhaustive<ReportAudience, (typeof AUDIENCES)[number]> = true

const SEAL_STATES = ['valid', 'altered', 'not_found', 'unavailable'] as const satisfies readonly SealVerifyState[]
const _sealStates: Exhaustive<SealVerifyState, (typeof SEAL_STATES)[number]> = true

const TAMPER_VERDICTS = ['valido', 'alterado', 'desconocido'] as const satisfies readonly SealTamperVerdict[]
const _tamperVerdicts: Exhaustive<SealTamperVerdict, (typeof TAMPER_VERDICTS)[number]> = true

const CHAIN_STATUSES = ['VIGENTE', 'VENCIDO', 'REEMPLAZADO'] as const satisfies readonly SealChainStatus[]
const _chainStatuses: Exhaustive<SealChainStatus, (typeof CHAIN_STATUSES)[number]> = true

// Las constantes `_x` existen sólo por su tipo; esto evita el aviso de «no usada».
void [
  _valueFormats,
  _dataOrigins,
  _blockEmphases,
  _verdictTones,
  _cellAligns,
  _degradationReasons,
  _degradationSeverities,
  _sectionVisibilities,
  _sectionEmphases,
  _sectionStates,
  _audiences,
  _sealStates,
  _tamperVerdicts,
  _chainStatuses,
]

// ---------------------------------------------------------------------------
// Escalares y bloques
// ---------------------------------------------------------------------------

const scalarSchema: z.ZodType<Scalar> = z.object({
  raw: z.union([z.number(), z.string(), z.null()]),
  format: z.enum(VALUE_FORMATS),
  origin: z.enum(DATA_ORIGINS),
  missing: z.boolean(),
  missingText: z.string().nullable(),
  pii: z.boolean(),
})

const proseBlockSchema = z.object({
  kind: z.literal('prose'),
  emphasis: z.enum(BLOCK_EMPHASES),
  paragraphs: z.array(z.string()),
  legalRef: z.string().nullable(),
  textVersion: z.string().nullable(),
})
const _prose: z.ZodType<ProseBlock> = proseBlockSchema

const keyValuesBlockSchema = z.object({
  kind: z.literal('keyValues'),
  rows: z.array(
    z.object({
      label: z.string(),
      value: scalarSchema,
      provenance: z.string().nullable(),
    }),
  ),
})
const _keyValues: z.ZodType<KeyValuesBlock> = keyValuesBlockSchema

const bulletListBlockSchema = z.object({
  kind: z.literal('bulletList'),
  emphasis: z.enum(BLOCK_EMPHASES),
  groups: z.array(
    z.object({
      heading: z.string().nullable(),
      marker: z.enum(['bullet', 'none', 'affirm', 'deny']),
      items: z.array(z.string()),
      emptyText: z.string().nullable(),
    }),
  ),
})
const _bulletList: z.ZodType<BulletListBlock> = bulletListBlockSchema

// La tabla es recursiva (el desglose por fila es otra tabla). `z.lazy` rompe el
// ciclo; la anotación explícita rompe el ciclo de INFERENCIA de TypeScript.
const tableRowSchema: z.ZodType<TableRow> = z.object({
  key: z.string(),
  cells: z.record(z.string(), scalarSchema),
  detail: z.lazy(() => tableBlockSchema).nullable(),
})

const tableBlockSchema = z.object({
  kind: z.literal('table'),
  columns: z.array(
    z.object({
      key: z.string(),
      header: z.string(),
      align: z.enum(CELL_ALIGNS),
      format: z.enum(VALUE_FORMATS),
    }),
  ),
  rows: z.array(tableRowSchema),
  emptyText: z.string(),
  caption: z.string().nullable(),
})
const _table: z.ZodType<TableBlock> = tableBlockSchema

const bandSchema = z.object({
  low: scalarSchema,
  high: scalarSchema,
  coverage: scalarSchema,
  lowWords: z.string().nullable(),
  highWords: z.string().nullable(),
})

const headlineBlockSchema = z.object({
  kind: z.literal('headline'),
  value: scalarSchema,
  caption: z.string(),
  words: z.string().nullable(),
  band: bandSchema.nullable(),
  bandFallbackText: z.string().nullable(),
})
const _headline: z.ZodType<HeadlineBlock> = headlineBlockSchema

const verdictBlockSchema = z.object({
  kind: z.literal('verdict'),
  code: z.string(),
  label: z.string(),
  tone: z.enum(VERDICT_TONES),
  lead: z.string(),
  copy: z.array(z.string()),
  metric: scalarSchema.nullable(),
  caps: z.array(z.object({ code: z.string(), label: z.string() })),
})
const _verdict: z.ZodType<VerdictBlock> = verdictBlockSchema

const statChainBlockSchema = z.object({
  kind: z.literal('statChain'),
  steps: z.array(
    z.object({
      label: z.string(),
      expression: z.string().nullable(),
      value: scalarSchema.nullable(),
      note: z.string().nullable(),
    }),
  ),
  emphasis: z.enum(BLOCK_EMPHASES),
})
const _statChain: z.ZodType<StatChainBlock> = statChainBlockSchema

const placeholderBlockSchema = z.object({
  kind: z.literal('placeholder'),
  text: z.string(),
  reason: z.enum(DEGRADATION_REASONS),
  severity: z.enum(DEGRADATION_SEVERITIES),
  missing: z.array(z.string()),
})
const _placeholder: z.ZodType<PlaceholderBlock> = placeholderBlockSchema

/**
 * Un ítem del anexo. El contrato manda `src` (URL ya firmada); el modelo del
 * emisor persiste `key` de S3. Se aceptan las dos formas y se normalizan a
 * `MediaItem`; la resolución key→URL (con `render.photos`) y el descarte de lo
 * que no se pudo resolver los hace `resolveMediaUrls` en la capa de datos —
 * una key JAMÁS llega a un `<img src>`.
 */
const mediaItemSchema = z
  .object({
    src: z.string().optional(),
    key: z.string().optional(),
    alt: z.string().optional(),
    caption: z.string().nullable().optional(),
  })
  .refine((item) => typeof item.src === 'string' || typeof item.key === 'string', {
    message: 'media item sin src ni key',
  })
  .transform((item) => ({
    src: item.src ?? item.key ?? '',
    alt: item.alt ?? item.caption ?? 'Fotografía del inmueble',
    caption: item.caption ?? null,
  }))

const mediaBlockSchema = z.object({
  kind: z.literal('media'),
  items: z.array(mediaItemSchema),
  count: scalarSchema,
})
const _media: z.ZodType<MediaBlock, z.ZodTypeDef, unknown> = mediaBlockSchema

const figureSpecSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('valueBand'),
    point: z.number().nullable(),
    low: z.number().nullable(),
    high: z.number().nullable(),
    coverageBps: z.number(),
  }),
  z.object({ type: z.literal('rangeDays'), low: z.number(), high: z.number() }),
  z.object({
    type: z.literal('split'),
    parts: z.array(z.object({ label: z.string(), value: z.number() })),
  }),
  z.object({
    type: z.literal('pricePerM2'),
    points: z.array(z.object({ id: z.string(), value: z.number() })),
    subject: z.number().nullable(),
  }),
  z.object({ type: z.literal('divergence'), bps: z.number(), thresholdBps: z.number() }),
])

const figureBlockSchema = z.object({
  kind: z.literal('figure'),
  figure: figureSpecSchema,
  altText: z.string(),
})
const _figure: z.ZodType<FigureBlock> = figureBlockSchema

const sealBlockSchema = z.object({
  kind: z.literal('seal'),
  issuer: z.string(),
  signedAtIso: z.string().nullable(),
  expiresAtIso: z.string().nullable(),
  methods: z.array(z.string()),
  value: scalarSchema.nullable(),
  band: bandSchema.nullable(),
  certContentHashCorto: z.string().nullable(),
  verifyUrl: z.string(),
  verifyUrlEnabled: z.boolean(),
  note: z.string().nullable(),
})
const _seal: z.ZodType<SealBlock> = sealBlockSchema

const blockSchema = z.discriminatedUnion('kind', [
  proseBlockSchema,
  keyValuesBlockSchema,
  bulletListBlockSchema,
  tableBlockSchema,
  headlineBlockSchema,
  verdictBlockSchema,
  statChainBlockSchema,
  placeholderBlockSchema,
  mediaBlockSchema,
  figureBlockSchema,
  sealBlockSchema,
])

// ---------------------------------------------------------------------------
// Sección y vista
// ---------------------------------------------------------------------------

const sectionIdSchema = z.enum(SECTION_ORDER)

const sectionNodeSchema = z.object({
  id: sectionIdSchema,
  title: z.string().nullable(),
  anchor: z.string(),
  canon: z.boolean(),
  visibility: z.enum(SECTION_VISIBILITIES),
  emphasis: z.enum(SECTION_EMPHASES),
  state: z.enum(SECTION_STATES),
  gaps: z.array(z.object({ field: z.string(), reason: z.enum(DEGRADATION_REASONS) })),
  blocks: z.array(blockSchema),
  legalNote: proseBlockSchema.nullable(),
})
const _sectionNode: z.ZodType<ReportSectionNode, z.ZodTypeDef, unknown> = sectionNodeSchema

/**
 * Las 39 secciones, cada una obligatoria. `z.object` con la forma construida
 * desde `SECTION_ORDER`: un `z.record` con enum en zod 3 NO exige que estén
 * todas las claves (infiere `Partial`), y acá una sección ausente es un JSON
 * inválido, no un hueco. El `as` es sobre la FORMA del esquema (39 claves ×
 * el mismo esquema), no sobre datos del servidor.
 */
const sectionsShape = Object.fromEntries(
  SECTION_ORDER.map((id) => [id, sectionNodeSchema]),
) as Record<SectionId, typeof sectionNodeSchema>

const sectionsSchema = z.object(sectionsShape).superRefine((sections, ctx) => {
  for (const id of SECTION_ORDER) {
    if (sections[id].id !== id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [id, 'id'],
        message: `la sección "${id}" declara id "${sections[id].id}"`,
      })
    }
  }
})

const orderSchema = z
  .array(sectionIdSchema)
  .length(SECTION_ORDER.length)
  .refine((order) => order.every((id, index) => id === SECTION_ORDER[index]), {
    message: 'order no coincide con SECTION_ORDER',
  })

const metaSchema = z.object({
  slug: z.string().min(1),
  title: z.string(),
  subtitle: z.string(),
  issuerLabel: z.string(),
  issuedAtIso: z.string().nullable(),
  vigenciaHastaIso: z.string().nullable(),
  policyVersion: z.string(),
  certSectionsVersion: z.string(),
  certSectionsV2Version: z.string(),
  completeness: z.object({
    total: z.number().int().nonnegative(),
    ok: z.number().int().nonnegative(),
    partial: z.number().int().nonnegative(),
    degraded: z.number().int().nonnegative(),
  }),
  verifyUrl: z.string(),
  verifyUrlEnabled: z.boolean(),
  paywallCtaHref: z.string().nullable(),
})

const shareNoticeSchema = z.object({
  expiresAtIso: z.string(),
  sharedByLabel: z.string(),
})

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'fecha ISO inválida',
})

const renderSealSchema = z.object({
  state: z.enum(SEAL_STATES),
  tamperVerdict: z.enum(TAMPER_VERDICTS),
  chainStatus: z.enum(CHAIN_STATUSES).nullable(),
  supersededBy: z.string().nullable(),
  certContentHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, 'sha256 hex de 64 caracteres')
    .nullable(),
  issuer: z.string(),
  signedAtIso: z.string().nullable(),
  expiresAtIso: z.string().nullable(),
  signedBy: z.string().nullable(),
  methods: z.array(z.string()),
  verifyUrl: z.string(),
})

const renderQrSchema = z
  .object({
    size: z.number().int().positive(),
    rows: z.array(z.string()),
  })
  .refine(
    (qr) => qr.rows.length === qr.size && qr.rows.every((row) => row.length === qr.size),
    { message: 'la matriz del QR no es cuadrada de lado size' },
  )

const renderPhotoSchema = z.object({
  key: z.string(),
  url: z.string(),
  expiresAtIso: z.string(),
})

const renderSchema = z.object({
  nowIso: isoDate,
  submissionId: z.string().min(1),
  certificateId: z.string().min(1),
  seal: renderSealSchema,
  qr: renderQrSchema,
  photos: z.array(renderPhotoSchema),
})
const _render: z.ZodType<ReportRender> = renderSchema

// ---------------------------------------------------------------------------
// delivery — capacidades de entrega (T-0007)
// ---------------------------------------------------------------------------

/**
 * Los cinco estados de sign-off (`avaluo/src/avaluo/signoff/state-machine.ts`).
 * SÓLO diagnóstico/display — nunca se rama comportamiento sobre esto (T-0007
 * §3.2). Por eso el schema lo valida como `z.string()`, NO como `z.enum`: un
 * valor futuro no reconocido no puede tumbar el parseo entero.
 */
export type DeliverySignoffState =
  | 'borrador'
  | 'en_revisión'
  | 'firmado'
  | 'rechazado'
  | 'entregado'

/**
 * Lo que el dueño de este informe puede HACER. Lo deriva el micro
 * server-side a partir del estado del certificado y el pago; el front NUNCA
 * lo calcula ni lo sobreescribe — sólo lo lee (o, si falta o llega roto, lo
 * niega todo: ver `resolveDelivery` en `delivery.ts`).
 *
 * `signoffState` viaja como `string`, NO como `DeliverySignoffState`: el
 * productor emite siempre uno de los cinco valores conocidos, pero el
 * consumidor lo valida laxo a propósito (ver `deliverySchema` abajo) para que
 * un estado futuro no reconocido no tumbe el parseo. `DeliverySignoffState`
 * queda exportado sólo como referencia de los valores esperados hoy.
 */
export interface DeliveryCapabilities {
  readonly signoffState: string
  /** true ⇔ signoffState es 'firmado' o 'entregado'. */
  readonly released: boolean
  /** released && paid. */
  readonly canDownloadPdf: boolean
  /** released. */
  readonly canVerify: boolean
  /** released. */
  readonly canExport: boolean
  /** El aviso de estimación IA no final. `null` ⇔ released. */
  readonly estimateNotice: string | null
}

const deliverySchema = z.object({
  // NO z.enum — un valor de estado futuro no reconocido no puede anular todo
  // el payload (`report-view.data.ts` convierte cualquier fallo de parseo en
  // `notFound()`). Ver T-0007 §3.2.3.
  signoffState: z.string(),
  released: z.boolean(),
  canDownloadPdf: z.boolean(),
  canVerify: z.boolean(),
  canExport: z.boolean(),
  estimateNotice: z.string().nullable(),
}) satisfies z.ZodType<DeliveryCapabilities, z.ZodTypeDef, unknown>

/**
 * La respuesta 200 de report-serve v1. `render` es obligatorio. `sample` lo
 * declara el servidor (un documento real es `false`; la fixture compartida
 * `report-serve.sample.json` viene `true` porque sale del juego de muestra del
 * micro) y la landing lo respeta tal cual — lo que NUNCA hace es aplicar los
 * overrides de desarrollo a una vista servida, venga marcada como venga
 * (`report-view.data.ts`).
 *
 * `delivery` es OPCIONAL a nivel de tope (T-0007 §3.2): un micro viejo que
 * todavía no lo manda, o un valor con forma inválida, degradan a `undefined`
 * vía `.catch()` — NUNCA a un parseo fallido de todo el payload. El consumidor
 * (`resolveDelivery`, `delivery.ts`) trata `undefined` como el modo más
 * restrictivo: nada de PDF, nada de verificación, nada de exportar.
 */
export const reportServeResponseSchema = z.object({
  schema: z.literal('report-v1'),
  meta: metaSchema,
  audience: z.enum(AUDIENCES),
  paid: z.boolean(),
  sample: z.boolean(),
  shareNotice: shareNoticeSchema.nullable(),
  order: orderSchema,
  sections: sectionsSchema,
  render: renderSchema,
  delivery: deliverySchema.optional().catch(undefined),
})

/** El tipo de una vista servida: un `ReportWebView` con `render` presente. */
export interface ReportServeResponse extends ReportWebView {
  readonly render: ReportRender
  /**
   * OPCIONAL en el wire (T-0007 §3.2). Ausente o roto ⇒ modo más restrictivo
   * en el consumidor. Presente y completo, o ausente — nunca a medias.
   */
  readonly delivery?: DeliveryCapabilities
}

// Comprobación en compilación (sin `as`): lo que sale del parser ES una vista.
function asServedView(parsed: z.output<typeof reportServeResponseSchema>): ReportServeResponse {
  return parsed
}

export type ReportServeParseResult =
  | { readonly ok: true; readonly view: ReportServeResponse }
  | { readonly ok: false; readonly issues: readonly string[] }

/**
 * Valida un JSON desconocido contra el contrato. Devuelve la vista tipada o la
 * lista de problemas (rutas + mensaje), pensada para logs sin datos personales:
 * los mensajes describen la FORMA, nunca copian valores.
 */
export function parseReportServeResponse(json: unknown): ReportServeParseResult {
  const result = reportServeResponseSchema.safeParse(json)
  if (result.success) {
    return { ok: true, view: asServedView(result.data) }
  }
  const issues = result.error.issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
  return { ok: false, issues }
}
