/**
 * ══ EL PENSAMIENTO EN VIVO DEL CHAT (02-10-2026) ═══════════════════════════
 *
 * Nico, viendo «Ori está pensando · Decidiendo cómo resolverla · Eligiendo qué
 * agentes consultar y en qué orden»: «siempre dices lo mismo; quiero que se
 * sienta extremadamente inteligente». El micro cuenta cada paso MIENTRAS pasa,
 * con lo concreto de la pregunta y de los datos, en el evento SSE aditivo
 * `pensamiento` (micro: `src/ai-hub/pensamiento.ts`):
 *
 *   { type: 'pensamiento', id, fase, texto, estado: 'en_curso'|'listo'|'fallo',
 *     agente?, dispatchId?, resultado?: { texto, cifra?, formato? }, ms }
 *
 * Un paso se ACTUALIZA con otro evento del mismo `id`. Si `resultado.cifra`
 * viene, está escrita dentro de `resultado.texto` como la escribe
 * `cifraEnTexto` (miles con punto; `$` si es moneda): el panel la cuenta con
 * `AnimatedNumber` sin adivinar dónde va.
 *
 * Esto es PURO (sin React): leer el evento, aplicarlo, cerrar el turno, partir
 * el resultado por su cifra y poner el nombre propio del especialista.
 */

import { agenteDelDespacho, nombreDelAgente, type AgenteDelEquipo } from '@/lib/agentes/equipo';

export type EstadoDelPaso = 'en_curso' | 'listo' | 'fallo';

export interface ResultadoDelPaso {
  texto: string;
  cifra?: number;
  formato?: 'numero' | 'moneda';
}

export interface PasoDelPensamiento {
  id: string;
  /** `pregunta` · `cartera` · `busqueda` · `memoria` · `clasificacion` · `plan` · `despacho` · `redaccion` · `tope` · `verificacion` · `correccion` · `respaldo` · `directo`. */
  fase: string;
  texto: string;
  estado: EstadoDelPaso;
  /** La clave de despacho del especialista (`reportes`, `cobranza`…). */
  agente?: string;
  dispatchId?: string;
  resultado?: ResultadoDelPaso;
  /** Milisegundos desde que llegó la pregunta (los pone el micro). */
  ms?: number;
  /**
   * Lo que el paso hace AHORA (evento `progreso` del micro: «Revisando las 14
   * filas de contratos…»). Sólo mientras corre; al cerrar se va.
   */
  actividad?: string;
}

/** El pensamiento del turno EN CURSO, como lo lleva `useBetaChat`. */
export interface PensamientoEnVivo {
  pasos: PasoDelPensamiento[];
  /** `Date.now()` del envío de la pregunta. */
  inicio: number;
  /** `Date.now()` del cierre; `null` mientras corre. */
  fin: number | null;
}

/** Lo que queda guardado en el mensaje para «Cómo lo pensó». */
export interface PensamientoGuardado {
  pasos: PasoDelPensamiento[];
  duracionMs: number;
}

const ESTADOS: readonly EstadoDelPaso[] = ['en_curso', 'listo', 'fallo'];

const texto = (v: unknown, max = 400): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** El `resultado`, si llegó con la forma esperada. */
function leerResultado(v: unknown): ResultadoDelPaso | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const r = v as Record<string, unknown>;
  const t = texto(r.texto, 240);
  if (!t) return undefined;
  const cifra = typeof r.cifra === 'number' && Number.isFinite(r.cifra) ? r.cifra : undefined;
  const formato = r.formato === 'moneda' || r.formato === 'numero' ? r.formato : undefined;
  return { texto: t, ...(cifra !== undefined ? { cifra } : {}), ...(formato ? { formato } : {}) };
}

/**
 * Un paso del pensamiento leído del evento del micro. Lo mal formado es
 * «no llegó» (`null`): nunca se pinta un paso a medias ni se rellena.
 */
