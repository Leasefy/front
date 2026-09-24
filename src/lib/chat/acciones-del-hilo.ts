/**
 * Todo en el chat — la parte del hilo que ACTÚA (23-09-2026).
 *
 * ── Por qué (Nico, 23-09, 22:51) ───────────────────────────────────────────
 * «¿Por qué las acciones siguen sacando fuera del chat? Debe todo funcionar
 * dentro del chat: si le digo "ver contrato", es como un mensaje de la persona
 * y tú traes acá el contrato… ya te había dicho que sí para todas las
 * acciones.»
 *
 * Cada botón del chat es ahora un MENSAJE DE LA PERSONA: aparece en el hilo
 * como si lo hubiera escrito y viaja con una INTENCIÓN (qué pidió, sobre qué
 * entidad) para que el micro no adivine a partir del texto. El micro contesta
 * en el mismo hilo con lo que ya pinta Cadence (tarjeta, tabla, cifras) más
 * cuatro piezas nuevas, que viajan en el `done` y se leen acá:
 *
 *   · `acciones`     — lo que la ficha dice que se puede hacer: botones-mensaje,
 *                      y lo que no, con su porqué (sin botón).
 *   · `confirmacion` — «Voy a … ¿Lo hago?», con «Sí, hazlo» / «No» (según el
 *                      Piloto: Manual / Copiloto / Automático).
 *   · `resultado`    — hecho / no se pudo (con la explicación), y «Deshacer».
 *   · `formulario`   — los datos que faltan, pedidos en el hilo.
 *
 * Todo tolerante: un micro más viejo no manda nada de esto y el hilo queda
 * como antes; lo que no se entiende se descarta sin romper.
 */

import type { EntidadDelChat, TipoDeEntidad } from '@/lib/chat/bloques';

// ── La intención (espejo de `ai-hub/en-el-chat/intencion.ts` del micro) ─────

export type TipoDeFicha =
  | 'persona'
  | 'inquilino'
  | 'coarrendatario'
  | 'codeudor'
  | 'postulante'
  | 'contrato'
  | 'inmueble'
  | 'propietario';

const TIPOS_DE_FICHA: TipoDeFicha[] = [
  'persona',
  'inquilino',
  'coarrendatario',
  'codeudor',
  'postulante',
  'contrato',
  'inmueble',
  'propietario',
];

export interface EntidadDeLaIntencion {
  tipo: TipoDeFicha;
  id: string;
}

/**
 * Lo que se hace sobre un PLAN (24-09, paquete H): «Hacer todo», «No» y
 * «Reintentar / Seguir desde aquí». Lo que la persona llenó en la tarjeta del
 * plan viaja en `datos` con la clave del campo tal cual (`p2_valorCop`).
 */
export type AccionSobreUnPlan = 'hacer_plan' | 'cancelar_plan' | 'seguir_plan';
export const ACCIONES_SOBRE_UN_PLAN: AccionSobreUnPlan[] = ['hacer_plan', 'cancelar_plan', 'seguir_plan'];

export type IntencionDelChat =
  | { accion: 'ver' | 'cobranza'; entidad: EntidadDeLaIntencion }
  | { accion: 'confirmar' | 'cancelar' | 'deshacer'; propuestaId: string }
  | { accion: AccionSobreUnPlan; planId: string; datos?: Record<string, string | number> }
  | { accion: string; entidad: EntidadDeLaIntencion; datos?: Record<string, string | number> };

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

export function leerEntidadDeLaIntencion(v: unknown): EntidadDeLaIntencion | null {
  if (!esObjeto(v)) return null;
  const tipo = v.tipo as TipoDeFicha;
  const id = texto(v.id);
  return TIPOS_DE_FICHA.includes(tipo) && id ? { tipo, id } : null;
}

/** La clave de un dato del plan: `p<paso>_<dato>` (la misma regla del micro). */
const CLAVE_DEL_PLAN = /^p[1-8]_[A-Za-z][A-Za-z0-9_]{0,35}$/;

/** Los datos de una intención sobre un plan, sólo con claves `p<paso>_<dato>`. */
export function datosDelPlan(v: unknown): Record<string, string | number> {
  const datos: Record<string, string | number> = {};
  if (!esObjeto(v)) return datos;
  for (const [k, d] of Object.entries(v)) {
    if (!CLAVE_DEL_PLAN.test(k)) continue;
    if (typeof d === 'string' && d.length <= 1000) datos[k] = d;
    else if (typeof d === 'number' && Number.isFinite(d)) datos[k] = d;
  }
  return datos;
}

