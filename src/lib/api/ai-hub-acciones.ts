/**
 * ai-hub-acciones.ts — confirmar (o descartar) una acción que el chat propuso.
 *
 * 🔴 La diferencia con `resolveChatApproval` (el otro carril del chat): aquello
 * sólo REGISTRA la decisión del operador como señal de aprendizaje y no ejecuta
 * nada. Esto SÍ ejecuta — es la única puerta entre el chat y un envío real—, y
 * por eso devuelve el resultado: a cuántos les llegó y a quiénes no, con el
 * motivo. El front nunca ejecuta por su cuenta: manda el id de la propuesta y
 * el back hace lo que quedó GUARDADO cuando se armó la tarjeta.
 *
 * Códigos que hay que saber leer: 410 la propuesta venció (10 minutos), 409 ya
 * se canceló o hay otra confirmación en vuelo, 403 tu cuenta no puede actuar,
 * 404 esa propuesta no es tuya.
 */

import { agentFetch } from './agent-fetch';
import { ApiError } from './client';
import { falloDelMicro } from './fallo-del-micro';

/** Una fila de la tarjeta. El contacto viene ENMASCARADO desde el agente. */
export interface BackendDestinatarioDeAccion {
  nombre: string;
  contacto: string;
  detalle?: string;
  /** Cuando está, a esa persona NO se le va a escribir, y este es el motivo. */
  excluidoPor?: string;
}

/** La propuesta tal como la manda el agente (en el turno y por el stream). */
export interface BackendAccionPropuesta {
  id: string;
  accion: string;
  titulo: string;
  resumen: string;
  canal: string | null;
  destinatarios: BackendDestinatarioDeAccion[];
  /** Cuántos reciben de verdad (ya descontadas las exclusiones). */
  total: number;
  /** El texto exacto que se va a mandar. `null` si la acción no escribe. */
  texto: string | null;
  estado: string;
  /** ISO. Pasado este instante la confirmación responde 410. */
  venceEn: string;
}

export interface ResultadoDeAccion {
  enviados: number;
  fallidos: { nombre: string; motivo: string }[];
  resumen: string;
}

export interface RespuestaDeAccion {
  propuestaId: string;
  estado: 'ejecutada' | 'fallida' | 'cancelada';
  /** `true` cuando ya estaba ejecutada: no se volvió a mandar nada. */
  yaEjecutada: boolean;
  resultado: ResultadoDeAccion | null;
  resueltaEn: string;
}

/**
 * Error con el código HTTP a la vista, para que la tarjeta diga la verdad.
 *
 * Es un `ApiError` (02-10-2026) con el cuerpo entero en `detalle`: el
 * traductor lee de ahí la `referencia` de un 5xx. Su texto es SÓLO el
 * `message` del sobre; el `error` del cuerpo viejo (a veces en inglés,
 * «Forbidden — …») o el «ai-hub acción 500» que se armaba acá ya no llegan a
 * la tarjeta.
 */
export class ErrorDeAccion extends ApiError {
  constructor(status: number, mensaje: string | string[], code?: string, detalle?: Record<string, unknown>) {
    super(status, mensaje, code, detalle);
    this.name = 'ErrorDeAccion';
  }
}

function agentBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base) throw new Error('NEXT_PUBLIC_AGENT_URL not configured');
  return base;
}

async function postAccion(
  agencyId: string,
  propuestaId: string,
  ruta: 'confirmar' | 'cancelar',
): Promise<RespuestaDeAccion> {
  const url = `${agentBaseUrl()}/api/agency/${agencyId}/ai-hub/chat/acciones/${encodeURIComponent(
    propuestaId,
  )}/${ruta}`;
  const res = await agentFetch(url, { method: 'POST' });
  if (!res.ok) {
    const fallo = await falloDelMicro(res);
    throw new ErrorDeAccion(fallo.status, fallo.messages ?? fallo.message, fallo.code, fallo.detalle);
  }
  return (await res.json()) as RespuestaDeAccion;
}

/** Confirma y EJECUTA la acción. Idempotente: dos clics no mandan dos veces. */
export function confirmarAccion(args: {
  agencyId: string;
  propuestaId: string;
}): Promise<RespuestaDeAccion> {
  return postAccion(args.agencyId, args.propuestaId, 'confirmar');
}

/** Descarta la acción. No ejecuta nada y deja el rastro de que se dijo que no. */
export function cancelarAccion(args: {
  agencyId: string;
  propuestaId: string;
}): Promise<RespuestaDeAccion> {
  return postAccion(args.agencyId, args.propuestaId, 'cancelar');
}

/** ¿Esta propuesta ya venció? La tarjeta lo dice sin tener que preguntarle al agente. */
export function propuestaVencida(propuesta: BackendAccionPropuesta, ahora = new Date()): boolean {
  const vence = Date.parse(propuesta.venceEn);
  return Number.isFinite(vence) && vence <= ahora.getTime();
}