export function leerPasoDelPensamiento(v: unknown): PasoDelPensamiento | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const id = texto(o.id, 120);
  const t = texto(o.texto);
  const estado = ESTADOS.includes(o.estado as EstadoDelPaso) ? (o.estado as EstadoDelPaso) : null;
  if (!id || !t || !estado) return null;
  const resultado = leerResultado(o.resultado);
  return {
    id,
    fase: texto(o.fase, 40) ?? 'paso',
    texto: t,
    estado,
    ...(texto(o.agente, 40) ? { agente: texto(o.agente, 40)! } : {}),
    ...(texto(o.dispatchId, 120) ? { dispatchId: texto(o.dispatchId, 120)! } : {}),
    ...(resultado ? { resultado } : {}),
    ...(typeof o.ms === 'number' && Number.isFinite(o.ms) ? { ms: o.ms } : {}),
  };
}

/**
 * Aplica un paso: si ya existe (mismo `id`) se actualiza EN SU LUGAR —el orden
 * es el de la primera vez que apareció—; si no, va al final. Un paso que deja
 * de correr pierde su `actividad`.
 */
export function aplicarPaso(pasos: readonly PasoDelPensamiento[], paso: PasoDelPensamiento): PasoDelPensamiento[] {
  const i = pasos.findIndex((p) => p.id === paso.id);
  if (i === -1) return [...pasos, paso];
  const previo = pasos[i]!;
  const siguiente: PasoDelPensamiento = {
    ...paso,
    ...(paso.estado === 'en_curso' && previo.actividad ? { actividad: previo.actividad } : {}),
  };
  return [...pasos.slice(0, i), siguiente, ...pasos.slice(i + 1)];
}

/** El paso que corre AHORA: el último que arrancó (un especialista, si hay uno). */
export function pasoEnCurso(pasos: readonly PasoDelPensamiento[]): PasoDelPensamiento | null {
  const vivos = pasos.filter((p) => p.estado === 'en_curso');
  return [...vivos].reverse().find((p) => p.fase === 'despacho') ?? vivos[vivos.length - 1] ?? null;
}

/** El aviso `progreso` del micro va al paso que corre (sólo como su «ahora»). */
export function ponerActividad(pasos: readonly PasoDelPensamiento[], actividad: string): PasoDelPensamiento[] {
  const vivo = pasoEnCurso(pasos);
  const t = actividad.trim();
  if (!vivo || !t) return [...pasos];
  return pasos.map((p) => (p.id === vivo.id ? { ...p, actividad: t } : p));
}

/**
 * Cierra el turno: lo que siga corriendo se da por terminado (o por fallido si
 * el turno se cortó). El micro manda todos los cierres antes del `done`; esto
 * es la red para un stream que se corta o un micro que no alcanzó.
 */
export function cerrarPensamiento(pasos: readonly PasoDelPensamiento[], comoFallo = false): PasoDelPensamiento[] {
  return pasos.map((p) => {
    if (p.estado !== 'en_curso') return p.actividad ? { ...p, actividad: undefined } : p;
    const { actividad: _a, ...resto } = p;
    return { ...resto, estado: comoFallo ? 'fallo' : 'listo', texto: p.texto.replace(/…$/, '') };
  });
}

/** El pensamiento guardado en un mensaje, si tiene la forma esperada. */
export function leerPensamientoGuardado(v: unknown): PensamientoGuardado | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.pasos)) return null;
  const pasos = o.pasos.map(leerPasoDelPensamiento).filter((p): p is PasoDelPensamiento => p !== null);
  if (pasos.length === 0) return null;
  const duracionMs = typeof o.duracionMs === 'number' && Number.isFinite(o.duracionMs) && o.duracionMs >= 0 ? o.duracionMs : 0;
  return { pasos, duracionMs };
}

// ── Cifras ──────────────────────────────────────────────────────────────────

/** Como la escribe el micro: miles con punto, `$` si es plata. */
export function cifraEnTexto(cifra: number, formato: 'numero' | 'moneda' = 'numero'): string {
  const n = Math.round(cifra).toLocaleString('es-CO');
  return formato === 'moneda' ? `$${n}` : n;
}

/**
 * Parte el resultado por su cifra para contarla con `AnimatedNumber`:
 * «$985.507.187 en 561 clientes» → antes «», cifra, después « en 561 clientes».
 * `null` si no hay cifra o no aparece escrita tal cual (entonces va el texto).
 */
