/**
 * La tarjeta PLAN del chat (24-09-2026, paquete H; arquitectura §5).
 *
 * «Regístrale el pago a Mateo y mándale el estado de cuenta»: la persona pide
 * VARIAS acciones del registro en una frase. El micro las valida sin modelo y
 * manda UNA tarjeta con la lista numerada (el riesgo de cada paso) y un solo
 * «Hacer todo». Al hacerlo, la respuesta trae la MISMA tarjeta al día: el
 * avance paso a paso, «Deshacer» en cada paso hecho (si su tarjeta lo trajo),
 * y dónde y por qué se detuvo, con «Reintentar / Seguir desde aquí».
 *
 * Viaja en el `done` del stream (clave NUEVA `plan`) con la forma de
 * `AiHubChatTarjetaPlan` del micro (`en-el-chat/contrato-del-hilo.ts`, en
 * `contrato-del-chat-del-micro.json`). Todo tolerante: lo que no se entiende
 * se descarta, y un botón que no llegó bien formado NO se pinta (el micro ya
 * filtró por permiso: el front no inventa «Hacer todo» ni «Deshacer»).
 */

import { leerCampos, type CampoDelFormulario, type ModoDelChat } from '@/lib/chat/acciones-del-hilo';
import {
  leerBoton,
  leerRiesgoDeLaEjecucion,
  type BotonDeLaTarjeta,
  type RiesgoDeLaEjecucion,
} from '@/lib/chat/tarjetas-de-ejecucion';

export type EstadoDelPlan = 'propuesto' | 'ejecutando' | 'hecho' | 'detenido' | 'cancelado' | 'vencido';
export const ESTADOS_DEL_PLAN: EstadoDelPlan[] = ['propuesto', 'ejecutando', 'hecho', 'detenido', 'cancelado', 'vencido'];

export type EstadoDelPaso = 'pendiente' | 'hecho' | 'fallido' | 'en_curso' | 'omitido';
export const ESTADOS_DEL_PASO: EstadoDelPaso[] = ['pendiente', 'hecho', 'fallido', 'en_curso', 'omitido'];

export type TipoDeDetencion = 'fallo' | 'en_curso' | 'doble_control' | 'faltan_datos' | 'horario' | 'no_disponible' | 'referencia';
const TIPOS_DE_DETENCION: TipoDeDetencion[] = ['fallo', 'en_curso', 'doble_control', 'faltan_datos', 'horario', 'no_disponible', 'referencia'];

export interface PasoDelPlan {
  n: number;
  /** `acciones_posibles[].id` del paso. */
  accion: string;
  titulo: string;
  /** «Voy a registrar un pago de $500.000 …». */
  frase: string;
  riesgo: RiesgoDeLaEjecucion;
  estado: EstadoDelPaso;
  resumen: string | null;
  ejecucionId: string | null;
  /** «Deshacer» de ESTE paso (la intención `deshacer` de su ejecución). */
  deshacer: BotonDeLaTarjeta | null;
  /** Lo que falta llenar para este paso; la clave ya viene como `p2_valorCop`. */
  campos: CampoDelFormulario[];
  dependeDe: number | null;
}

export interface TarjetaDePlan {
  tipo: 'plan';
  planId: string;
  titulo: string;
  /** La frase de la persona de la que salió el plan. */
  cita: string;
  estado: EstadoDelPlan;
  modo: ModoDelChat;
  pregunta: string;
  porQue: string;
  venceEn: string | null;
  pasos: PasoDelPlan[];
  /** Lo pedido que el chat todavía no sabe hacer: el plan termina antes. */
  seDetieneAntesDe: { n: number; que: string; porQue: string } | null;
  /** Dónde y por qué se detuvo al correr. */
  detenido: { n: number; tipo: TipoDeDetencion; porQue: string } | null;
  hacerTodo: BotonDeLaTarjeta | null;
  cancelar: BotonDeLaTarjeta | null;
  seguir: BotonDeLaTarjeta | null;
  ensayo: boolean;
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const textoONulo = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const entero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);

