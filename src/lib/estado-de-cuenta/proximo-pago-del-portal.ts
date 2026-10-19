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
  /** Todo lo que vence ese día (la suma, si son varias). */
  valor: number;
  /** `YYYY-MM-DD`: el vencimiento. */
  fecha: string;
  /** Cuántas cuotas o conceptos vencen ese día (1 casi siempre). */
  cuantas: number;
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
  if (!r.proxima) return null;
  /*
   * QA 17-10 (Nico, «Inicio de arrendatario»): si ese MISMO día vence más de
   * una (dos cuotas, o la cuota y un concepto), el próximo pago es la suma: el
   * panel de la inmobiliaria decía «$ 3.165.472,41 en 15 días» y el portal sólo
   * una de las dos cuotas.
   */
  const fecha = r.proxima.fecha;
  const delMismoDia = contratos
    .flatMap((c) => [...c.secciones.arriendos, ...c.secciones.otrosConceptos])
    .filter(
      (f) =>
        f.estado === 'PENDIENTE' &&
        f.fechaVencimiento.slice(0, 10) === fecha &&
        f.cajon !== 'CARTERA' &&
        f.cajon !== 'VENCIDA_EN_PLAZO',
    );
  if (delMismoDia.length === 0) return { valor: r.proxima.valor, fecha, cuantas: 1 };
  return {
    // En centavos enteros: $ 1.640.500,50 + $ 1.524.971,91 no deja ruido de flotante.
    valor: delMismoDia.reduce((s, f) => s + Math.round(f.valorNeto * 100), 0) / 100,
    fecha,
    cuantas: delMismoDia.length,
  };
}
