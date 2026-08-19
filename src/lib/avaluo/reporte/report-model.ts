/**
 * report-model.ts — el Report Model del informe de estimación comercial, en el front.
 *
 * ⚠️ QUIÉN MANDA. El modelo canónico (`report-v1`) lo define y lo emite el
 * microservicio de avalúo (REPORT-MODEL-v1.md §3.4). Este archivo es la copia
 * TIPADA que consume el front: la **proyección web** del modelo, es decir cada
 * sección ya reducida al vocabulario de bloques de REPORT-MODEL-v1.md §3.7
 * (`blocks.ts`), que en el diseño original está declarado «SÓLO web y HTML».
 *
 * Por qué la proyección y no el modelo entero: el `SectionDataMap` (39 tipos
 * nominales, uno por sección) es un detalle del emisor — quien decide qué
 * arquetipo de bloque le toca a cada sección. Al front le llega el resultado de
 * esa decisión. Consecuencia de gobierno, heredada del diseño: **una sección
 * nueva cuesta CERO componentes acá**; un arquetipo nuevo cuesta uno y
 * TypeScript lo cobra en `BLOCK_VIEWS` (`ReportBlockView.tsx`).
 *
 * Tres reglas que este archivo hereda y hace cumplir por tipos:
 *  1. JSON PURO. Sin JSX, sin funciones, sin `Date`, sin `Map`/`Set`, sin `any`,
 *     sin `Record<string, unknown>`. `JSON.parse(JSON.stringify(view))` es
 *     deep-equal al original.
 *  2. Los números viajan CRUDOS (`raw` + `format`); el string se produce en
 *     `report-format.ts`. No hay campo `text` espejo en el modelo, así que no
 *     existe el drift raw↔texto.
 *  3. `SECTION_ORDER` es la única declaración de orden. Los renderers iteran ese
 *     array, nunca `Object.keys(sections)`.
 */

// ---------------------------------------------------------------------------
// Orden canónico
// ---------------------------------------------------------------------------

/**
 * El orden canónico de las 39 secciones (REPORT-MODEL-v1.md §3.1), alineado con
 * el certificado actual del micro: sin las tres tablas de transparencia por
 * comparable (decisión de producto), con el anexo fotográfico justo después de
 * la descripción del inmueble, y con «Tabla de contenido», «Aspectos legales» y
 * «Constancia de firma electrónica» como secciones canónicas nuevas.
 *
 * ⚠️ En el microservicio ESTE array decide los bytes del PDF y su hash. Acá es
 * una copia de lectura: la landing NO reordena el modelo — reordena la
 * PRESENTACIÓN con `landing-layout.ts`, que es una partición separada de este
 * mismo array y tiene su propio test de partición.
 */
export const SECTION_ORDER = [
  'doc-header',
  'tabla-contenido',
  'resumen-ejecutivo',
  'identificacion-predio',
  'aspectos-legales',
  'descripcion-inmueble',
  'anexo-fotografico',
  'descripcion-sector',
  'aspectos-complementarios',
  'metodologia',
  'avm-legitimacion',
  'prudencia-redondeo',
  'nivel-confianza',
  'regimen-mercado',
  'indicativo-venta',
  'divergencia-referencia',
  'reconciliacion-indicaciones',
  'valor-estimado',
  'valorizantes-desvalorizantes',
  'valor-terreno-construccion',
  'homogenizacion-igac',
  'conciliacion-metodos',
  'tiempo-exposicion',
  'niif13',
  'vigencia',
  'alcance-limitaciones',
  'naturaleza-documento',
  'consideraciones-limitantes',
  'sin-visita',
  'participacion-automatizada',
  'constancias-supuestos',
  'principios-d422',
  'usos-documento',
  'valor-realizacion',
  'independencia',
  'emisor',
  'constancia-firma',
  'sello-verificacion',
  'doc-footer',
] as const

