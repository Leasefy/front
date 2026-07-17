/**
 * Typed vignette + product data model for the product-page port
 * (landing-react-port SLICE 4a). Mirrors the standalone's `PRODUCTS`/`VG`
 * runtime shape (`landing-standalone/index.html`, `PRODUCTS` ~L3487-3647,
 * `VG` ~L3689-3721) as a compile-time-checked discriminated union instead
 * of untyped JS object literals + string-concatenation HTML builders.
 *
 * `ProductPage`/`MegaMenu`/`VideoBanner` (consuming `stories`/`capabilities`/
 * `snapshot`/`steps`/`night`) are SLICE 4b scope — this file only needs to
 * model the full `Product` shape because `products.ts` (also S4a) populates
 * every field up front for that later consumer.
 */
import type { TextureId } from './assets'

export type VignetteFamily = 'sys' | 'ag' | 'chat'
export type Tone = 'ok' | 'mb'

export interface VignetteHeader {
  /** Primary label, e.g. "Hoy" or "WhatsApp · Laura" (standalone hd[0]). */
  label: string
  /** Right-aligned meta, e.g. "23 solicitudes" or a timestamp (hd[1]). */
  meta?: string
  /** Header color variant: sys->black ERP, ag->blue agent, chat->white (hd[2]). */
  family: VignetteFamily
}

export interface RowItem {
  label: string
  value: string
  tone?: Tone
}
export interface RowsVignetteData {
  rows: RowItem[]
}

export interface ChatMessage {
  direction: 'in' | 'out'
  text: string
  time?: string
}
export interface ChatVignetteData {
  messages: ChatMessage[]
}

export type StepStatus = 'done' | 'on'
export interface StepItem {
  title: string
  meta?: string
  /** Omitted entirely for a step that hasn't started yet (standalone ss[2] === ''). */
  status?: StepStatus
}
export interface StepsVignetteData {
  steps: StepItem[]
}

export interface StatVignetteData {
  /**
   * Headline figure. May contain a literal `<em>` for inline emphasis,
   * carried over verbatim from the standalone copy (e.g. "Día <em>1</em>",
   * "209<em>/214</em>"). This is static, developer-authored data — never
   * user input — so `StatVignette` renders it via a narrowly-scoped
   * `dangerouslySetInnerHTML` rather than inventing a separate structured
   * emphasis field (copy review is deferred, see HANDOFF "Pendientes").
   */
  big: string
  label: string
  sub?: string
}

export interface LedgerRow {
  cells: [string, string, string]
  tone?: Tone
}
export interface LedgerVignetteData {
  columns: [string, string, string]
  rows: LedgerRow[]
}

export interface DocVignetteData {
  title: string
  lines: string[]
}

interface VignetteBase {
  header: VignetteHeader
  /** Optional corner stamp, e.g. "Riesgo bajo" or "Aprobado ✓" (standalone v.st). */
  stamp?: string
}

export type Vignette =
  | (VignetteBase & { kind: 'rows'; data: RowsVignetteData })
  | (VignetteBase & { kind: 'chat'; data: ChatVignetteData })
  | (VignetteBase & { kind: 'steps'; data: StepsVignetteData })
  | (VignetteBase & { kind: 'stat'; data: StatVignetteData })
  | (VignetteBase & { kind: 'ledger'; data: LedgerVignetteData })
  | (VignetteBase & { kind: 'doc'; data: DocVignetteData })

export type VignetteKind = Vignette['kind']

export interface ProductStory {
  kicker: string
  h3: string
  body: string
  vignette: Vignette
}

export interface ProductCapability {
  title: string
  body: string
}

export interface ProductSnapshotRow {
  label: string
  /** May contain a literal `<b>` tag, carried over verbatim (standalone specs[i][1]). */
  value: string
}

export interface ProductStep {
  title: string
  body: string
}

export interface ProductNightLogEntry {
  time: string
  /** May contain a literal `<span class="lb">` tag, carried over verbatim. */
  text: string
}

export interface ProductNight {
  kicker: string
  /** May contain a literal `<em>` tag, carried over verbatim. */
  h2: string
  quote: string
  log: ProductNightLogEntry[]
}

export interface ProductCta {
  label: string
  href: string
}

export type ProductSlug =
  | 'crm'
  | 'erp'
  | 'cobranza'
  | 'inquilino'
  | 'avaluos'
  | 'conciliacion'
  | 'matching'
  | 'asegurabilidad'

export interface ProductWindow {
  title: string
  tag: string
  vignettes: Vignette[]
}

export interface Product {
  slug: ProductSlug
  /** e.g. "Sistema · Módulo 01" or "Agentes AI · 01" (standalone `k`). */
  eyebrow: string
  /** e.g. "CRM" or "Agente" (standalone `badge`). */
  badge: string
  /** Product display name, e.g. "CRM inmobiliario" (standalone `t`). */
  name: string
  /** Hero H1 promise, e.g. "Tu comercial, de punta a punta" (standalone `promise`). */
  h1: string
  lead: string
  ctas: ProductCta[]
  textureId: TextureId
  window: ProductWindow
  stories: ProductStory[]
  capabilities: ProductCapability[]
  snapshot: ProductSnapshotRow[]
  steps: ProductStep[]
  night: ProductNight
  /** Closing demo-prompt line (standalone `cx`). */
  demoPrompt: string
}