export function leerIntencion(v: unknown): IntencionDelChat | null {
  if (!esObjeto(v) || typeof v.accion !== 'string') return null;
  const accion = v.accion;
  if (accion === 'confirmar' || accion === 'cancelar' || accion === 'deshacer') {
    const propuestaId = texto(v.propuestaId);
    return propuestaId ? { accion, propuestaId } : null;
  }
  if ((ACCIONES_SOBRE_UN_PLAN as string[]).includes(accion)) {
    const planId = texto(v.planId);
    if (!planId) return null;
    const datos = datosDelPlan(v.datos);
    return Object.keys(datos).length > 0
      ? { accion: accion as AccionSobreUnPlan, planId, datos }
      : { accion: accion as AccionSobreUnPlan, planId };
  }
  const entidad = leerEntidadDeLaIntencion(v.entidad);
  if (!entidad || !/^[a-z][a-z_]{1,59}$/.test(accion)) return null;
  return { accion, entidad };
}

/** La intención tiene una entidad (sirve para la señal `tarjeta_abierta`). */
export function entidadDeLaIntencion(i: IntencionDelChat | null | undefined): EntidadDeLaIntencion | null {
  return i && 'entidad' in i ? i.entidad : null;
}

/**
 * Con qué tipo se vuelve a pedir la ficha de una tarjeta. La búsqueda y la
 * ficha llaman distinto a la persona: la tarjeta dice «inquilino», la ficha
 * se pide como «persona» (con el id de usuario o `doc:…`).
 */
export function tipoDeFichaDeLaEntidad(e: Pick<EntidadDelChat, 'tipo'> & { tipoDeFicha?: string }): TipoDeFicha | null {
  if (e.tipoDeFicha && TIPOS_DE_FICHA.includes(e.tipoDeFicha as TipoDeFicha)) return e.tipoDeFicha as TipoDeFicha;
  const t: TipoDeEntidad = e.tipo;
  if (t === 'inquilino' || t === 'coarrendatario') return 'persona';
  if (t === 'propietario' || t === 'inmueble' || t === 'contrato' || t === 'postulante') return t;
  return null;
}

// ── Los enlaces internos del texto → mensajes ───────────────────────────────

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const RUTAS_DE_FICHA: Array<{ patron: RegExp; tipo: TipoDeFicha }> = [
  { patron: new RegExp(`/contratos/(${UUID})(?:[/?#]|$)`, 'i'), tipo: 'contrato' },
  { patron: new RegExp(`/propietarios/(${UUID})(?:[/?#]|$)`, 'i'), tipo: 'propietario' },
  { patron: new RegExp(`/(?:inmuebles|propiedades|consignaciones|mandatos)/(${UUID})(?:[/?#]|$)`, 'i'), tipo: 'inmueble' },
  { patron: new RegExp(`/(?:inquilinos|terceros|personas)/(${UUID})(?:[/?#]|$)`, 'i'), tipo: 'persona' },
];

/**
 * Un enlace INTERNO del texto de la respuesta (`/panel/…`) ya no navega: se
 * convierte en un mensaje de la persona. Cuando la ruta nombra una entidad
 * del panel (un contrato, un propietario…), el mensaje lleva la intención de
 * VER esa ficha; si no, va el texto del enlace solo y lo contesta el modelo.
 */
export function intencionDelEnlace(href: string): IntencionDelChat | null {
  for (const { patron, tipo } of RUTAS_DE_FICHA) {
    const m = patron.exec(href);
    if (m) return { accion: 'ver', entidad: { tipo, id: m[1] } };
  }
  return null;
}

// ── Las piezas nuevas del `done` ────────────────────────────────────────────

export interface RiesgoDeLaAccion {
  muevePlata: boolean;
  escribeATerceros: boolean;
  irreversible: boolean;
}

function leerRiesgo(v: unknown): RiesgoDeLaAccion {
  const o = esObjeto(v) ? v : {};
  return {
    muevePlata: o.muevePlata === true,
    escribeATerceros: o.escribeATerceros === true,
    irreversible: o.irreversible === true,
  };
}

