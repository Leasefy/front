/**
 * Lo puro del egreso y de su lote: qué se puede armar, qué suma, y qué acción
 * habilita cada estado.
 *
 * ── Por qué las acciones se deciden acá y no en el botón ────────────────────
 *
 * Un lote de egresos recorre seis estados y en cada uno cambia qué se puede
 * hacer: un lote en BORRADOR no se puede pagar, uno PAGADO no se puede aprobar,
 * y el archivo del banco sólo sale de APROBADO o ARCHIVO_GENERADO. Si eso vive
 * en el JSX, cada botón tiene su propio `lote.estado === …` y el día que se
 * agrega un estado hay que acordarse de seis lugares. Acá es una tabla, con un
 * test que la recorre entera.
 *
 * Y cada acción imposible viene con su MOTIVO, no con un booleano: un botón gris
 * sin explicación manda a adivinar. «Este lote ya se pagó el 20 de septiembre»
 * cierra la pregunta.
 *
 * ── 🔴 El aprobador tiene que ser otra persona ──────────────────────────────
 *
 * El back devuelve 409 `APROBADOR_ES_EL_MISMO` a quien intenta aprobar el lote
 * que él mismo armó. Es el control de doble firma sobre plata que sale del
 * banco, y la pantalla lo dice ANTES de que se haga el clic (deshabilitando con
 * su motivo) Y DESPUÉS si el 409 llega igual —porque la sesión puede no saber
 * quién armó el lote si el back no manda `creadoPorUserId`—. Las dos cosas: la
 * primera es cortesía, la segunda es la que nunca miente.
 */

import type {
  Egreso,
  EstadoDelLoteDeEgreso,
  LoteDeEgreso,
} from '@/lib/api/gastos.service';
import { diaLegible } from './fechas';

/** Los egresos que se pueden meter en un lote nuevo. */
export function egresosArmables(egresos: readonly Egreso[]): Egreso[] {
  return egresos.filter((e) => e.estado === 'PENDIENTE');
}

/** Lo que el lote le va a sacar al banco: la suma de los NETOS, no de los valores. */
export function totalDelLote(egresos: readonly Egreso[]): number {
  return egresos.reduce((suma, e) => suma + e.netoCop, 0);
}

/** Lo que se le retuvo al conjunto, que es lo que después se declara. */
export function retencionesDelLote(egresos: readonly Egreso[]): number {
  return egresos.reduce(
    (suma, e) => suma + e.retefuenteCop + e.reteivaCop + e.reteicaCop,
    0,
  );
}

/** Cuántos egresos del lote quedaron sin conciliar contra el extracto. */
export function sinConciliar(egresos: readonly Egreso[]): number {
  return egresos.filter((e) => e.estado === 'PAGADO' && e.movimientoBancarioId === null).length;
}

// ── Qué se puede hacer con un lote ─────────────────────────────────────────

export type AccionDelLote = 'aprobar' | 'archivo' | 'pagado' | 'anular';

export interface Permiso {
  puede: boolean;
  /** Por qué no. `null` cuando sí se puede. */
  motivo: string | null;
}

const SI: Permiso = { puede: true, motivo: null };

const no = (motivo: string): Permiso => ({ puede: false, motivo });

/** Cómo se nombra cada estado cuando hay que explicar por qué algo no se puede. */
const EN_ESTADO: Record<EstadoDelLoteDeEgreso, string> = {
  BORRADOR: 'todavía es un borrador',
  ESPERANDO_APROBACION: 'está esperando aprobación',
  APROBADO: 'ya está aprobado',
  ARCHIVO_GENERADO: 'ya tiene el archivo generado',
  PAGADO: 'ya se pagó',
  ANULADO: 'está anulado',
};

/**
 * Qué se puede hacer con este lote, y si no, por qué.
 *
 * `usuarioId` es quien está mirando: con él se puede avisar del 409 de doble
 * firma antes del clic. Sin él (o sin `creadoPorUserId` en el lote) no se
 * afirma nada: se deja aprobar y el 409 del back es el que decide. Adivinar
 * «sos el mismo» sin dato bloquearía a un contador que no armó el lote.
 */
