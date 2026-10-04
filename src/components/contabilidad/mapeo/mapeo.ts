/**
 * Lo puro del mapeo contable: qué falta, qué se puede sembrar, cómo se lee un
 * lado. Sin React, para probarlo con datos en la mano.
 */
import type {
  CuentaPuc,
  EventoContable,
  LadoDelEvento,
  MapeoContable,
  MapeoDeEvento,
} from '@/lib/api/contabilidad.service';

export const NOMBRE_DEL_LADO: Record<LadoDelEvento, string> = {
  DEBE: 'Débito',
  HABER: 'Crédito',
};

/** Los eventos sin cuenta asignada. */
export function eventosSinCuenta(mapeo: MapeoContable): EventoContable[] {
  // Un evento opcional sin cuenta no es un faltante: su valor va a la de siempre.
  return mapeo.eventos.filter((e) => e.cuenta === null && !e.opcional).map((e) => e.evento);
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
  if (f.has('CARTERA_INQUILINOS')) frases.push('la causación de cada cobro (lo que debe el arrendatario)');
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

// ── CB-28 (QA de Contabilidad, 03-10-2026): cambiar la cuenta se confirma ──

/**
 * ¿Hay que confirmar antes de guardar la cuenta elegida? Sólo al CAMBIAR una
 * cuenta que ya estaba (sin cuenta el evento nunca asentó nada) y, si el back
 * dice cuántos movimientos asentó, sólo si asentó alguno.
 */
export function pideConfirmarElCambio(
  ev: Pick<MapeoDeEvento, 'cuenta' | 'movimientos'>,
  cuentaId: string,
): boolean {
  if (!ev.cuenta || ev.cuenta.id === cuentaId) return false;
  return ev.movimientos === undefined || ev.movimientos > 0;
}

/** «Desde hoy, “Comisión de la inmobiliaria” va a 415510 · …; antes iba a 415505 · ….» */
export function fraseDelCambio(
  ev: Pick<MapeoDeEvento, 'nombre' | 'cuenta' | 'movimientos'>,
  nueva: Pick<CuentaPuc, 'codigo' | 'nombre'> | null,
): string {
  const destino = nueva ? `${nueva.codigo} · ${nueva.nombre}` : 'la cuenta elegida';
  const antes = ev.cuenta ? ` Hasta hoy iba a ${ev.cuenta.codigo} · ${ev.cuenta.nombre}.` : '';
  const cuantos =
    typeof ev.movimientos === 'number' && ev.movimientos > 0
      ? ` Los ${ev.movimientos.toLocaleString('es-CO')} movimientos que ya asentó no se mueven: siguen en la cuenta de antes.`
      : ' Lo que ya está en el libro no se mueve: sigue en la cuenta de antes.';
  return `Desde hoy, «${ev.nombre}» se asienta en ${destino}.${antes}${cuantos}`;
}