/** Un botón del plan sólo vale si su intención es sobre ESTE plan. */
function botonDelPlan(v: unknown, planId: string): BotonDeLaTarjeta | null {
  const b = leerBoton(v);
  return b && 'planId' in b.intencion && b.intencion.planId === planId ? b : null;
}

/** Un «Deshacer» de paso sólo vale si deshace SU ejecución. */
function deshacerDelPaso(v: unknown, ejecucionId: string | null): BotonDeLaTarjeta | null {
  const b = leerBoton(v);
  return b && ejecucionId && b.intencion.accion === 'deshacer' && 'propuestaId' in b.intencion && b.intencion.propuestaId === ejecucionId
    ? b
    : null;
}

function leerPaso(v: unknown): PasoDelPlan | null {
  if (!esObjeto(v)) return null;
  const n = entero(v.n);
  const accion = texto(v.accion);
  const frase = texto(v.frase);
  if (n === null || n < 1 || !accion || !frase) return null;
  const estado = ESTADOS_DEL_PASO.includes(v.estado as EstadoDelPaso) ? (v.estado as EstadoDelPaso) : 'pendiente';
  const ejecucionId = texto(v.ejecucionId);
  return {
    n,
    accion,
    titulo: textoONulo(v.titulo) ?? '',
    frase,
    riesgo: leerRiesgoDeLaEjecucion(v.riesgo),
    estado,
    resumen: texto(v.resumen),
    ejecucionId,
    deshacer: deshacerDelPaso(v.deshacer, ejecucionId),
    // Sólo claves de ESTE paso (`p<n>_…`): una clave de otro paso no se pinta acá.
    campos: leerCampos(v.campos).filter((c) => c.clave.startsWith(`p${n}_`)),
    dependeDe: entero(v.dependeDe),
  };
}

/** La tarjeta del plan, o `null` si no se entiende (sin id, sin pasos ni motivo para no tenerlos). */
export function leerTarjetaDePlan(v: unknown): TarjetaDePlan | null {
  if (!esObjeto(v) || v.tipo !== 'plan') return null;
  const planId = texto(v.planId);
  if (!planId || !ESTADOS_DEL_PLAN.includes(v.estado as EstadoDelPlan)) return null;
  const pasos = Array.isArray(v.pasos) ? v.pasos.map(leerPaso).filter((p): p is PasoDelPlan => p !== null) : [];
  const antes = esObjeto(v.seDetieneAntesDe) ? v.seDetieneAntesDe : null;
  const seDetieneAntesDe =
    antes && entero(antes.n) !== null && texto(antes.que)
      ? { n: entero(antes.n)!, que: texto(antes.que)!, porQue: textoONulo(antes.porQue) ?? '' }
      : null;
  if (pasos.length === 0 && !seDetieneAntesDe) return null;
  const d = esObjeto(v.detenido) ? v.detenido : null;
  const detenido =
    d && entero(d.n) !== null && TIPOS_DE_DETENCION.includes(d.tipo as TipoDeDetencion)
      ? { n: entero(d.n)!, tipo: d.tipo as TipoDeDetencion, porQue: textoONulo(d.porQue) ?? '' }
      : null;
  return {
    tipo: 'plan',
    planId,
    titulo: textoONulo(v.titulo) ?? '',
    cita: textoONulo(v.cita) ?? '',
    estado: v.estado as EstadoDelPlan,
    modo: v.modo === 'manual' || v.modo === 'automatico' ? v.modo : 'copiloto',
    pregunta: texto(v.pregunta) ?? '¿Hago todo?',
    porQue: textoONulo(v.porQue) ?? '',
    venceEn: texto(v.venceEn),
    pasos,
    seDetieneAntesDe,
    detenido,
    hacerTodo: botonDelPlan(v.hacerTodo, planId),
    cancelar: botonDelPlan(v.cancelar, planId),
    seguir: botonDelPlan(v.seguir, planId),
    ensayo: v.ensayo === true,
  };
}

/** Los pasos que todavía piden algo obligatorio (para no dejar «Hacer todo» con datos a medias). */
export function faltanDatos(campos: readonly CampoDelFormulario[], valores: Readonly<Record<string, string>>): boolean {
  return campos.some((c) => c.requerido && !(valores[c.clave] ?? '').trim());
}