export function permisosDelLote(
  lote: Pick<
    LoteDeEgreso,
    'estado' | 'cantidad' | 'creadoPorUserId' | 'pagadoAt' | 'formatoArchivo'
  >,
  usuarioId?: string | null,
): Record<AccionDelLote, Permiso> {
  const estado = lote.estado;

  const anular: Permiso =
    estado === 'PAGADO'
      ? no(
          `Este lote ${lote.pagadoAt ? `se pagó el ${diaLegible(lote.pagadoAt)}` : 'ya se pagó'}: la plata salió del banco. Anula cada egreso, que reversa su asiento.`,
        )
      : estado === 'ANULADO'
        ? no('Este lote ya está anulado.')
        : SI;

  if (estado === 'ANULADO') {
    return {
      aprobar: no('Este lote está anulado.'),
      archivo: no('Este lote está anulado: no sale archivo para el banco.'),
      pagado: no('Este lote está anulado.'),
      anular,
    };
  }

  const puedeAprobar =
    estado === 'BORRADOR' || estado === 'ESPERANDO_APROBACION'
      ? lote.cantidad === 0
        ? no('El lote está vacío: no hay nada que aprobar.')
        : /*
           * 🔴 El control de doble firma, dicho antes del clic. Sólo cuando se
           * SABEN las dos partes: si falta alguna, se deja intentar y el 409
           * del back es la autoridad.
           */
          usuarioId && lote.creadoPorUserId && usuarioId === lote.creadoPorUserId
          ? no(
              'Este lote lo armaste vos: lo tiene que aprobar otra persona. Es plata que sale del banco y la aprobación es la segunda firma.',
            )
          : SI
      : no(`Este lote ${EN_ESTADO[estado]}.`);

  const puedeArchivo =
    estado === 'APROBADO' || estado === 'ARCHIVO_GENERADO'
      ? SI
      : no(
          estado === 'PAGADO'
            ? 'El lote ya se pagó: el archivo se bajó antes de pagarlo.'
            : `Primero hay que aprobar el lote: ${EN_ESTADO[estado]}.`,
        );

  const puedePagado =
    estado === 'ARCHIVO_GENERADO'
      ? SI
      : estado === 'APROBADO'
        ? no('Primero bajá el archivo para el banco: marcar pagado sin subirlo asienta una salida que no ocurrió.')
        : no(`Este lote ${EN_ESTADO[estado]}.`);

  return { aprobar: puedeAprobar, archivo: puedeArchivo, pagado: puedePagado, anular };
}

/**
 * El 409 de doble firma, en palabras. Se usa cuando el back lo devuelve, sin
 * importar lo que la pantalla creyera saber de quién armó el lote.
 */
export const MOTIVO_DEL_MISMO_APROBADOR =
  'Este lote lo armó la misma persona que está aprobando. La aprobación es la segunda firma sobre plata que sale del banco: la tiene que dar otra persona de la inmobiliaria (ADMIN o CONTADOR).';

/** `egresos-lote-<id>-<formato>.csv`, para que el archivo del banco se reconozca. */
export function nombreDelArchivoDelLote(loteId: string, formato: string | null): string {
  const sufijo = formato ? `-${formato.toLowerCase()}` : '';
  return `egresos-lote-${loteId}${sufijo}.csv`;
}

/**
 * Qué falta para que un egreso pueda entrar en un lote que va al banco.
 *
 * El banco no acepta una fila sin cuenta: si falta, el egreso se puede registrar
 * (queda el pasivo) pero el archivo saldría corto y el lote no cuadraría con la
 * plata que salió. Se dice al armar el lote, no al subirlo.
 */
export function faltaParaGirar(egreso: Egreso): string[] {
  const falta: string[] = [];
  if (!egreso.banco) falta.push('el banco');
  if (!egreso.numeroDeCuenta) falta.push('el número de cuenta');
  if (!egreso.beneficiarioDocumento) falta.push('el documento del beneficiario');
  return falta;
}