export type SectionId = (typeof SECTION_ORDER)[number]

/** El ancla del `<section>` y el destino del índice son SIEMPRE el sectionId. */
export function anchorOf(id: SectionId): string {
  return id
}

/**
 * La sección cuyo disclaimer de alcance (Ley 1673 de 2013) no se puede colapsar
 * ni esconder nunca — INV-07. Vive como constante para que el layout, el
 * renderer y el test hablen del mismo id y no de tres strings sueltos.
 */
export const SCOPE_DISCLAIMER_SECTION_ID = 'alcance-limitaciones' satisfies SectionId

// ---------------------------------------------------------------------------
// Vocabulario del nodo de sección
// ---------------------------------------------------------------------------

/** Quién puede ver una sección. La audiencia es PROYECCIÓN, nunca rama del builder. */
export type SectionVisibility = 'public' | 'owner' | 'paid'

/** Tratamiento con consecuencia LEGAL (INV-07), no estilo. */
export type SectionEmphasis = 'normal' | 'disclaimer' | 'headline'

/** Tres estados, no dos: `partial` es lo que evita que la página se vea rota. */
export type SectionState = 'ok' | 'partial' | 'degraded'

export type DegradationReason =
  | 'sin_productor'
  | 'columna_ausente'
  | 'no_aplica'
  | 'insuficiente'
  | 'rechazado'
  | 'restringido'

export type DegradationSeverity = 'no_data' | 'not_applicable' | 'not_computable' | 'restricted'

/** Un hueco a nivel CAMPO dentro de una sección que por lo demás tiene datos. */
export interface SectionGap {
  readonly field: string
  readonly reason: DegradationReason
}

// ---------------------------------------------------------------------------
// Escalares
// ---------------------------------------------------------------------------

export type ValueFormat =
  | 'text'
  | 'cop'
  | 'copPerM2'
  | 'int'
  | 'bps'
  | 'pct2'
  | 'coverage'
  | 'dateIso'
  | 'days'

/** De dónde salió el dato. Es lo que distingue «me lo dijiste» de «lo verifiqué». */
export type DataOrigin =
  | 'usuario'
  | 'usuario_features'
  | 'declarado'
  | 'calculado'
  | 'catalogo'
  | 'no_verificado'

/**
 * Escalar de presentación. Viaja CRUDO: el string lo produce `report-format.ts`,
 * que delega la plata en `formatCurrency()` de `@/lib/format` (convención del
 * repo, `docs/DESIGN.md:38`).
 */
export interface Scalar {
  readonly raw: number | string | null
  readonly format: ValueFormat
  readonly origin: DataOrigin
  /** true ⇒ el valor no existe y se pinta `missingText`. */
  readonly missing: boolean
  /** El texto EXACTO del hueco («No suministrado»). Contrato de bytes. */
  readonly missingText: string | null
  /**
   * true ⇒ dato personal. El renderer le pone `data-pii-field`, que
   * `globals.css:1209-1215` ya esconde en `@media print`.
   */
  readonly pii: boolean
}

// ---------------------------------------------------------------------------
// Bloques (el vocabulario web/HTML — REPORT-MODEL-v1.md §3.7)
// ---------------------------------------------------------------------------

export type BlockEmphasis = 'plain' | 'note' | 'warning' | 'disclaimer'
export type VerdictTone = 'positive' | 'neutral' | 'negative'

export interface ProseBlock {
  readonly kind: 'prose'
  readonly emphasis: BlockEmphasis
  readonly paragraphs: readonly string[]
  readonly legalRef: string | null
  readonly textVersion: string | null
}

export interface KeyValueRow {
  readonly label: string
  readonly value: Scalar
  /** «usuario» / «declarado» / «—». Es lo que hace honesta a la tabla. */
  readonly provenance: string | null
}

export interface KeyValuesBlock {
  readonly kind: 'keyValues'
  readonly rows: readonly KeyValueRow[]
}