export function partirPorLaCifra(
  r: ResultadoDelPaso
): { antes: string; cifra: number; formato: 'numero' | 'moneda'; despues: string } | null {
  if (r.cifra === undefined) return null;
  const formato = r.formato ?? 'numero';
  const escrita = cifraEnTexto(r.cifra, formato);
  const i = r.texto.indexOf(escrita);
  if (i === -1) return null;
  return { antes: r.texto.slice(0, i), cifra: r.cifra, formato, despues: r.texto.slice(i + escrita.length) };
}

// ── El tiempo ───────────────────────────────────────────────────────────────

/** «0,4 s», «8,4 s», «12 s», «1 min 05 s». */
export function duracionEnPalabras(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return `${s.toFixed(1).replace('.', ',')} s`;
  if (s < 60) return `${Math.floor(s)} s`;
  const min = Math.floor(s / 60);
  const resto = Math.floor(s % 60);
  return `${min} min ${String(resto).padStart(2, '0')} s`;
}

// ── El nombre propio del especialista ───────────────────────────────────────

/**
 * Cómo nombra el micro a cada especialista en sus frases FUNCIONALES («el
 * especialista de reportes»). Espejo de `NOMBRE_DEL_ESPECIALISTA` del micro
 * (`src/ai-hub/como-lo-penso.ts`): es su contrato, no un nombre del equipo.
 */
export const NOMBRE_FUNCIONAL_DEL_MICRO: Readonly<Record<string, string>> = {
  reportes: 'reportes',
  cobranza: 'cobranza',
  pagos: 'pagos',
  conciliacion: 'conciliación',
  cotizador: 'asegurabilidad',
  estudio: 'evaluación de candidatos',
  matching: 'matching',
  avaluo: 'avalúos',
  documentos: 'documentos',
  comunicacion: 'comunicación',
};

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Pone el nombre del equipo donde el micro dice «el especialista de X»:
 * «Le pido al especialista de pagos: …» → «Le pido a Cobri: …». El nombre
 * sale de `equipo.ts` (nunca escrito a mano). Sin agente conocido, la frase
 * queda tal cual: sigue leyéndose bien.
 */
export function conNombreDelEquipo(
  frase: string,
  clave: string | undefined,
  t: (k: string, p?: Record<string, string | number>) => string
): string {
  const agente: AgenteDelEquipo | null = agenteDelDespacho(clave);
  const funcional = clave ? NOMBRE_FUNCIONAL_DEL_MICRO[clave] : undefined;
  if (!agente || !funcional) return frase;
  const nombre = nombreDelAgente(agente, t);
  const de = `especialista de ${escapar(funcional)}`;
  return frase
    .replace(new RegExp(`\\bal ${de}\\b`, 'gu'), `a ${nombre}`)
    .replace(new RegExp(`\\bdel ${de}\\b`, 'gu'), `de ${nombre}`)
    .replace(new RegExp(`\\b[Ee]l ${de}\\b`, 'gu'), nombre)
    .replace(new RegExp(`\\b${de}\\b`, 'gu'), nombre);
}

/** Los especialistas que trabajaron en el turno, cada uno una vez, en orden. */
export function agentesDelPensamiento(pasos: readonly PasoDelPensamiento[]): AgenteDelEquipo[] {
  const out: AgenteDelEquipo[] = [];
  for (const p of pasos) {
    if (p.fase !== 'despacho') continue;
    const a = agenteDelDespacho(p.agente);
    if (a && !out.some((x) => x.id === a.id)) out.push(a);
  }
  return out;
}

/**
 * Lo esencial para un lector de pantalla: el paso que corre o, si acaba de
 * terminar uno, su resultado. Una línea; nunca cada brillo ni cada cifra que cuenta.
 */
export function lineaParaLectores(
  pasos: readonly PasoDelPensamiento[],
  t: (k: string, p?: Record<string, string | number>) => string
): string {
  const vivo = pasoEnCurso(pasos);
  if (vivo) return conNombreDelEquipo(vivo.texto, vivo.agente, t);
  const ultimo = pasos[pasos.length - 1];
  if (!ultimo) return '';
  const frase = conNombreDelEquipo(ultimo.texto, ultimo.agente, t);
  return ultimo.resultado ? `${frase}: ${conNombreDelEquipo(ultimo.resultado.texto, ultimo.agente, t)}` : frase;
}
