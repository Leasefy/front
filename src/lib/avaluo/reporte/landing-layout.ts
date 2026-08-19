/**
 * landing-layout.ts — cómo se reordena la presentación sin tocar el modelo.
 *
 * 🔴 ESTE ARCHIVO NO DECIDE BYTES. El PDF sigue iterando `SECTION_ORDER`. Esto es
 * una PARTICIÓN de `SECTION_ORDER` en capítulos de presentación web, y encima
 * de la partición, un LAYOUT bento declarativo (`rows`) que dice qué tarjetas
 * comparten fila y con qué ancho.
 *
 * Nota de nombres: la narrativa llama «bloques» a los seis capítulos, pero
 * `ReportBlock` ya es el arquetipo de render (prosa, tabla, cifra…). Acá los
 * seis se llaman **chapters** para que no se pisen dos conceptos con la misma
 * palabra. La numeración de la narrativa se conserva en los ids (`b1`…`b6`).
 *
 * Invariantes propios, verificados en `landing-layout.test.ts`:
 *   (a) la unión de los ids de todos los capítulos === `new Set(SECTION_ORDER)`
 *   (b) ningún id aparece dos veces ⇒ cada sección se renderiza EXACTAMENTE una vez
 *   (c) `alcance-limitaciones` nunca resuelve a `colapsado`, en ninguna audiencia,
 *       en ningún estado (INV-07)
 *   (d) las `rows` de cada capítulo cubren exactamente sus `sections` y cada
 *       fila suma 12 columnas — así ninguna fila del bento queda con hueco.
 *
 * Lo derivado (la tira de métricas del héroe, el estado del documento en la
 * barra, los chips de capítulo, los rellenos de dato real de las tarjetas) se
 * calcula ACÁ, en funciones puras con test, y no en los componentes.
 */

import { formatDate } from '@/lib/format'
import { formatScalar } from './report-format'
import {
  SCOPE_DISCLAIMER_SECTION_ID,
  SECTION_ORDER,
  type FigureBlock,
  type HeadlineBlock,
  type KeyValuesBlock,
  type ReportAudience,
  type ReportSectionNode,
  type ReportWebView,
  type SealChainStatus,
  type SectionId,
  type TableBlock,
  type VerdictBlock,
} from './report-model'

export type Treatment = 'destacado' | 'normal' | 'colapsado'

export interface LandingSectionRef {
  readonly id: SectionId
  readonly treatment: Treatment
}

// ---------------------------------------------------------------------------
// Layout bento
// ---------------------------------------------------------------------------

/** Ancho de una celda en la rejilla de 12 columnas. */
export type Span = 12 | 8 | 7 | 6 | 5 | 4 | 3

/**
 * Un relleno de DATO REAL para que dos tarjetas hermanas queden a la misma
 * altura sin aire muerto. Cada uno se deriva de la propia sección
 * (`resolveFiller`); si el dato no está, el relleno no se pinta.
 */
export type FillerKind =
  | 'vigencia-meter'
  | 'sector-gauge'
  | 'exposure-meter'
  | 'split-donut'
  | 'divergence-gauge'

export type LandingCell =
  /** El héroe: doc-header + valor-estimado en una sola superficie ink. */
  | { readonly kind: 'hero'; readonly span: 12; readonly ids: readonly SectionId[] }
  /** Una tarjeta = una sección. */
  | {
      readonly kind: 'section'
      readonly id: SectionId
      readonly span: Span
      readonly filler?: FillerKind
    }
  /**
   * «Una grande + columna de dos pequeñas»: varias tarjetas apiladas en una
   * celda, que se reparten la altura de la fila (cada una `flex-1`).
   */
  | { readonly kind: 'stack'; readonly span: Span; readonly ids: readonly SectionId[] }
  /**
   * Una tarjeta que agrupa varias secciones plegadas como filas de acordeón.
   * Cada sección conserva su `<section id>` y su ancla.
   */
  | {
      readonly kind: 'group'
      readonly span: Span
      readonly title: string
      readonly lead: string
      readonly ids: readonly SectionId[]
    }

export interface LandingRow {
  readonly cells: readonly LandingCell[]
}

export interface LandingChapter {
  readonly id: string
  /** Copy de UI, no título canónico. */
  readonly title: string
  /** Una frase que dice qué contesta el capítulo. */
  readonly lead: string | null
  readonly treatment: Treatment
  readonly sections: readonly LandingSectionRef[]
  /** El bento: filas de 12 columnas. Cubre exactamente `sections`. */
  readonly rows: readonly LandingRow[]
}