export interface BulletGroup {
  readonly heading: string | null
  /** `affirm`/`deny` son la tabla SÍ/NO de `usos-documento`. */
  readonly marker: 'bullet' | 'none' | 'affirm' | 'deny'
  readonly items: readonly string[]
  readonly emptyText: string | null
}

export interface BulletListBlock {
  readonly kind: 'bulletList'
  readonly emphasis: BlockEmphasis
  readonly groups: readonly BulletGroup[]
}

export type CellAlign = 'left' | 'right'

export interface TableColumn {
  readonly key: string
  readonly header: string
  readonly align: CellAlign
  readonly format: ValueFormat
}

export interface TableRow {
  readonly key: string
  readonly cells: Readonly<Record<string, Scalar>>
  /** Desglose por fila (los factores de ajuste). En web, fila expandible. */
  readonly detail: TableBlock | null
}

export interface TableBlock {
  readonly kind: 'table'
  readonly columns: readonly TableColumn[]
  readonly rows: readonly TableRow[]
  readonly emptyText: string
  readonly caption: string | null
}

export interface BandSpec {
  readonly low: Scalar
  readonly high: Scalar
  readonly coverage: Scalar
  readonly lowWords: string | null
  readonly highWords: string | null
}

export interface HeadlineBlock {
  readonly kind: 'headline'
  readonly value: Scalar
  readonly caption: string
  readonly words: string | null
  readonly band: BandSpec | null
  readonly bandFallbackText: string | null
}

export interface VerdictBlock {
  readonly kind: 'verdict'
  readonly code: string
  readonly label: string
  readonly tone: VerdictTone
  readonly lead: string
  readonly copy: readonly string[]
  /** La magnitud que sustenta el veredicto (ancho relativo, V, divergencia). */
  readonly metric: Scalar | null
  readonly caps: readonly { readonly code: string; readonly label: string }[]
}

export interface StatStep {
  readonly label: string
  readonly expression: string | null
  readonly value: Scalar | null
  /**
   * La línea YA renderizada por el emisor cuando es contrato de bytes
   * (`IgacStep.renderedLine`). El front la imprime, no la re-arma.
   */
  readonly note: string | null
}

export interface StatChainBlock {
  readonly kind: 'statChain'
  readonly steps: readonly StatStep[]
  readonly emphasis: BlockEmphasis
}

export interface PlaceholderBlock {
  readonly kind: 'placeholder'
  /** El texto legal EXACTO. La web puede cambiar la CAJA, JAMÁS el texto. */
  readonly text: string
  readonly reason: DegradationReason
  readonly severity: DegradationSeverity
  /** Qué falta, en lenguaje de producto. Sólo web. */
  readonly missing: readonly string[]
}

/**
 * 🔴 El modelo del emisor persiste **keys de S3**, nunca URLs. Quien sirve la
 * vista presigna (TTL corto) y ES ÉL quien decide si el lector tiene derecho a
 * las fotos. Al front le llegan URLs ya firmadas; nunca una key.
 */
export interface MediaItem {
  readonly src: string
  readonly alt: string
  readonly caption: string | null
}

export interface MediaBlock {
  readonly kind: 'media'
  readonly items: readonly MediaItem[]
  readonly count: Scalar
}

export type FigureSpec =
  | {
      readonly type: 'valueBand'
      readonly point: number | null
      readonly low: number | null
      readonly high: number | null
      readonly coverageBps: number
    }
  | { readonly type: 'rangeDays'; readonly low: number; readonly high: number }
  | {
      readonly type: 'split'
      readonly parts: readonly { readonly label: string; readonly value: number }[]
    }
  | {
      readonly type: 'pricePerM2'
      readonly points: readonly { readonly id: string; readonly value: number }[]
      readonly subject: number | null
    }
  | { readonly type: 'divergence'; readonly bps: number; readonly thresholdBps: number }

