/**
 * Lo que el back dice cuando NO puede liquidar, aprobar o girar una
 * dispersión, leído para que la pantalla diga qué pasó y qué hacer.
 *
 * Antes cada pantalla tiraba el motivo: el asistente decía «No pudimos
 * calcular las dispersiones de este mes», Liquidaciones pintaba el mensaje
 * entero con un «Reintentar» que iba a fallar igual, y «Aprobar» decía
 * «Error» sobre un 409 que explicaba exactamente a dónde ir. El `code` del
 * back está para eso: decide la salida, y el `message` se muestra tal cual.
 *
 * Los códigos y sus cuerpos viven en el back:
 *   - `PARTICIPACIONES_NO_SUMAN_100` → `reparto-entre-copropietarios.ts`
 *     (400 con `propertyId`, `titulo`, `sumaBps` y `detalle`)
 *   - `COPROPIETARIOS_CON_IMPUESTOS` → `dispersiones.service.ts` (400, el
 *     título del inmueble va en el mensaje, sin id)
 *   - `APROBAR_POR_LOTE` → `dispersiones.service.ts` (409, aprobar y girar)
 *   - `APROBADOR_Y_EJECUTOR_IGUALES` → `dispersiones.service.ts` (409, girar)
 */

import { ApiError } from '@/lib/api/client';

export const RUTA_LOTES = '/panel/inmobiliaria/pagos/dispersiones/lotes';
export const RUTA_INMUEBLES = '/panel/inmobiliaria/inmuebles';

export type CodigoDeLiquidacionFrenada =
  | 'PARTICIPACIONES_NO_SUMAN_100'
  | 'COPROPIETARIOS_CON_IMPUESTOS';

export interface LiquidacionFrenada {
  code: CodigoDeLiquidacionFrenada;
  /** Qué pasó, corto, para el título del aviso. */
  titulo: string;
  /** El `message` del back, sin el id crudo cuando ya hay enlace. */
  mensaje: string;
  /** A dónde ir a arreglarlo. */
  enlace: { href: string; label: string };
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/**
 * Lee una clave del cuerpo del error: primero en `detalle` (lo que el back
 * arma a propósito) y después en la raíz (lo que el filtro global reenvía).
 * `ApiError.detalle` ES el cuerpo entero, así que el `detalle` del back queda
 * un nivel más adentro.
 */
function delCuerpo(error: ApiError, clave: string): unknown {
  const cuerpo = error.detalle;
  if (!cuerpo) return undefined;
  const interno = cuerpo.detalle;
  if (interno && typeof interno === 'object' && clave in (interno as object)) {
    return (interno as Record<string, unknown>)[clave];
  }
  return cuerpo[clave];
}

/**
 * ¿Es uno de los dos datos que frenan la liquidación del mes entero?
 * Devuelve `null` para cualquier otro error: ése se trata como un fallo común.
 */
export function leerLiquidacionFrenada(error: unknown): LiquidacionFrenada | null {
  if (!(error instanceof ApiError)) return null;

  if (error.code === 'PARTICIPACIONES_NO_SUMAN_100') {
    const propertyId = texto(delCuerpo(error, 'propertyId'));
    const tituloDelInmueble = texto(delCuerpo(error, 'titulo'));
    // El back mete el id en el mensaje porque antes el filtro no dejaba pasar
    // el cuerpo. Con el enlace a la ficha, un uuid pegado a la frase sobra.
    const mensaje = propertyId
      ? error.message.replace(` (inmueble ${propertyId}).`, '.')
      : error.message;
    return {
      code: error.code,
      titulo: tituloDelInmueble
        ? `Los porcentajes de los dueños de «${tituloDelInmueble}» no suman 100 %`
        : 'Los porcentajes de los dueños de un inmueble no suman 100 %',
      mensaje,
      enlace: propertyId
        ? {
            href: `${RUTA_INMUEBLES}/${propertyId}`,
            label: tituloDelInmueble ? `Abrir «${tituloDelInmueble}»` : 'Abrir la ficha del inmueble',
          }
        : { href: RUTA_INMUEBLES, label: 'Ir a los inmuebles' },
    };
  }

  if (error.code === 'COPROPIETARIOS_CON_IMPUESTOS') {
    // Sin id en la respuesta: el título va dentro del mensaje, entre comillas
    // latinas. El enlace lleva a la lista, donde se busca por ese nombre.
    return {
      code: error.code,
      titulo: 'Un inmueble con varios dueños lleva impuestos que no se pueden repartir',
      mensaje: error.message,
      enlace: { href: RUTA_INMUEBLES, label: 'Ir a los inmuebles' },
    };
  }

  return null;
}

/** El 409 de una agencia que aprueba y gira por lote, con código. */
export function esAprobarPorLote(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'APROBAR_POR_LOTE';
}

/** El 409 de quien aprobó intentando anotar el giro. */
export function esAprobadorYEjecutor(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'APROBADOR_Y_EJECUTOR_IGUALES';
}

/**
 * ¿La agencia aprueba por lote? La MISMA regla que el back
 * (`exigirElLoteSiLaAgenciaLoPide`): el PIN nace prendido, y con un monto de
 * doble aprobación configurado también se exige el lote.
 *
 * Sin la fila de la agencia —todavía cargando o no se pudo leer— la respuesta
 * es `true`, igual que el back: ofrecer «Aprobar» ahí es ofrecer un 409.
 */
export function apruebaPorLote(
  agencia:
    | { dispersionExigePin?: boolean | null; dispersionMontoDobleAprobacion?: number | null }
    | null
    | undefined,
): boolean {
  if (!agencia) return true;
  return (agencia.dispersionExigePin ?? true) || agencia.dispersionMontoDobleAprobacion != null;
}

/**
 * El motivo que se le puede mostrar a una persona, o `null` si el error es de
 * los que no traen uno legible (red, 5xx): ésos van por `FalloDeCarga`.
 */
export function motivoLegible(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status >= 400 && error.status < 500 && error.status !== 401) {
    return texto(error.message);
  }
  return null;
}
