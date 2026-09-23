/**
 * Cambiar un egreso ya registrado: qué ofrece el cajón y qué se manda.
 *
 * Nico (22-09): «deberíamos dar la posibilidad de poder entrar para modificar
 * los egresos y cambiar la fecha de egreso, porque justamente puede pasar que
 * si lo envío al banco y no llega o lo rechaza, en contabilidad no entró ese
 * día».
 *
 * 🔴 El back es la autoridad (`cambio-de-egreso.ts` del back): acá sólo se
 * DESHABILITA lo que ya se sabe que va a responder que no, con su porqué, para
 * que nadie escriba un motivo y reciba un 409. Si esto se equivoca hacia el
 * «sí», el back responde en palabras y el cajón lo muestra.
 *
 * Qué NO se ofrece, y es a propósito: el monto y el beneficiario. La plata ya le
 * llegó a alguien por un valor; eso se corrige anulando y volviendo a registrar.
 */

import type { CambiosDelEgreso, Egreso } from '@/lib/api/gastos.service';
import { diaDe } from './fechas';

export interface Permiso {
  puede: boolean;
  /** Por qué no. `null` cuando sí. */
  motivo: string | null;
}

export interface LoQueSePuedeCambiar {
  fecha: Permiso;
  referencia: Permiso;
  nota: Permiso;
}

const SI: Permiso = { puede: true, motivo: null };

/**
 * `escritura` es el motivo de `usePuedeEscribir` (rol sin permiso, sesión sin
 * resolver): manda sobre todo lo demás, porque una pantalla negada no deja
 * hacer nada.
 */
export function queSePuedeCambiar(
  egreso: Pick<Egreso, 'estado' | 'fechaDelEgreso'>,
  escritura: { puede: boolean; motivo: string | null },
): LoQueSePuedeCambiar {
  if (!escritura.puede) {
    const no = { puede: false, motivo: escritura.motivo ?? 'No tienes permiso para mover la contabilidad.' };
    return { fecha: no, referencia: no, nota: no };
  }
  if (egreso.estado === 'ANULADO') {
    const no = {
      puede: false,
      motivo: 'Este egreso está anulado: no se le cambia nada. Si hay que pagarlo, se registra otro.',
    };
    return { fecha: no, referencia: no, nota: no };
  }
  const pagado = egreso.estado === 'PAGADO' && Boolean(diaDe(egreso.fechaDelEgreso));
  return {
    fecha: pagado
      ? SI
      : {
          puede: false,
          motivo:
            'La fecha la pone el pago del lote: mientras el egreso no se pague, no hay fecha que corregir.',
        },
    referencia: pagado
      ? SI
      : {
          puede: false,
          motivo: 'Todavía no hay transferencia: la referencia existe cuando el lote se paga.',
        },
    nota: SI,
  };
}

/** Lo que el cajón tiene escrito. */
export interface BorradorDelCambio {
  fecha: string;
  referencia: string;
  nota: string;
  motivo: string;
}

/** Lo que el egreso dice hoy (la referencia y la nota vienen del historial). */
export interface LoQueDiceHoy {
  fecha: string;
  referencia: string | null;
  nota: string | null;
}

/**
 * El cuerpo del POST: SÓLO lo que cambió. Mandar la misma fecha haría que el
 * back respondiera `SIN_CAMBIOS` a un pedido que sólo quería cambiar la nota.
 * `null` si no cambió nada.
 */
export function pedidoDelCambio(
  hoy: LoQueDiceHoy,
  borrador: BorradorDelCambio,
): CambiosDelEgreso | null {
  const pedido: CambiosDelEgreso = {};
  const fecha = borrador.fecha.trim();
  if (fecha && fecha !== hoy.fecha) pedido.fecha = fecha;
  const referencia = borrador.referencia.trim();
  if (referencia !== (hoy.referencia ?? '')) pedido.referencia = referencia;
  const nota = borrador.nota.trim();
  if (nota !== (hoy.nota ?? '')) pedido.nota = nota;
  if (Object.keys(pedido).length === 0) return null;
  const motivo = borrador.motivo.trim();
  if (motivo) pedido.motivo = motivo;
  return pedido;
}

/**
 * Por qué no se puede guardar todavía, o `null`. Es la misma regla del back:
 * cambiar la fecha o la referencia exige motivo; una nota no; una fecha futura
 * no entra.
 */
export function faltaParaGuardar(
  pedido: CambiosDelEgreso | null,
  hoyEs: string,
): string | null {
  if (!pedido) return 'No hay nada que guardar: lo escrito es lo que el egreso ya dice.';
  if (pedido.fecha && pedido.fecha > hoyEs) {
    return 'Esa fecha todavía no llega: un egreso registra plata que ya salió del banco.';
  }
  if ((pedido.fecha !== undefined || pedido.referencia !== undefined) && !pedido.motivo) {
    return pedido.fecha !== undefined
      ? 'Escribe el motivo: cambiar la fecha mueve el asiento del egreso.'
      : 'Escribe el motivo: la referencia es con lo que se cruza el egreso contra el extracto.';
  }
  return null;
}

const NOMBRE_DEL_CAMPO = {
  FECHA: 'Fecha',
  REFERENCIA: 'Referencia',
  NOTA: 'Nota',
} as const;

export function nombreDelCampo(campo: keyof typeof NOMBRE_DEL_CAMPO): string {
  return NOMBRE_DEL_CAMPO[campo];
}
