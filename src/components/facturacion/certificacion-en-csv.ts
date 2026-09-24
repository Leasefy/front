/**
 * El CSV de la certificación del mandatario — una fila por factura.
 *
 * Vive aparte de la pantalla porque lo usan dos: el cajón que la genera (lo
 * ofrece recién hecha) y la tabla de las ya generadas. Puesto en cualquiera de
 * los dos, el otro tendría que importar un componente para usar una función.
 *
 * «Qué tan fácil de DISTRIBUIR sea dentro del software» (el CEO): esto es lo
 * que el propietario le pasa a su contador.
 */

import type { CertificacionGenerada } from '@/lib/api/facturacion-electronica.service'

/** Las filas del CSV, como las lee un contador. */
export function comoCsv(c: CertificacionGenerada): string {
  const cabecera = [
    'Factura',
    'Mes',
    'Inmueble',
    'Inquilino',
    'Documento',
    'Base',
    'IVA',
    'Retefuente',
    'ReteIVA',
    'ReteICA',
    'Total',
    'Notas credito',
  ].join(';')
  const filas = c.detalle.map((r) =>
    [
      r.numeroDian ?? '',
      r.mes,
      // 🔴 El punto y coma del nombre se cambia por una coma: si no, la fila se
      // parte en dos columnas y el contador lee otra cosa.
      r.inmueble.replace(/;/g, ','),
      r.inquilino.replace(/;/g, ','),
      r.inquilinoDocumento ?? '',
      r.baseCop,
      r.ivaCop,
      r.retefuenteCop,
      r.reteivaCop,
      r.reteicaCop,
      r.totalCop,
      r.notasCreditoCop,
    ].join(';'),
  )
  return [cabecera, ...filas].join('\n')
}
