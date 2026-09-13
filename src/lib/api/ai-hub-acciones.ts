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

import { agentAuthHeaders } from './agent-auth';

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

/** Error con el código HTTP a la vista, para que la tarjeta diga la verdad. */
export class ErrorDeAccion extends Error {
  readonly status: number;
  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeAccion';
    this.status = status;
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
  const res = await fetch(url, { method: 'POST', headers: agentAuthHeaders() });
  if (!res.ok) {
    let mensaje = '';
    try {
      const cuerpo = (await res.json()) as { error?: string };
      mensaje = cuerpo?.error ?? '';
    } catch {
      /* el cuerpo no era JSON: alcanza con el código */
    }
    throw new ErrorDeAccion(res.status, mensaje || `ai-hub acción ${res.status}`);
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
