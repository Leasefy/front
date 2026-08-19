/**
 * seal-presentation.ts — qué dice la tarjeta del sello, decidido en un solo lugar.
 *
 * El veredicto NO se calcula acá: viene en `render.seal.state` y es el mismo que
 * responde el verificador público del micro (mismo resolutor). Este módulo sólo
 * lo traduce a copy y tono, y junta en una estructura plana lo que la tarjeta
 * pinta, para que el componente no tenga lógica y esto se pueda probar sin DOM.
 *
 * Tres reglas de producto:
 *   1. `altered` se muestra en negativo y NO se esconde ni se suaviza.
 *   2. `not_found` y `unavailable` comparten UN mismo mensaje neutral: la
 *      tarjeta no dice cuál de los dos falló (misma simetría que el 404).
 *   3. Sin `render` (la muestra) el sello se declara de muestra: sin veredicto,
 *      enlace inerte, con la nota del bloque. Nunca finge una verificación.
 */

import type { ReportRender, SealBlock, SealChainStatus, VerdictTone } from './report-model'

/** El tono de la cadena: vencido es advertencia, no alteración. */
export type SealChainTone = 'positive' | 'warning' | 'neutral'

export interface SealChainPresentation {
  readonly status: SealChainStatus
  readonly tone: SealChainTone
  /** Slug del documento que reemplaza a éste (sólo con `REEMPLAZADO`). */
  readonly supersededBy: string | null
  /**
   * URL del verificador público del documento que reemplaza a éste, cuando se
   * puede derivar de la del actual (misma base, slug nuevo). `null` ⇒ sólo texto.
   */
  readonly supersededVerifyUrl: string | null
}

export interface SealPresentation {
  /** true ⇒ no hay documento emitido detrás (la muestra). */
  readonly sample: boolean
  readonly tone: VerdictTone
  /** La frase del veredicto, tal cual se pinta. */
  readonly headline: string
  readonly detail: string | null
  /** Reloj del servidor cuando se comprobó. `null` en la muestra. */
  readonly checkedAtIso: string | null
  readonly chain: SealChainPresentation | null
  readonly issuer: string
  readonly signedAtIso: string | null
  /** PII del revisor: sólo llega para el dueño. */
  readonly signedBy: string | null
  readonly expiresAtIso: string | null
  readonly methods: readonly string[]
  readonly value: SealBlock['value']
  readonly band: SealBlock['band']
  readonly hashShort: string | null
  /** sha256 completo (64 hex). Es lo que copia el botón «Copiar». */
  readonly hashFull: string | null
  readonly verifyUrl: string
  readonly verifyUrlEnabled: boolean
  readonly note: string | null
}

/** La nota de la muestra cuando el bloque no trae ninguna: no hubo verificación real. */
export const SAMPLE_SEAL_NOTE =
  'Sin verificación real: datos de muestra, sin documento emitido detrás.'

export const SEAL_HEADLINE = {
  valid: 'Verificado: el documento servido coincide con el sello',
  altered: 'Alterado: los bytes servidos NO coinciden con el sello',
  unavailable: 'Verificación no disponible en este momento',
  sample: 'Sin verificación real',
} as const

const SEAL_DETAIL = {
  valid:
    'El veredicto es el mismo que responde el verificador público; se puede comprobar en la dirección de abajo.',
  altered:
    'El contenido servido no es el que se firmó. Este documento no sirve como prueba de nada hasta comprobarlo en el verificador público.',
  unavailable:
    'El sello no se pudo comprobar ahora. El verificador público sigue disponible en la dirección de abajo.',
} as const

const CHAIN_TONE: Readonly<Record<SealChainStatus, SealChainTone>> = {
  VIGENTE: 'positive',
  VENCIDO: 'warning',
  REEMPLAZADO: 'neutral',
}

/**
 * Deriva la URL del verificador de OTRO slug a partir de la del actual, sólo si
 * la actual termina en `/<slug actual>` (la forma `publicVerifyUrl(slug)` del
 * micro). Si no, `null`: mejor texto que un enlace inventado.
 */
export function deriveVerifyUrlFor(
  currentVerifyUrl: string,
  currentSlug: string,
  targetSlug: string,
): string | null {
  const suffix = `/${currentSlug}`
  if (currentSlug.length === 0 || targetSlug.length === 0) return null
  if (!currentVerifyUrl.endsWith(suffix)) return null
  return `${currentVerifyUrl.slice(0, -suffix.length)}/${encodeURIComponent(targetSlug)}`
}

function chainOf(render: ReportRender, slug: string): SealChainPresentation | null {
  const status = render.seal.chainStatus
  if (status === null) return null
  const supersededBy = status === 'REEMPLAZADO' ? render.seal.supersededBy : null
  // La cadena de vigencia y la integridad de los bytes son dos cosas distintas
  // (`/verify` las computa por separado), pero un «VIGENTE» en verde al lado de
  // «Alterado» se lee como contradicción. Si el veredicto no es «válido», la
  // cadena se informa en neutro: el estado sigue, el color no compite.
  const tone: SealChainTone =
    render.seal.state === 'valid' ? CHAIN_TONE[status] : status === 'VENCIDO' ? 'warning' : 'neutral'
  return {
    status,
    tone,
    supersededBy,
    supersededVerifyUrl:
      supersededBy === null ? null : deriveVerifyUrlFor(render.seal.verifyUrl, slug, supersededBy),
  }
}

/**
 * Arma la presentación del sello. `slug` es el del documento (para derivar el
 * enlace del reemplazo); `render === null` ⇒ muestra.
 */
export function resolveSealPresentation(
  block: SealBlock,
  render: ReportRender | null,
  slug: string,
): SealPresentation {
  if (render === null) {
    return {
      sample: true,
      tone: 'neutral',
      headline: SEAL_HEADLINE.sample,
      detail: null,
      checkedAtIso: null,
      chain: null,
      issuer: block.issuer,
      signedAtIso: block.signedAtIso,
      signedBy: null,
      expiresAtIso: block.expiresAtIso,
      methods: block.methods,
      value: block.value,
      band: block.band,
      hashShort: block.certContentHashCorto,
      hashFull: null,
      verifyUrl: block.verifyUrl,
      // La muestra nunca navega: el slug no existe en ningún verificador.
      verifyUrlEnabled: false,
      // Sin `render` no hubo verificación real: se dice, venga o no la nota
      // en el bloque (la muestra del micro trae `note: null`).
      note: block.note ?? SAMPLE_SEAL_NOTE,
    }
  }

  const { seal } = render
  const state = seal.state
  const tone: VerdictTone =
    state === 'valid' ? 'positive' : state === 'altered' ? 'negative' : 'neutral'
  const key = state === 'valid' ? 'valid' : state === 'altered' ? 'altered' : 'unavailable'

  return {
    sample: false,
    tone,
    headline: SEAL_HEADLINE[key],
    detail: SEAL_DETAIL[key],
    checkedAtIso: render.nowIso,
    chain: chainOf(render, slug),
    issuer: seal.issuer,
    signedAtIso: seal.signedAtIso,
    signedBy: seal.signedBy,
    expiresAtIso: seal.expiresAtIso,
    methods: seal.methods,
    value: block.value,
    band: block.band,
    hashShort: block.certContentHashCorto ?? seal.certContentHash?.slice(0, 12) ?? null,
    hashFull: seal.certContentHash,
    verifyUrl: seal.verifyUrl,
    verifyUrlEnabled: block.verifyUrlEnabled,
    note: block.note,
  }
}
