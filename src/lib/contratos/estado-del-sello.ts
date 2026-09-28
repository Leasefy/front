/**
 * T-0109 contract.md §3.1.B / §3.2 — cómo leer `documentoFirmado.sealStatus`
 * en la ficha del contrato. Pura, sin componentes: se prueba sin montar
 * nada. `describirEstadoDeSello` decide TAMBIÉN cuándo ocultar la sección
 * entera (ausente/null/parcial), no sólo el texto del badge — así el caller
 * no repite esas tres condiciones en cada pantalla que lo use.
 */
import type { DocumentoFirmado } from '@/lib/types/contract';

export interface EstadoDeSello {
  etiqueta: string;
  tono: 'success' | 'warning' | 'danger';
  /** `true` sólo en FAILED — el caller decide si mostrar el botón (además, gateado por `contratos:edit`). */
  puedeReintentar: boolean;
}

/**
 * `undefined` (back anterior a T-0109), `null` (contrato legacy sin fila de
 * versión) o `kind === 'CONTRACT_PARTIAL'` (nunca se sella un parcial) →
 * `null`: el caller oculta toda la sección de sello, no sólo el badge.
 */
export function describirEstadoDeSello(
  documentoFirmado: DocumentoFirmado | null | undefined,
): EstadoDeSello | null {
  if (!documentoFirmado) return null;
  if (documentoFirmado.kind !== 'CONTRACT_FINAL') return null;

  switch (documentoFirmado.sealStatus) {
    case 'SEALED':
      return { etiqueta: 'Sellado', tono: 'success', puedeReintentar: false };
    case 'FAILED':
      return { etiqueta: 'Sello fallido', tono: 'danger', puedeReintentar: true };
    case 'PENDING':
    default:
      // contract.md §3.2 — "Unknown value → treat as PENDING."
      return { etiqueta: 'Sello en proceso', tono: 'warning', puedeReintentar: false };
  }
}