/** Los ids de sección que contiene una celda, en orden. */
export function cellSectionIds(cell: LandingCell): readonly SectionId[] {
  switch (cell.kind) {
    case 'hero':
    case 'group':
    case 'stack':
      return cell.ids
    case 'section':
      return [cell.id]
  }
}

/** Ids de sección de una fila, en orden. */
export function rowSectionIds(row: LandingRow): readonly SectionId[] {
  return row.cells.flatMap(cellSectionIds)
}

/** Suma de columnas de una fila. Tiene que dar 12. */
export function rowSpan(row: LandingRow): number {
  return row.cells.reduce<number>((acc, cell) => acc + cell.span, 0)
}

/**
 * Los seis capítulos. El orden interno de cada uno va **de la respuesta corta a
 * la larga**, y la regla de colapso es una sola y defendible por escrito: se
 * colapsa lo que es correcto pero todavía no responde a ninguna pregunta que el
 * lector se haya hecho.
 */
export const LANDING_CHAPTERS: readonly LandingChapter[] = [
  {
    id: 'b1',
    title: 'Cuánto vale',
    lead: 'La estimación, su rango y qué tan lejos llega.',
    treatment: 'destacado',
    sections: [
      { id: 'doc-header', treatment: 'destacado' },
      { id: 'valor-estimado', treatment: 'destacado' },
      { id: 'nivel-confianza', treatment: 'destacado' },
      { id: 'vigencia', treatment: 'destacado' },
      // ⛔ INV-07 — adyacente al número A PROPÓSITO: el disclaimer gana peso por
      // posición, no por tipografía. Al final del documento nadie lo lee.
      { id: SCOPE_DISCLAIMER_SECTION_ID, treatment: 'destacado' },
      // La landing ES el resumen ejecutivo; repetirlo arriba sería decir el
      // número dos veces. Pero es canon #1 y quien reconcilia web↔PDF lo busca.
      { id: 'resumen-ejecutivo', treatment: 'colapsado' },
      // La tabla de contenido del PDF: en la web el índice lateral hace ese
      // trabajo, pero es canon y quien reconcilia web↔PDF la busca. Plegada, al
      // lado del resumen (las plegadas van juntas).
      { id: 'tabla-contenido', treatment: 'colapsado' },
    ],
    rows: [
      { cells: [{ kind: 'hero', span: 12, ids: ['doc-header', 'valor-estimado'] }] },
      { cells: [{ kind: 'section', id: SCOPE_DISCLAIMER_SECTION_ID, span: 12 }] },
      {
        cells: [
          { kind: 'section', id: 'nivel-confianza', span: 7 },
          { kind: 'section', id: 'vigencia', span: 5, filler: 'vigencia-meter' },
        ],
      },
      {
        cells: [
          { kind: 'section', id: 'resumen-ejecutivo', span: 7 },
          { kind: 'section', id: 'tabla-contenido', span: 5 },
        ],
      },
    ],
  },
  {
    id: 'b2',
    title: 'Qué inmueble es',
    lead: '¿Estamos hablando del mismo inmueble?',
    treatment: 'normal',
    sections: [
      { id: 'identificacion-predio', treatment: 'normal' },
      // Matrícula, CHIP y estudio de títulos: lo que el certificado declara del
      // inmueble como bien jurídico (y lo que dice que NO es: un estudio de títulos).
      { id: 'aspectos-legales', treatment: 'normal' },
      { id: 'descripcion-inmueble', treatment: 'normal' },
      // El certificado incrusta las fotos verificadas por sha256; la web las
      // muestra a tamaño completo, presignadas.
      { id: 'anexo-fotografico', treatment: 'normal' },
      { id: 'descripcion-sector', treatment: 'normal' },
      { id: 'aspectos-complementarios', treatment: 'normal' },
    ],
    rows: [
      {
        // Identificación (larga) + columna con los aspectos legales (tres
        // filas) y la ficha del inmueble apilados: ninguna tarjeta corta queda
        // sola al lado de una alta.
        cells: [
          { kind: 'section', id: 'identificacion-predio', span: 7 },
          { kind: 'stack', span: 5, ids: ['aspectos-legales', 'descripcion-inmueble'] },
        ],
      },
      { cells: [{ kind: 'section', id: 'anexo-fotografico', span: 12 }] },
      {
        cells: [
          { kind: 'section', id: 'descripcion-sector', span: 7, filler: 'sector-gauge' },
          { kind: 'section', id: 'aspectos-complementarios', span: 5 },
        ],
      },
    ],
  },
  {
    id: 'b3',
    title: 'En qué se basa',
    lead: 'Lo que sube y baja el valor, y la cadena estadística del método comparativo de mercado.',
    treatment: 'normal',
    // Las tablas por comparable (comparables usados, descartados y procedencia)
    // salieron del certificado por decisión de producto; lo que queda es lo que
    // el certificado sí publica: la cadena estadística defendible (Res. 620
    // art. 11) y su conciliación con el modelo.
    sections: [
      { id: 'valorizantes-desvalorizantes', treatment: 'normal' },
      { id: 'homogenizacion-igac', treatment: 'colapsado' },
      { id: 'conciliacion-metodos', treatment: 'normal' },
    ],
    rows: [
      {
        cells: [
          { kind: 'section', id: 'valorizantes-desvalorizantes', span: 6 },
          { kind: 'section', id: 'conciliacion-metodos', span: 6 },
        ],
      },
      { cells: [{ kind: 'section', id: 'homogenizacion-igac', span: 12 }] },
    ],
  },
  {
    id: 'b4',
    title: 'Cómo se calculó',
    lead: 'El método, paso por paso. Nada escondido: lo denso viene plegado.',
    treatment: 'normal',
    sections: [
      { id: 'metodologia', treatment: 'normal' },
      { id: 'regimen-mercado', treatment: 'normal' },
      { id: 'tiempo-exposicion', treatment: 'normal' },
      { id: 'valor-terreno-construccion', treatment: 'normal' },
      { id: 'divergencia-referencia', treatment: 'normal' },
      { id: 'reconciliacion-indicaciones', treatment: 'colapsado' },
      { id: 'indicativo-venta', treatment: 'colapsado' },
      { id: 'niif13', treatment: 'colapsado' },
      { id: 'avm-legitimacion', treatment: 'colapsado' },
      { id: 'prudencia-redondeo', treatment: 'colapsado' },
    ],
    rows: [
      // «Una grande + columna de dos»: la metodología (prosa larga) al lado de
      // la insight del régimen (una palabra) y el tiempo de exposición
      // apilados. Sin la pila, la insight quedaba con medio metro de aire; el
      // rango de días se pinta como figura normal (sin relleno) dentro de la pila.
      {
        cells: [
          { kind: 'section', id: 'metodologia', span: 6 },
          { kind: 'stack', span: 6, ids: ['regimen-mercado', 'tiempo-exposicion'] },
        ],
      },
      {
        cells: [
          { kind: 'section', id: 'valor-terreno-construccion', span: 6, filler: 'split-donut' },
          { kind: 'section', id: 'divergencia-referencia', span: 6, filler: 'divergence-gauge' },
        ],
      },
      // Las cinco plegadas van juntas, en filas de iguales: una plegada al lado
      // de una abierta deja una tarjeta vacía a la altura de la llena.
      {
        cells: [
          { kind: 'section', id: 'reconciliacion-indicaciones', span: 4 },
          { kind: 'section', id: 'indicativo-venta', span: 4 },
          { kind: 'section', id: 'niif13', span: 4 },
        ],
      },
      {
        cells: [
          { kind: 'section', id: 'avm-legitimacion', span: 6 },
          { kind: 'section', id: 'prudencia-redondeo', span: 6 },
        ],
      },
    ],
  },
  {
    id: 'b5',
    title: 'Qué NO es este documento',
    lead: 'El marco legal y los límites de uso.',
    treatment: 'normal',
    sections: [
      // La sección operativamente más importante para un tercero: es lo que
      // impide que el documento se use para algo que él mismo declara que no
      // puede. En la vista compartida sube a `destacado` (ver `resolveTreatment`).
      { id: 'usos-documento', treatment: 'normal' },
      { id: 'naturaleza-documento', treatment: 'normal' },
      { id: 'emisor', treatment: 'normal' },
      { id: 'consideraciones-limitantes', treatment: 'colapsado' },
      { id: 'sin-visita', treatment: 'colapsado' },
      { id: 'participacion-automatizada', treatment: 'colapsado' },
      { id: 'constancias-supuestos', treatment: 'colapsado' },
      { id: 'principios-d422', treatment: 'colapsado' },
      { id: 'valor-realizacion', treatment: 'colapsado' },
      { id: 'independencia', treatment: 'colapsado' },
    ],
    rows: [
      // La tabla SÍ/NO ocupa la fila entera: es el momento visual del capítulo.
      { cells: [{ kind: 'section', id: 'usos-documento', span: 12 }] },
      // Una grande (el acordeón legal) + columna de dos pequeñas que se
      // reparten su altura: ninguna tarjeta corta queda al lado de una alta.
      {
        cells: [
          {
            kind: 'group',
            span: 7,
            title: 'Marco legal',
            lead: 'Siete declaraciones que acotan el documento. Cada una conserva su ancla.',
            ids: [
              'consideraciones-limitantes',
              'sin-visita',
              'participacion-automatizada',
              'constancias-supuestos',
              'principios-d422',
              'valor-realizacion',
              'independencia',
            ],
          },
          { kind: 'stack', span: 5, ids: ['naturaleza-documento', 'emisor'] },
        ],
      },
    ],
  },
  {
    id: 'b6',
    title: 'Verificar y compartir',
    lead: 'Cómo comprobar que este documento es el que se firmó.',
    treatment: 'destacado',
    sections: [
      { id: 'sello-verificacion', treatment: 'destacado' },
      // La constancia de firma electrónica del certificado (firmante, cargo,
      // fecha, ID de firma, código y URL de verificación, nota Ley 527): el
      // reverso legal del sello.
      { id: 'constancia-firma', treatment: 'normal' },
      { id: 'doc-footer', treatment: 'normal' },
    ],
    rows: [
      { cells: [{ kind: 'section', id: 'sello-verificacion', span: 12 }] },
      { cells: [{ kind: 'section', id: 'constancia-firma', span: 12 }] },
      { cells: [{ kind: 'section', id: 'doc-footer', span: 12 }] },
    ],
  },
]

