/**
 * LAS LECTURAS DEL MICRO en el modo demo (las secciones de IA de la inmobiliaria: Cobranza, Conciliación, Avalúos…).
 * El mismo registro que `../index.ts` para el back, pero con el camino del MICRO (`/api/agency/<id>/…`, el id da igual).
 * `agentFetch` lo pregunta antes de responder «esta parte no trae datos de ejemplo».
 */
import type { LecturaDeLaDemo } from '../index';
import { COBRANZA_DEL_MICRO_DEMO } from './cobranza';

const LECTURAS: readonly LecturaDeLaDemo[] = [...COBRANZA_DEL_MICRO_DEMO];

/** Lo que responde la demo a una lectura del micro (camino con su `?query`, sin el dominio), o `undefined`. */
export function lecturaDelMicroEnLaDemo(camino: string): unknown {
  const l = LECTURAS.find((x) => x.patron.test(camino));
  if (!l) return undefined;
  return structuredClone(l.respuesta(camino));
}
