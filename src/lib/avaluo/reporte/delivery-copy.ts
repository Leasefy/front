/**
 * delivery-copy.ts — el aviso de reserva cuando el front no tiene copy del
 * productor (T-0007 §3.2.4).
 *
 * Se usa SÓLO cuando `delivery` viene ausente o roto — el modo más
 * restrictivo, sin ningún dato del `avaluo` que confiar. El string está
 * pinneado VERBATIM en el contrato congelado y verificado limpio contra
 * `SURFACE_FORBIDDEN_LEXICON` (Ley 1673): nadie debe re-tipearlo, traducirlo
 * ni acortarlo.
 */
export const FALLBACK_ESTIMATE_NOTICE =
  'Documento preliminar. Esta estimación comercial de valor referencial fue generada mediante inteligencia artificial y aún no ha sido validada manualmente. La descarga en PDF se habilita una vez completada la validación.'