export interface FigureBlock {
  readonly kind: 'figure'
  readonly figure: FigureSpec
  /** Obligatorio: la figura se anuncia con `role="img"` + este texto. */
  readonly altText: string
}

/**
 * El sello, con peso propio (decisión del dueño de producto: la web es el
 * entregable principal). `verifyUrl` es OBLIGATORIO y visible — un sello que
 * sólo se puede ver dentro de la página que estás validando no prueba nada.
 */
export interface SealBlock {
  readonly kind: 'seal'
  readonly issuer: string
  readonly signedAtIso: string | null
  readonly expiresAtIso: string | null
  readonly methods: readonly string[]
  readonly value: Scalar | null
  readonly band: BandSpec | null
  readonly certContentHashCorto: string | null
  readonly verifyUrl: string
  /**
   * false ⇒ el enlace se pinta pero NO navega. Es el caso de la muestra: el
   * slug no existe, y mandar a alguien a un verificador que responde
   * «no disponible» confunde más que ayudar.
   */
  readonly verifyUrlEnabled: boolean
  /** Nota del sello (p. ej. «sin verificación real» en la muestra). */
  readonly note: string | null
}

export type ReportBlock =
  | ProseBlock
  | KeyValuesBlock
  | BulletListBlock
  | TableBlock
  | HeadlineBlock
  | VerdictBlock
  | StatChainBlock
  | PlaceholderBlock
  | MediaBlock
  | FigureBlock
  | SealBlock

export type BlockKind = ReportBlock['kind']
export type BlockOf<K extends BlockKind> = Extract<ReportBlock, { kind: K }>

// ---------------------------------------------------------------------------
// Sección y vista
// ---------------------------------------------------------------------------

export interface ReportSectionNode {
  readonly id: SectionId
  /** Título VERBATIM del canon. `null` sólo en `doc-header` / `doc-footer`. */
  readonly title: string | null
  readonly anchor: string
  readonly canon: boolean
  readonly visibility: SectionVisibility
  readonly emphasis: SectionEmphasis
  readonly state: SectionState
  /** Los huecos a nivel campo cuando `state === 'partial'`. */
  readonly gaps: readonly SectionGap[]
  readonly blocks: readonly ReportBlock[]
  /** La caja de prosa legal adjunta. Es HERMANA de `blocks`, no parte de ellos. */
  readonly legalNote: ProseBlock | null
}

export type ReportAudience = 'owner' | 'shared'

export interface ReportCompleteness {
  readonly total: number
  readonly ok: number
  readonly partial: number
  readonly degraded: number
}

export interface ReportShareNotice {
  /** Fecha ISO de caducidad del enlace compartido. */
  readonly expiresAtIso: string
  readonly sharedByLabel: string
}

export interface ReportViewMeta {
  readonly slug: string
  readonly title: string
  readonly subtitle: string
  readonly issuerLabel: string
  readonly issuedAtIso: string | null
  readonly vigenciaHastaIso: string | null
  readonly policyVersion: string
  readonly certSectionsVersion: string
  readonly certSectionsV2Version: string
  readonly completeness: ReportCompleteness
  /** URL del verificador público. Se muestra en el encabezado y en el sello. */
  readonly verifyUrl: string
  readonly verifyUrlEnabled: boolean
  /**
   * A dónde se manda a quien todavía no completó el pago. Lo decide quien sirve
   * la vista, porque es él quien sabe a qué solicitud pertenece este informe.
   */
  readonly paywallCtaHref: string | null
}

// ---------------------------------------------------------------------------
// Lo impuro: `render` (contrato report-serve v1)
// ---------------------------------------------------------------------------

/**
 * El veredicto del verificador. Es EL MISMO que responde `/verify/<slug>` en el
 * micro — mismo resolutor, no una reimplementación — y por eso la landing lo
 * muestra tal cual y jamás lo recalcula ni lo suaviza.
 */
export type SealVerifyState = 'valid' | 'altered' | 'not_found' | 'unavailable'