/** Número de orden canónico de una sección (`#00`…`#38`), para el eyebrow. */
export function sectionIndex(id: SectionId): number {
  return SECTION_ORDER.indexOf(id)
}

// ---------------------------------------------------------------------------
// Resolución del tratamiento
// ---------------------------------------------------------------------------

export interface TreatmentContext {
  readonly audience: ReportAudience
}

/**
 * El tratamiento efectivo de una sección. Cuatro reglas de PRODUCTO, no de
 * estilo, y todas verificables por un test:
 *
 *  1. `alcance-limitaciones` nunca se colapsa (INV-07). Es la única regla
 *     absoluta: gana sobre todas las demás.
 *  2. Una sección restringida por falta de pago nunca se colapsa — colapsada +
 *     bloqueada = invisible = un CTA que nadie ve.
 *  3. Una sección degradada tampoco se colapsa, PORQUE EL HUECO ES INFORMACIÓN.
 *     La excepción es `not_applicable`: un «no aplica» abierto ocupa el mismo
 *     espacio visual que un dato y compite con él.
 *  4. En la vista compartida, `usos-documento` sube a destacado. Es la única
 *     sección cuyo tratamiento depende de la audiencia, y la razón es de
 *     responsabilidad, no de diseño.
 */
export function resolveTreatment(
  ref: LandingSectionRef,
  node: ReportSectionNode,
  ctx: TreatmentContext,
): Treatment {
  if (node.id === SCOPE_DISCLAIMER_SECTION_ID) return 'destacado'

  if (ctx.audience === 'shared' && node.id === 'usos-documento') return 'destacado'

  if (node.state === 'degraded') {
    const placeholder = node.blocks.find((block) => block.kind === 'placeholder')
    const severity = placeholder?.kind === 'placeholder' ? placeholder.severity : null

    // Sólo el «no aplica» sigue plegado; el hueco y el bloqueo se despliegan.
    if (severity !== 'not_applicable' && ref.treatment === 'colapsado') return 'normal'
  }

  return ref.treatment
}