export interface AccionDelHilo {
  id: string;
  titulo: string;
  entidad: EntidadDeLaIntencion;
  disponible: boolean;
  porQueNo: string | null;
  riesgo: RiesgoDeLaAccion;
  lectura: boolean;
  /** Desde cuándo se podrá (`YYYY-MM-DD`), si el porqué lo dice. */
  desde: string | null;
}

export function leerAcciones(v: unknown): AccionDelHilo[] {
  if (!Array.isArray(v)) return [];
  const salida: AccionDelHilo[] = [];
  for (const a of v) {
    if (!esObjeto(a)) continue;
    const id = texto(a.id);
    const titulo = texto(a.titulo);
    const entidad = leerEntidadDeLaIntencion(a.entidad);
    if (!id || !titulo || !entidad) continue;
    salida.push({
      id,
      titulo,
      entidad,
      disponible: a.disponible === true,
      porQueNo: texto(a.porQueNo),
      riesgo: leerRiesgo(a.riesgo),
      lectura: a.lectura === true,
      desde: typeof a.desde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.desde) ? a.desde : null,
    });
  }
  return salida;
}

export type ModoDelChat = 'manual' | 'copiloto' | 'automatico';

export interface ConfirmacionEnElHilo {
  propuestaId: string;
  accion: string;
  titulo: string;
  frase: string;
  pregunta: string;
  porQue: string;
  modo: ModoDelChat;
  riesgo: RiesgoDeLaAccion;
  venceEn: string | null;
}

export function leerConfirmacion(v: unknown): ConfirmacionEnElHilo | null {
  if (!esObjeto(v)) return null;
  const propuestaId = texto(v.propuestaId);
  const frase = texto(v.frase);
  if (!propuestaId || !frase) return null;
  const modo = v.modo === 'manual' || v.modo === 'automatico' ? v.modo : 'copiloto';
  return {
    propuestaId,
    accion: texto(v.accion) ?? '',
    titulo: texto(v.titulo) ?? '',
    frase,
    pregunta: texto(v.pregunta) ?? '¿Lo hago?',
    porQue: texto(v.porQue) ?? '',
    modo,
    riesgo: leerRiesgo(v.riesgo),
    venceEn: texto(v.venceEn),
  };
}

export interface ResultadoEnElHilo {
  propuestaId: string | null;
  estado: 'hecha' | 'fallida' | 'cancelada' | 'deshecha';
  titulo: string;
  resumen: string;
  deshacer: { propuestaId: string; etiqueta: string } | null;
}

const ESTADOS_DE_RESULTADO: ResultadoEnElHilo['estado'][] = ['hecha', 'fallida', 'cancelada', 'deshecha'];

export function leerResultado(v: unknown): ResultadoEnElHilo | null {
  if (!esObjeto(v)) return null;
  const estado = v.estado as ResultadoEnElHilo['estado'];
  const resumen = texto(v.resumen);
  if (!ESTADOS_DE_RESULTADO.includes(estado) || !resumen) return null;
  const d = esObjeto(v.deshacer) ? v.deshacer : null;
  const propuestaDeshacer = d ? texto(d.propuestaId) : null;
  return {
    propuestaId: texto(v.propuestaId),
    estado,
    titulo: texto(v.titulo) ?? '',
    resumen,
    deshacer: propuestaDeshacer ? { propuestaId: propuestaDeshacer, etiqueta: texto(d?.etiqueta) ?? 'Deshacer' } : null,
  };
}

export type TipoDeCampo = 'moneda' | 'fecha' | 'mes' | 'numero' | 'texto' | 'texto_largo' | 'opcion';
const TIPOS_DE_CAMPO: TipoDeCampo[] = ['moneda', 'fecha', 'mes', 'numero', 'texto', 'texto_largo', 'opcion'];

export interface CampoDelFormulario {
  clave: string;
  etiqueta: string;
  tipo: TipoDeCampo;
  requerido: boolean;
  opciones: Array<{ valor: string; etiqueta: string }>;
  ayuda: string | null;
  valor: string | null;
}

export interface FormularioEnElHilo {
  accion: string;
  entidad: EntidadDeLaIntencion;
  titulo: string;
  frase: string;
  campos: CampoDelFormulario[];
  errores: string[];
}