export type SealTamperVerdict = 'valido' | 'alterado' | 'desconocido'

/** Estado del certificado en su cadena de emisión. */
export type SealChainStatus = 'VIGENTE' | 'VENCIDO' | 'REEMPLAZADO'

/**
 * El sello REAL, servido por el micro junto con la vista. Espejo de
 * `resolveVerifyState` (verify-result.tsx del micro).
 */
export interface ReportRenderSeal {
  readonly state: SealVerifyState
  readonly tamperVerdict: SealTamperVerdict
  readonly chainStatus: SealChainStatus | null
  /** Slug del certificado que reemplaza a éste (sólo con `REEMPLAZADO`). */
  readonly supersededBy: string | null
  /** sha256 hex COMPLETO (64). No es PII; el corto (12) va en el bloque `seal`. */
  readonly certContentHash: string | null
  readonly issuer: string
  readonly signedAtIso: string | null
  readonly expiresAtIso: string | null
  /** PII del revisor: el servidor lo manda sólo a la audiencia `owner`. */
  readonly signedBy: string | null
  readonly methods: readonly string[]
  /** = `meta.verifyUrl`. La misma URL horneada en el QR del PDF. */
  readonly verifyUrl: string
}

/**
 * La matriz del QR de `verifyUrl`: `rows[y][x] === '1'` ⇒ módulo oscuro. El
 * front la DIBUJA con `<rect>`; nunca inyecta SVG del servidor.
 */
export interface ReportRenderQr {
  readonly size: number
  readonly rows: readonly string[]
}

/** URL presignada de una foto del anexo (TTL corto). */
export interface ReportRenderPhoto {
  readonly key: string
  readonly url: string
  readonly expiresAtIso: string
}

/**
 * Lo impuro de la vista servida: reloj, verificación, QR y fotos presignadas.
 * Vive aparte del modelo a propósito — nada de esto participa del hash del PDF.
 */
export interface ReportRender {
  /** Reloj del servidor, leído en el borde de la ruta. */
  readonly nowIso: string
  /**
   * La solicitud del dueño (la misma a la que está atado el capability token).
   * Con esto el front construye SU ruta de pago/estado
   * (`/avaluo/estado/<submissionId>`); el servicio manda `paywallCtaHref: null`
   * porque no adivina rutas de este repo.
   */
  readonly submissionId: string
  /** Id del certificado: arma el enlace real de descarga del PDF (`certificateUrl`). */
  readonly certificateId: string
  readonly seal: ReportRenderSeal
  readonly qr: ReportRenderQr
  readonly photos: readonly ReportRenderPhoto[]
}

/**
 * Lo que consume la landing. Es lo que `getReportView()` devuelve, y es lo que
 * el servicio devuelve en `GET /api/avaluo/report/[slug]` (report-serve v1).
 */
export interface ReportWebView {
  readonly schema: 'report-v1'
  readonly meta: ReportViewMeta
  readonly audience: ReportAudience
  /** false ⇒ las secciones `paid` van degradadas con CTA (paridad del watermark). */
  readonly paid: boolean
  /** true ⇒ juego de datos de muestra: banda persistente + `data-sample`. */
  readonly sample: boolean
  /** El aviso de enlace compartido. Sólo en `audience === 'shared'`. */
  readonly shareNotice: ReportShareNotice | null
  readonly order: readonly SectionId[]
  readonly sections: Readonly<Record<SectionId, ReportSectionNode>>
  /**
   * El sello real, el QR y las fotos presignadas. `null` SÓLO en la muestra:
   * no hay documento emitido detrás y por eso no hay nada que verificar. Es
   * `null` y no opcional para respetar la regla 1 (JSON puro: un `undefined`
   * desaparece al serializar y rompe el deep-equal). Toda vista servida lo trae
   * — el validador lo exige.
   */
  readonly render: ReportRender | null
}