// ---------------------------------------------------------------------------
// Lectura de bloques (helpers puros, sin DOM)
// ---------------------------------------------------------------------------

function verdictOf(node: ReportSectionNode | undefined): VerdictBlock | null {
  const found = node?.blocks.find((block): block is VerdictBlock => block.kind === 'verdict')
  return found ?? null
}

function headlineOf(node: ReportSectionNode | undefined): HeadlineBlock | null {
  const found = node?.blocks.find((block): block is HeadlineBlock => block.kind === 'headline')
  return found ?? null
}

function tableOf(node: ReportSectionNode | undefined): TableBlock | null {
  const found = node?.blocks.find((block): block is TableBlock => block.kind === 'table')
  return found ?? null
}

function keyValuesOf(node: ReportSectionNode | undefined): KeyValuesBlock | null {
  const found = node?.blocks.find((block): block is KeyValuesBlock => block.kind === 'keyValues')
  return found ?? null
}

function figureOf<T extends FigureBlock['figure']['type']>(
  node: ReportSectionNode | undefined,
  type: T,
): Extract<FigureBlock['figure'], { type: T }> | null {
  if (node === undefined) return null
  for (const block of node.blocks) {
    if (block.kind === 'figure' && block.figure.type === type) {
      return block.figure as Extract<FigureBlock['figure'], { type: T }>
    }
  }
  return null
}

