// Pagos — vocabulario de los 13 ESTADOS del ciclo de un pago (visión §6).
//
// UX-only presentation layer. Igual que src/lib/estudio/colors.ts: usa TOKENS
// semánticos del DS (primary/success/warning/danger + *-soft + fg/surface),
// que ya son theme-aware vía CSS vars — NUNCA hex de marca. Cada estado mapea
// a una de 5 familias de tono:
//
//   neutral  → programado · listo_para_enviar · cancelado   (gris, fg-muted/surface-muted)
//   primary  → enviado · visto · en_proceso · en_conciliacion (azul: "en curso")
//   warning  → intento_fallido · pago_parcial · vencido       (ámbar: "atención")
//   success  → pagado · conciliado                            (verde: "cerrado OK")
//   danger   → en_cobranza                                    (rojo: "escaló")

// =============================================================================
// Tipos
// =============================================================================

/** Los 13 estados del ciclo de vida de un pago (visión §6). */
export type PagoEstado =
  | 'programado'
  | 'listo_para_enviar'
  | 'enviado'
  | 'visto'
  | 'intento_fallido'
  | 'en_proceso'
  | 'pagado'
  | 'en_conciliacion'
  | 'conciliado'
  | 'pago_parcial'
  | 'vencido'
  | 'en_cobranza'
  | 'cancelado'

/** Clases de token (theme-aware) para un estado de pago. */
export interface PagoEstadoClasses {
  text: string
  bg: string
  border: string
}

// =============================================================================
// Familias de tono → clases de token
// =============================================================================

const NEUTRAL: PagoEstadoClasses = {
  text: 'text-fg-muted',
  bg: 'bg-surface-muted',
  border: 'border-border',
}

const PRIMARY: PagoEstadoClasses = {
  text: 'text-primary',
  bg: 'bg-primary-soft',
  border: 'border-primary/30',
}

const WARNING: PagoEstadoClasses = {
  text: 'text-warning',
  bg: 'bg-warning-soft',
  border: 'border-warning/30',
}

const SUCCESS: PagoEstadoClasses = {
  text: 'text-success',
  bg: 'bg-success-soft',
  border: 'border-success/30',
}

const DANGER: PagoEstadoClasses = {
  text: 'text-danger',
  bg: 'bg-danger-soft',
  border: 'border-danger/30',
}

// =============================================================================
// Mapa estado → { label ES, clases }
// =============================================================================

interface PagoEstadoMeta {
  label: string
  classes: PagoEstadoClasses
}

const ESTADO_META: Record<PagoEstado, PagoEstadoMeta> = {
  programado: { label: 'Programado', classes: NEUTRAL },
  listo_para_enviar: { label: 'Listo para enviar', classes: NEUTRAL },
  enviado: { label: 'Enviado', classes: PRIMARY },
  visto: { label: 'Visto', classes: PRIMARY },
  intento_fallido: { label: 'Intento fallido', classes: WARNING },
  en_proceso: { label: 'En proceso', classes: PRIMARY },
  pagado: { label: 'Pagado', classes: SUCCESS },
  en_conciliacion: { label: 'En conciliación', classes: PRIMARY },
  conciliado: { label: 'Conciliado', classes: SUCCESS },
  pago_parcial: { label: 'Pago parcial', classes: WARNING },
  vencido: { label: 'Vencido', classes: WARNING },
  en_cobranza: { label: 'En cobranza', classes: DANGER },
  cancelado: { label: 'Cancelado', classes: NEUTRAL },
}

// =============================================================================
// API pública
// =============================================================================

/** Etiqueta en español de un estado. Degrada al valor crudo si es desconocido. */
export function estadoPagoLabel(e: string): string {
  return ESTADO_META[e as PagoEstado]?.label ?? e
}

/**
 * Clases de token (text/bg/border) de un estado de pago. Degrada a la familia
 * neutral si el estado es desconocido (finite-map fallback — nunca crashea).
 */
export function estadoPagoClasses(e: string): PagoEstadoClasses {
  return ESTADO_META[e as PagoEstado]?.classes ?? NEUTRAL
}
