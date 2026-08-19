/**
 * fixture-muestra.ts — el juego de datos de muestra del informe, para TESTS.
 *
 * ⚠️ DATOS FICTICIOS. No corresponden a ningún inmueble ni a ninguna persona
 * reales, y el documento que arman no tiene validez (dirección
 * `Calle 127 # 00-00 · Apto 000 · Torre DEMO`, firma «Revisor de Muestra
 * (demo)», `sample: true`).
 *
 * UNA SOLA FUENTE: la vista sale de `report-serve.sample.json`, que ESCRIBE EL
 * MICRO (`scripts/write-report-serve-sample.ts` sobre `buildSampleServeResponse`,
 * es decir, los MISMOS builders del Report Model que sirven un informe real).
 * Antes esta fixture era una copia a mano de ~1.300 líneas que se desalineaba
 * del certificado con cada cambio de producto; ahora, cuando el micro cambia
 * una sección, se regenera el JSON, se copia y los tests del front ven el
 * cambio sin reescribir nada.
 *
 * Lo que se le quita al JSON servido para que sea LA MUESTRA y no un documento
 * emitido: `render: null` (sin sello real, sin QR, sin fotos presignadas: la
 * tarjeta del sello se declara de muestra en vez de fingir un veredicto),
 * `verifyUrlEnabled: false` (el slug no existe en ningún verificador) y un
 * `paywallCtaHref` que manda a la página del producto (la muestra no pertenece
 * a ninguna solicitud).
 *
 * En producción NADIE importa esto: `getReportView` no tiene camino de muestra.
 */
import sampleJson from './report-serve.sample.json'
import type { ReportWebView } from './report-model'
import { parseReportServeResponse } from './report-serve.schema'

const parsed = parseReportServeResponse(sampleJson)
if (!parsed.ok) {
  // La fixture compartida no valida contra el contrato: eso es un bug del
  // micro o del contrato, y ningún test debería seguir como si nada.
  throw new Error(`report-serve.sample.json no cumple el contrato: ${parsed.issues.join(' · ')}`)
}

/** El slug de la muestra (el que trae el JSON del micro). */
export const FIXTURE_SLUG = parsed.view.meta.slug

/** El titular de la muestra, en crudo. Lo usan los tests del paywall. */
export const FIXTURE_HEADLINE_COP = ((): number => {
  const headline = parsed.view.sections['valor-estimado'].blocks.find((b) => b.kind === 'headline')
  if (headline === undefined || headline.kind !== 'headline' || typeof headline.value.raw !== 'number') {
    throw new Error('la muestra no trae el titular de valor-estimado')
  }
  return headline.value.raw
})()

/**
 * La vista de muestra, sin proyectar. Sólo los tests la consumen.
 */
export const FIXTURE_VIEW: ReportWebView = {
  ...parsed.view,
  meta: {
    ...parsed.view.meta,
    verifyUrlEnabled: false,
    paywallCtaHref: '/avaluo',
  },
  sample: true,
  render: null,
}