const DAY_MS = 86_400_000

/** Días enteros entre dos ISO (`to - from`), o `null` si alguno no se lee. */
export function daysBetween(fromIso: string | null, toIso: string | null): number | null {
  if (fromIso === null || toIso === null) return null
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  return Math.round((to - from) / DAY_MS)
}

// ---------------------------------------------------------------------------
// Derivados del panel (chrome): estado del documento, tira de métricas, chips
// ---------------------------------------------------------------------------

export type ChipTone = 'success' | 'warning' | 'critical' | 'info' | 'neutral'

export interface DocStatus {
  readonly chain: SealChainStatus
  /** Días que faltan para el fin de la vigencia. `null` sin reloj. */
  readonly daysLeft: number | null
  readonly tone: ChipTone
  /** «VIGENTE · 362 d». */
  readonly label: string
}

/**
 * El estado del documento para la barra superior. Con documento servido, es el
 * `chainStatus` REAL del sello (mismo resolutor que el verificador); en la
 * muestra se deriva del `meta` y del reloj. Nunca se recalcula sobre un sello
 * real: si el servidor dice REEMPLAZADO, acá dice REEMPLAZADO.
 */
export function deriveDocStatus(view: ReportWebView, nowIso: string | null): DocStatus {
  const daysLeft = daysBetween(nowIso, view.meta.vigenciaHastaIso)
  const fromSeal = view.render?.seal.chainStatus ?? null
  const chain: SealChainStatus =
    fromSeal ?? (daysLeft !== null && daysLeft < 0 ? 'VENCIDO' : 'VIGENTE')
  const tone: ChipTone = chain === 'VIGENTE' ? 'success' : chain === 'VENCIDO' ? 'warning' : 'neutral'
  const shownDays = chain === 'VIGENTE' && daysLeft !== null ? Math.max(0, daysLeft) : null
  return {
    chain,
    daysLeft,
    tone,
    label: shownDays === null ? chain : `${chain} · ${shownDays} d`,
  }
}

export interface HeroStat {
  readonly id: 'confianza' | 'cobertura' | 'vigencia' | 'regimen' | 'exposicion'
  readonly label: string
  /** `null` ⇒ el dato no está (sección restringida o sin producir): se pinta «—». */
  readonly value: string | null
  readonly caption: string | null
  readonly anchor: SectionId
}

/**
 * La tira de cinco métricas del héroe. Es CHROME del panel —no una sección del
 * modelo— y cada celda ancla a la sección que la produce. Sin pago, lo que
 * dependa del número sale `null` (nunca se reconstruye desde otro lado).
 */
export function deriveHeroStats(view: ReportWebView, nowIso: string | null): readonly HeroStat[] {
  const s = view.sections

  const confianza = verdictOf(s['nivel-confianza'])
  const headline = headlineOf(s['valor-estimado'])
  const regimen = verdictOf(s['regimen-mercado'])
  const exposicion = figureOf(s['tiempo-exposicion'], 'rangeDays')
  const daysLeft = daysBetween(nowIso, view.meta.vigenciaHastaIso)

  const coverage =
    headline !== null && headline.band !== null && !headline.band.coverage.missing
      ? headline.band.coverage
      : null

  return [
    {
      id: 'confianza',
      label: 'Nivel de confianza',
      value: confianza === null ? null : confianza.label.toUpperCase(),
      caption:
        confianza !== null && confianza.metric !== null && !confianza.metric.missing
          ? `ancho relativo ${formatScalar(confianza.metric).replace(/^\+/, '')}`
          : null,
      anchor: 'nivel-confianza',
    },
    {
      id: 'cobertura',
      label: 'Cobertura',
      value: coverage === null ? null : formatScalar(coverage),
      caption: coverage === null ? null : 'banda de confianza',
      anchor: 'valor-estimado',
    },
    {
      id: 'vigencia',
      label: 'Vigencia',
      value: daysLeft === null ? null : `${Math.max(0, daysLeft)} d`,
      caption:
        view.meta.vigenciaHastaIso === null
          ? null
          : `hasta ${formatDate(view.meta.vigenciaHastaIso)}`,
      anchor: 'vigencia',
    },
    {
      id: 'regimen',
      label: 'Régimen',
      value: regimen === null ? null : regimen.label.toUpperCase(),
      caption: regimen === null ? null : regimen.lead,
      anchor: 'regimen-mercado',
    },
    {
      id: 'exposicion',
      label: 'Exposición',
      value: exposicion === null ? null : `${exposicion.low}–${exposicion.high} d`,
      caption: exposicion === null ? null : 'días calendario estimados',
      anchor: 'tiempo-exposicion',
    },
  ]
}