/**
 * Los campos que el micro pide en el hilo (el formulario de una acción, o lo
 * que falta en un paso del plan). Lo que no cumple la forma se descarta.
 */
export function leerCampos(v: unknown): CampoDelFormulario[] {
  if (!Array.isArray(v)) return [];
  const campos: CampoDelFormulario[] = [];
  for (const c of v) {
    if (!esObjeto(c)) continue;
    const clave = texto(c.clave);
    const tipo = c.tipo as TipoDeCampo;
    if (!clave || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(clave) || !TIPOS_DE_CAMPO.includes(tipo)) continue;
    campos.push({
      clave,
      etiqueta: texto(c.etiqueta) ?? clave,
      tipo,
      requerido: c.requerido === true,
      opciones: Array.isArray(c.opciones)
        ? c.opciones
            .filter(esObjeto)
            .filter((o) => typeof o.valor === 'string' && typeof o.etiqueta === 'string')
            .map((o) => ({ valor: String(o.valor), etiqueta: String(o.etiqueta) }))
        : [],
      ayuda: texto(c.ayuda),
      valor: typeof c.valor === 'string' ? c.valor : null,
    });
  }
  return campos;
}

export function leerFormulario(v: unknown): FormularioEnElHilo | null {
  if (!esObjeto(v) || !Array.isArray(v.campos)) return null;
  const accion = texto(v.accion);
  const entidad = leerEntidadDeLaIntencion(v.entidad);
  if (!accion || !entidad) return null;
  const campos = leerCampos(v.campos);
  if (campos.length === 0) return null;
  return {
    accion,
    entidad,
    titulo: texto(v.titulo) ?? '',
    frase: texto(v.frase) ?? '',
    campos,
    errores: Array.isArray(v.errores) ? v.errores.filter((e): e is string => typeof e === 'string') : [],
  };
}

// ── Lo que ya se contestó (se lee del propio hilo, sin estado aparte) ───────

/**
 * ¿La persona ya respondió esta propuesta (Sí / No / Deshacer)? Se lee de los
 * mensajes que vinieron DESPUÉS: su intención dice sobre qué propuesta fue.
 * Así la tarjeta no ofrece dos veces el mismo «Sí» sin guardar estado aparte.
 */
export function respuestaDeLaPropuesta(
  propuestaId: string,
  posteriores: ReadonlyArray<{ role: string; intencion?: IntencionDelChat }>,
): 'confirmar' | 'cancelar' | 'deshacer' | null {
  for (const m of posteriores) {
    const i = m.intencion;
    if (m.role === 'user' && i && 'propuestaId' in i && i.propuestaId === propuestaId) return i.accion;
  }
  return null;
}

/**
 * ¿La persona ya respondió ESTA tarjeta del plan? Lo primero que dijo sobre
 * ese plan DESPUÉS de la tarjeta. La respuesta del plan llega en un mensaje
 * nuevo con su tarjeta al día; ésta queda como «respondida».
 */
export function respuestaDelPlan(
  planId: string,
  posteriores: ReadonlyArray<{ role: string; intencion?: IntencionDelChat }>,
): AccionSobreUnPlan | null {
  for (const m of posteriores) {
    const i = m.intencion;
    if (m.role === 'user' && i && 'planId' in i && i.planId === planId) return i.accion;
  }
  return null;
}

/** El texto del mensaje de la persona cuando llena el formulario («Registrar un pago: $500.000 · Transferencia · 2026-09-22»). */
export function textoDelFormulario(f: FormularioEnElHilo, valores: Record<string, string>): string {
  const partes = f.campos
    .map((c) => {
      const v = (valores[c.clave] ?? '').trim();
      if (!v) return null;
      if (c.tipo === 'opcion') return c.opciones.find((o) => o.valor === v)?.etiqueta ?? v;
      if (c.tipo === 'moneda') {
        const n = Number(v.replace(/[^\d]/g, ''));
        return Number.isFinite(n) && n > 0 ? `$${n.toLocaleString('es-CO')}` : v;
      }
      return v;
    })
    .filter(Boolean);
  return `${f.titulo}: ${partes.join(' · ')}`;
}

/** «29 de enero de 2027» (fecha civil: se lee en UTC para no correrse un día). */
export function fechaCivilLarga(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
