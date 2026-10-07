/**
 * «Próximo pago» del portal del inquilino (Inicio y «Mi arriendo»).
 *
 * 🔴 QA-INQ-95 / QA-CONT-95 (04-10-2026): el contrato #53 de Sofía (del 4 de
 * octubre de 2026 al 3 de octubre de 2027, cuotas que vencen el 1 de cada mes)
 * decía en «Mi arriendo» «Próximo pago $1.650.000 · 5 de nov», mientras «Pagos»
 * y la base decían que la cuota de noviembre vence el 1 de nov y que lo vencido
 * hoy es la de octubre, prorrateada, $1.485.000. «Mi arriendo» leía
 * `/tenant-payments/mine`: cuotas sintéticas armadas con el día pactado del
 * arriendo (`paymentDay` 5) y el canon entero, el modelo viejo que un contrato
 * migrado ni trae.
 *
 * La deuda nace con el CONTRATO y su documento es el estado de cuenta: el
 * próximo pago sale de `resumirElCliente`, la MISMA cuenta que «Próxima cuota»
 * de «Pagos». Así las tres pantallas del portal dicen lo mismo, para un
 * contrato migrado y para uno nativo.
 */

import { resumirElCliente } from '@/components/estado-de-cuenta/resumen';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

export interface ProximoPagoDelPortal {
  valor: number;
  /** `YYYY-MM-DD`: el vencimiento de la cuota. */
  fecha: string;
}

/**
 * La primera cuota que todavía no vence. Con `contratoId`, sólo la de ese
 * contrato (una tarjeta por arriendo); sin él, la más cercana de todos.
 * `null` si no queda ninguna por vencer o el contrato no está en el documento:
 * nunca se inventa una.
 */
export function proximoPagoDelPortal(
  doc: EstadoDeCuenta,
  hoy: string,
  contratoId?: string | null,
): ProximoPagoDelPortal | null {
  const contratos =
    contratoId === undefined ? doc.contratos : doc.contratos.filter((c) => c.id === contratoId);
  if (contratos.length === 0) return null;
  // `proximaCuota` es sólo del propietario; del lado del inquilino no viene.
  const r = resumirElCliente({ ...doc, contratos, proximaCuota: undefined }, hoy);
  return r.proxima ? { valor: r.proxima.valor, fecha: r.proxima.fecha } : null;
}