export interface HeroBand {
  readonly point: number | null
  readonly low: number
  readonly high: number
  readonly coverageBps: number
  /**
   * Los comparables ajustados llevados al área del sujeto (valor ajustado ÷ área
   * del comparable × área del sujeto). Vacío si la tabla no está (sin pago) o
   * si el área del sujeto no se puede leer: nunca se inventan.
   */
  readonly ticks: readonly number[]
  readonly subjectArea: number | null
}

function subjectAreaOf(sections: ReportWebView['sections']): number | null {
  const candidates = [sections['identificacion-predio'], sections['descripcion-inmueble']]
  for (const node of candidates) {
    const kv = keyValuesOf(node)
    const row = kv?.rows.find((r) => /^área/i.test(r.label))
    if (row !== undefined && !row.value.missing && typeof row.value.raw === 'number') {
      return row.value.raw
    }
  }
  return null
}

/**
 * La banda del héroe: la figura `valueBand` de `valor-estimado`. `null` cuando
 * la figura no viene (sin pago la proyección la retira). Los ticks de los
 * comparables ajustados se fueron con la tabla de comparables (el certificado
 * ya no la publica por decisión de producto): la banda es banda + valor.
 */
export function deriveHeroBand(view: ReportWebView): HeroBand | null {
  const fig = figureOf(view.sections['valor-estimado'], 'valueBand')
  if (fig === null || fig.low === null || fig.high === null) return null
  const subjectArea = subjectAreaOf(view.sections)
  return { point: fig.point, low: fig.low, high: fig.high, coverageBps: fig.coverageBps, ticks: [], subjectArea }
}

export interface ChapterChip {
  readonly label: string
  readonly tone: ChipTone
}

function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * Los chips de la cabecera de un capítulo: cuántas secciones vienen parciales,
 * sin datos o bloqueadas por pago.
 */
export function deriveChapterChips(
  chapter: LandingChapter,
  sections: ReportWebView['sections'],
): readonly ChapterChip[] {
  const nodes = chapter.sections.map((ref) => sections[ref.id])
  const chips: ChapterChip[] = []

  const partial = nodes.filter((n) => n.state === 'partial').length
  const degraded = nodes.filter((n) => n.state === 'degraded')
  const restricted = degraded.filter((n) =>
    n.blocks.some((b) => b.kind === 'placeholder' && b.severity === 'restricted'),
  ).length
  const notApplicable = degraded.filter((n) =>
    n.blocks.some((b) => b.kind === 'placeholder' && b.severity === 'not_applicable'),
  ).length
  const noData = degraded.length - restricted - notApplicable

  if (partial > 0) {
    chips.push({ label: pluralize(partial, 'sección parcial', 'secciones parciales'), tone: 'warning' })
  }
  if (noData > 0) chips.push({ label: pluralize(noData, 'sin datos', 'sin datos'), tone: 'critical' })
  if (restricted > 0) {
    chips.push({ label: pluralize(restricted, 'bloqueada', 'bloqueadas'), tone: 'info' })
  }
  if (notApplicable > 0) {
    chips.push({ label: pluralize(notApplicable, 'no aplica', 'no aplican'), tone: 'neutral' })
  }
  return chips
}

// ---------------------------------------------------------------------------
// Rellenos de dato real
// ---------------------------------------------------------------------------

export type FillerData =
  | {
      readonly kind: 'vigencia-meter'
      /** 0–100: porcentaje de la vigencia ya transcurrido. */
      readonly elapsedPct: number
      readonly daysLeft: number
      readonly totalDays: number
      readonly untilIso: string
    }
  | { readonly kind: 'sector-gauge'; readonly score: number; readonly max: number; readonly label: string }
  | { readonly kind: 'exposure-meter'; readonly low: number; readonly high: number; readonly max: number }
  | {
      readonly kind: 'split-donut'
      readonly parts: readonly { readonly label: string; readonly value: number }[]
      readonly total: number
    }
  | { readonly kind: 'divergence-gauge'; readonly bps: number; readonly thresholdBps: number }

