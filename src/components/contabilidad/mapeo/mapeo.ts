/**
 * Lo puro del mapeo contable: qué falta, qué se puede sembrar, cómo se lee un
 * lado. Sin React, para probarlo con datos en la mano.
 */
import type { EventoContable, LadoDelEvento, MapeoContable } from '@/lib/api/contabilidad.service';

export const NOMBRE_DEL_LADO: Record<LadoDelEvento, string> = {
  DEBE: 'Débito',
  HABER: 'Crédito',
};

/** Los eventos sin cuenta asignada. */
export function eventosSinCuenta(mapeo: MapeoContable): EventoContable[] {
  return mapeo.eventos.filter((e) => e.cuenta === null).map((e) => e.evento);
}

/** Los eventos vacíos que la semilla SÍ puede llenar (la agencia tiene la cuenta propuesta, activa e imputable). */
export function eventosSembrables(mapeo: MapeoContable): EventoContable[] {
  return mapeo.eventos
    .filter((e) => e.cuenta === null && e.propuesta !== null && e.propuesta.activa && e.propuesta.imputable)
    .map((e) => e.evento);
}

/** Qué asientos automáticos quedan apagados por lo que falta, en palabras. */
export function loQueNoSeAsienta(faltantes: readonly EventoContable[]): string[] {
  const f = new Set(faltantes);
  const frases: string[] = [];
  if (f.has('RECIBO_BANCOS') || f.has('RECAUDO_CANON_TERCEROS')) {
    frases.push('los recibos de caja por transferencia, PSE o pasarela');
  }
  if (f.has('RECIBO_CAJA')) frases.push('los recibos de caja en efectivo');
  if (f.has('RECAUDO_ADMINISTRACION')) frases.push('los recibos que traen cuota de administración');
  if (f.has('RECAUDO_OTROS_TERCEROS')) frases.push('los recibos con mora, gastos u otros conceptos');
  if (f.has('GIRO_PROPIETARIO_BANCOS') || f.has('RECAUDO_CANON_TERCEROS')) frases.push('los lotes de pago a propietarios');
  if (f.has('INGRESO_COMISION')) frases.push('los lotes que liquidan comisión');
  return [...new Set(frases)];
}