/** El tipo de figura que un relleno REEMPLAZA (para no pintar el dato dos veces). */
export function fillerConsumes(kind: FillerKind): FigureBlock['figure']['type'] | null {
  switch (kind) {
    case 'exposure-meter':
      return 'rangeDays'
    case 'split-donut':
      return 'split'
    case 'divergence-gauge':
      return 'divergence'
    case 'vigencia-meter':
    case 'sector-gauge':
      return null
  }
}

/** Lee «68», «68/100», «68 / 100 — …» → 68. */
function parseScore(raw: number | string | null): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw !== 'string') return null
  const m = /^\s*(\d{1,3})/.exec(raw)
  return m === null ? null : Number(m[1])
}

/**
 * Deriva el relleno de una tarjeta desde SU sección y el `meta`. Devuelve
 * `null` cuando el dato no está: un relleno vacío sería un hueco disfrazado.
 */
export function resolveFiller(
  kind: FillerKind,
  node: ReportSectionNode,
  ctx: { readonly meta: ReportWebView['meta']; readonly nowIso: string | null },
): FillerData | null {
  switch (kind) {
    case 'vigencia-meter': {
      const { issuedAtIso, vigenciaHastaIso } = ctx.meta
      const total = daysBetween(issuedAtIso, vigenciaHastaIso)
      const left = daysBetween(ctx.nowIso, vigenciaHastaIso)
      if (total === null || left === null || total <= 0 || vigenciaHastaIso === null) return null
      const elapsed = Math.min(total, Math.max(0, total - left))
      return {
        kind,
        elapsedPct: Math.round((elapsed / total) * 100),
        daysLeft: Math.max(0, left),
        totalDays: total,
        untilIso: vigenciaHastaIso,
      }
    }
    case 'sector-gauge': {
      const kv = keyValuesOf(node)
      const row = kv?.rows.find((r) => /calidad del entorno/i.test(r.label))
      if (row === undefined || row.value.missing) return null
      const score = parseScore(row.value.raw)
      if (score === null) return null
      return { kind, score, max: 100, label: row.label }
    }
    case 'exposure-meter': {
      const fig = figureOf(node, 'rangeDays')
      if (fig === null) return null
      return { kind, low: fig.low, high: fig.high, max: Math.max(240, fig.high * 1.5) }
    }
    case 'split-donut': {
      const fig = figureOf(node, 'split')
      if (fig === null) return null
      const total = fig.parts.reduce((acc, p) => acc + p.value, 0)
      if (total <= 0) return null
      return { kind, parts: fig.parts, total }
    }
    case 'divergence-gauge': {
      const fig = figureOf(node, 'divergence')
      if (fig === null) return null
      return { kind, bps: fig.bps, thresholdBps: fig.thresholdBps }
    }
  }
}

// ---------------------------------------------------------------------------
// El ensamblado que corre en el servidor
// ---------------------------------------------------------------------------

export interface RenderedSection {
  readonly node: ReportSectionNode
  readonly treatment: Treatment
  /** false ⇒ el contenido va SIEMPRE abierto, nunca dentro de `<details>`. */
  readonly collapsible: boolean
  /** Resumen de una línea para la cabecera cuando va plegada. */
  readonly collapsedHint: string | null
  /** `#NN` del orden canónico. */
  readonly index: number
}

export type RenderedCell =
  | { readonly kind: 'hero'; readonly span: 12; readonly sections: readonly RenderedSection[] }
  | { readonly kind: 'stack'; readonly span: Span; readonly sections: readonly RenderedSection[] }
  | {
      readonly kind: 'section'
      readonly span: Span
      readonly section: RenderedSection
      readonly filler: FillerData | null
    }
  | {
      readonly kind: 'group'
      readonly span: Span
      readonly title: string
      readonly lead: string
      readonly sections: readonly RenderedSection[]
    }

export interface RenderedRow {
  readonly cells: readonly RenderedCell[]
}

export interface RenderedChapter {
  readonly id: string
  readonly title: string
  readonly lead: string | null
  readonly treatment: Treatment
  readonly sections: readonly RenderedSection[]
  readonly rows: readonly RenderedRow[]
  readonly chips: readonly ChapterChip[]
}

export interface LandingView {
  readonly meta: ReportWebView['meta']
  readonly audience: ReportAudience
  readonly paid: boolean
  readonly sample: boolean
  readonly shareNotice: ReportWebView['shareNotice']
  /**
   * El sello real, el QR y el reloj del servidor. Pasa intacto: la
   * presentación no lo reordena ni lo interpreta — eso lo hace la tarjeta del
   * sello (`SealBlockView`). `null` sólo con la muestra.
   */
  readonly render: ReportWebView['render']
  /** El reloj con el que se derivó lo temporal (vigencia). `null` ⇒ sin reloj. */
  readonly nowIso: string | null
  readonly status: DocStatus
  readonly heroStats: readonly HeroStat[]
  /** La banda del héroe con los ticks de comparables. `null` sin pago. */
  readonly heroBand: HeroBand | null
  readonly chapters: readonly RenderedChapter[]
}

/** Un resumen de una línea para la cabecera de una sección plegada. */
function collapsedHintOf(node: ReportSectionNode): string | null {
  const placeholder = node.blocks.find((b) => b.kind === 'placeholder')
  if (placeholder && placeholder.kind === 'placeholder') return placeholder.text

  const verdict = node.blocks.find((b) => b.kind === 'verdict')
  if (verdict && verdict.kind === 'verdict') return verdict.label

  const bullets = node.blocks.find((b) => b.kind === 'bulletList')
  if (bullets && bullets.kind === 'bulletList') {
    const total = bullets.groups.reduce((acc, g) => acc + g.items.length, 0)
    return total === 1 ? '1 punto' : `${total} puntos`
  }

  const chain = node.blocks.find((b) => b.kind === 'statChain')
  if (chain && chain.kind === 'statChain') {
    return chain.steps.length === 1 ? '1 paso' : `${chain.steps.length} pasos`
  }

  return null
}

export interface BuildLandingViewOptions {
  /**
   * Reloj para lo temporal cuando la vista no trae `render.nowIso` (la
   * muestra). Con documento servido gana SIEMPRE el reloj del servidor.
   */
  readonly nowIso?: string
}

/**
 * Arma la vista de presentación desde el Report Model. Corre en el **servidor**
 * (la llama `page.tsx`): el cliente recibe una estructura ya resuelta y
 * serializable, y no vuelve a decidir nada sobre orden ni sobre tratamiento.
 */
export function buildLandingView(view: ReportWebView, opts: BuildLandingViewOptions = {}): LandingView {
  const ctx: TreatmentContext = { audience: view.audience }
  const nowIso = view.render?.nowIso ?? opts.nowIso ?? null

  const renderSection = (ref: LandingSectionRef): RenderedSection => {
    const node = view.sections[ref.id]
    const treatment = resolveTreatment(ref, node, ctx)
    return {
      node,
      treatment,
      collapsible: treatment === 'colapsado',
      collapsedHint: treatment === 'colapsado' ? collapsedHintOf(node) : null,
      index: sectionIndex(ref.id),
    }
  }

  const chapters = LANDING_CHAPTERS.map<RenderedChapter>((chapter) => {
    const byId = new Map<SectionId, RenderedSection>()
    const sections = chapter.sections.map((ref) => {
      const rendered = renderSection(ref)
      byId.set(ref.id, rendered)
      return rendered
    })
    const pick = (id: SectionId): RenderedSection => {
      const found = byId.get(id)
      if (found === undefined) {
        // Imposible si el test de partición pasa; se deja el fallo explícito.
        throw new Error(`landing-layout: la sección ${id} no pertenece al capítulo ${chapter.id}`)
      }
      return found
    }

    const rows = chapter.rows.map<RenderedRow>((row) => ({
      cells: row.cells.map<RenderedCell>((cell) => {
        switch (cell.kind) {
          case 'hero':
            return { kind: 'hero', span: 12, sections: cell.ids.map(pick) }
          case 'stack':
            return { kind: 'stack', span: cell.span, sections: cell.ids.map(pick) }
          case 'group':
            return {
              kind: 'group',
              span: cell.span,
              title: cell.title,
              lead: cell.lead,
              sections: cell.ids.map(pick),
            }
          case 'section': {
            const section = pick(cell.id)
            return {
              kind: 'section',
              span: cell.span,
              section,
              filler:
                cell.filler === undefined
                  ? null
                  : resolveFiller(cell.filler, section.node, { meta: view.meta, nowIso }),
            }
          }
        }
      }),
    }))

    return {
      id: chapter.id,
      title: chapter.title,
      lead: chapter.lead,
      treatment: chapter.treatment,
      sections,
      rows,
      chips: deriveChapterChips(chapter, view.sections),
    }
  })

  return {
    meta: view.meta,
    audience: view.audience,
    paid: view.paid,
    sample: view.sample,
    shareNotice: view.shareNotice,
    render: view.render,
    nowIso,
    status: deriveDocStatus(view, nowIso),
    heroStats: deriveHeroStats(view, nowIso),
    heroBand: deriveHeroBand(view),
    chapters,
  }
}
