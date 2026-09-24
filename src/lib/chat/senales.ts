/**
 * Las señales del chat que SÓLO ve la pantalla, para el cerebro de la
 * inmobiliaria en el micro.
 *
 *   POST {NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/ai-hub/chat/senales
 *
 * ── Por qué (Nico, 23-09) ──────────────────────────────────────────────────
 * «Debe aprender no sólo de 👍/👎 sino de TODO lo que sucede dentro del chat.»
 * El micro ya anota solo lo que ve él (pregunta, respuesta, fuentes,
 * reformulación, corrección, seguimiento, acciones). Le faltaba lo que pasa
 * en la pantalla, y el front no lo mandaba:
 *
 *   - `tarjeta_abierta` — tocó una tarjeta de entidad o sus botones, o abrió
 *     «Ver las N filas»: dice CUÁL resultado era el que buscaba (así aprende
 *     los apodos: «el de la 81 sur» es el contrato #1291);
 *   - `accion_deshecha` — usó «Deshacer» sobre una acción de ESE turno (el
 *     micro la cuenta sólo si la propuesta salió de ese mismo turno);
 *   - `abandono` — se fue con el turno sin terminar, o sin mirar la respuesta.
 *
 * Cada señal va con el `turnoId` que el servidor acuñó para ese turno (llega
 * en el `done` del stream y en la respuesta del POST). Sin `turnoId` no hay
 * señal: el micro no tendría con qué asociarla.
 *
 * ── Reglas ────────────────────────────────────────────────────────────────
 * 1. Fuego y olvido: nunca se espera, nunca lanza, nunca se reintenta. Un 500 o
 *    una red caída no frenan ni rompen el chat: es una señal, no algo que la
 *    persona esté esperando. La misma señal sale UNA vez por sesión (tocar la
 *    misma tarjeta diez veces es un solo «la abrió»).
 * 2. Nada de datos personales: el cuerpo lleva el tipo de señal y, cuando
 *    aplica, el tipo + id de la entidad o el id de la propuesta. La agencia y
 *    la persona las pone el servidor desde el token; el nombre, la cédula o el
 *    teléfono de la tarjeta nunca viajan.
 * 3. `keepalive`, no `sendBeacon`: el abandono sale justo cuando la página se
 *    cierra, y `sendBeacon` no deja poner el `Authorization` que el micro exige
 *    (sin él, un 401 seguro). `fetch` con `keepalive` sobrevive al cierre y
 *    lleva el bearer.
 * 4. El cuerpo es EXACTAMENTE el de la ruta del micro (su esquema real está en
 *    `src/lib/api/contrato-del-chat-del-micro.json` y la prueba compara contra
 *    él): el micro valida con zod no estricto y borraría en silencio una llave
 *    que no conoce.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';
import type { ChatMessage } from '@/lib/types/beta-chat';

/** Las que manda la pantalla (el resto las anota el micro solo). */
export const TIPOS_DE_SENAL_DE_PANTALLA = ['tarjeta_abierta', 'accion_deshecha', 'abandono'] as const;
export type TipoDeSenalDePantalla = (typeof TIPOS_DE_SENAL_DE_PANTALLA)[number];

/** La tarjeta que se abrió, como vino en `entidades`: sólo tipo + id. */
export interface EntidadDeLaSenal {
  tipo: string;
  id: string;
}

export interface SenalDePantalla {
  turnoId: string | null | undefined;
  tipo: TipoDeSenalDePantalla;
  /** Sólo `tarjeta_abierta`. Sin entidad = «abrió algo» (p. ej. la tabla). */
  entidad?: EntidadDeLaSenal | null;
  /** Sólo `accion_deshecha`: la propuesta que se deshizo. */
  propuestaId?: string | null;
}

/** El cuerpo de la ruta, llave por llave (ver el contrato del micro). */
export interface CuerpoDeSenal {
  turnoId: string;
  tipo: TipoDeSenalDePantalla;
  entidad?: EntidadDeLaSenal;
  propuestaId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los topes del esquema del micro: pasarse es un 400, no una señal. */
const TOPE_TIPO_DE_ENTIDAD = 40;
const TOPE_ID = 80;

function recortado(v: unknown, tope: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 && t.length <= tope ? t : null;
}

/**
 * El cuerpo que se manda, o `null` si no hay nada que mandar (sin `turnoId`
 * válido). Pura. Se arma llave por llave a propósito: aunque le pasen la
 * entidad entera de la tarjeta (con nombre, documento y teléfono), sólo salen
 * su tipo y su id.
 */
export function cuerpoDeLaSenal(s: SenalDePantalla): CuerpoDeSenal | null {
  const turnoId = typeof s.turnoId === 'string' ? s.turnoId.trim() : '';
  if (!UUID.test(turnoId)) return null;
  const cuerpo: CuerpoDeSenal = { turnoId, tipo: s.tipo };
  if (s.tipo === 'tarjeta_abierta' && s.entidad) {
    const tipo = recortado(s.entidad.tipo, TOPE_TIPO_DE_ENTIDAD);
    const id = recortado(s.entidad.id, TOPE_ID);
    // Una entidad que no cabe en el esquema no se recorta (sería OTRO id): la
    // señal sale sin ella, que sigue diciendo que el turno sirvió.
    if (tipo && id) cuerpo.entidad = { tipo, id };
  }
  if (s.tipo === 'accion_deshecha') {
    const propuestaId = recortado(s.propuestaId, TOPE_ID);
    if (propuestaId) cuerpo.propuestaId = propuestaId;
  }
  return cuerpo;
}

/** La URL de la ruta, o `null` si el micro no está configurado en este build. */
export function urlDeSenales(agencyId: string): string | null {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base || !agencyId) return null;
  return `${base}/api/agency/${agencyId}/ai-hub/chat/senales`;
}

/** Lo que ya salió en esta sesión (una señal repetida no vuelve a salir). */
const yaMandadas = new Set<string>();
const TOPE_DE_RECORDADAS = 2000;

function llaveDe(c: CuerpoDeSenal): string {
  return [c.turnoId, c.tipo, c.entidad ? `${c.entidad.tipo}:${c.entidad.id}` : '', c.propuestaId ?? ''].join('|');
}

/**
 * Manda la señal y sigue. Devuelve si salió (para las pruebas); el llamador
 * no tiene que mirar nada. Nunca lanza, ni siquiera si `fetch` no existe.
 */
export function mandarSenal(agencyId: string | null | undefined, s: SenalDePantalla): boolean {
  try {
    if (!agencyId) return false;
    const cuerpo = cuerpoDeLaSenal(s);
    if (!cuerpo) return false;
    const url = urlDeSenales(agencyId);
    if (!url) return false;
    const llave = llaveDe(cuerpo);
    if (yaMandadas.has(llave)) return false;
    if (yaMandadas.size >= TOPE_DE_RECORDADAS) yaMandadas.clear();
    // Se anota ANTES de mandar: si falla, no se reintenta (ni en bucle ni al
    // siguiente clic).
    yaMandadas.add(llave);
    void fetch(url, {
      method: 'POST',
      headers: agentAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(cuerpo),
      keepalive: true,
    }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cuánto esperar para mandar una señal cuando la página sigue viva (cambiar,
 * crear o borrar la conversación; rehacer una respuesta).
 *
 * 🔴 Medido en el navegador el 23-09: el micro manda el `done` ANTES de
 * anotar el turno en el cerebro (lo anota sin esperar, `void
 * registrarTurnoEnElCerebro`), y lo anota ~0,7 s después. Un abandono que
 * salió enseguida llegó primero, el micro no encontró el turno («Ese turno no
 * existe o no es tuyo») y la señal se perdió con un 200. Esperar un poco no
 * frena nada (es un temporizador) y la deja llegar después del turno. Al
 * cerrar la pestaña no hay «después»: ahí sale ya, con `keepalive`.
 */
export const ESPERA_AL_REGISTRO_DEL_TURNO_MS = 2500;
let esperaAlRegistro = ESPERA_AL_REGISTRO_DEL_TURNO_MS;
const enEspera = new Set<ReturnType<typeof setTimeout>>();

/** `mandarSenal`, pero dentro de un momento (ver arriba). Nunca lanza. */
export function mandarSenalEnUnMomento(agencyId: string | null | undefined, s: SenalDePantalla): void {
  try {
    const id = setTimeout(() => {
      enEspera.delete(id);
      mandarSenal(agencyId, s);
    }, esperaAlRegistro);
    enEspera.add(id);
  } catch {
    // Sin temporizadores no hay señal; el chat sigue igual.
  }
}

/**
 * Sólo pruebas: olvida lo ya mandado, descarta lo que estaba por salir (para
 * que no caiga en la prueba siguiente) y, si se pide, acorta la espera.
 */
export function __olvidarSenalesParaPruebas(espera: number = ESPERA_AL_REGISTRO_DEL_TURNO_MS): void {
  yaMandadas.clear();
  for (const id of enEspera) clearTimeout(id);
  enEspera.clear();
  esperaAlRegistro = espera;
}

// ── Abandono ────────────────────────────────────────────────────────────────

/**
 * Cuánto tiene que estar la respuesta a la vista para contar como «mirada».
 * Es un criterio, no una medición: quien pregunta y a los dos segundos de
 * llegar la respuesta ya se fue a otra conversación, no la leyó.
 */
export const MIRADA_MINIMA_MS = 2000;

export type MensajeParaAbandono = Pick<
  ChatMessage,
  'role' | 'status' | 'turnoId' | 'feedback' | 'accion' | 'decision' | 'actionProposals'
>;

/**
 * Lo que la pantalla sabe de los turnos de ESTA sesión para decidir si irse
 * es un abandono. Vive en un `ref` del hook del chat.
 */
export interface TestigoDeTurnos {
  /** Llegó el `turnoId` de un turno (el `done` / la respuesta del POST). */
  llego(turnoId: string): void;
  /** La pestaña volvió a estar a la vista. */
  aLaVista(): void;
  /** La persona tocó algo del turno (una tarjeta, la tabla). */
  tocado(turnoId: string): void;
  /** ¿Irse AHORA con este como último mensaje de la conversación es un abandono? */
  esAbandono(ultimo: MensajeParaAbandono | null | undefined): boolean;
}

const ACCION_SIN_DECIDIR = new Set(['pendiente', 'vencida']);

export function crearTestigoDeTurnos(
  opts: { ahora?: () => number; aLaVistaAhora?: () => boolean } = {},
): TestigoDeTurnos {
  const ahora = opts.ahora ?? (() => Date.now());
  const aLaVistaAhora =
    opts.aLaVistaAhora ?? (() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  /** turnoId → desde cuándo está a la vista (null: llegó con la pestaña oculta). */
  const vistoDesde = new Map<string, number | null>();
  const tocados = new Set<string>();

  return {
    llego(turnoId) {
      if (!vistoDesde.has(turnoId)) vistoDesde.set(turnoId, aLaVistaAhora() ? ahora() : null);
    },
    aLaVista() {
      const t = ahora();
      for (const [id, desde] of vistoDesde) if (desde === null) vistoDesde.set(id, t);
    },
    tocado(turnoId) {
      tocados.add(turnoId);
    },
    esAbandono(m) {
      if (!m || m.role !== 'assistant' || !m.turnoId) return false;
      // Un turno de otra sesión (vuelto a cargar del navegador) ya se juzgó
      // cuando esa sesión se fue.
      if (!vistoDesde.has(m.turnoId)) return false;
      // La usó: la valoró, tocó una tarjeta o decidió sobre lo que propuso.
      if (m.feedback || tocados.has(m.turnoId)) return false;
      const accionDecidida = Boolean(m.accion && !ACCION_SIN_DECIDIR.has(m.accion.estado));
      const decisionTomada = Boolean(m.decision?.selectedOptionId);
      const propuestaDecidida = (m.actionProposals ?? []).some((p) => p.status !== 'pending');
      if (accionDecidida || decisionTomada || propuestaDecidida) return false;
      // Turno sin terminar: todavía se estaba mostrando, o dejó algo esperando
      // su sí (una acción, una decisión) y se fue sin contestar.
      const sinTerminar =
        m.status !== 'complete' ||
        Boolean(m.accion) ||
        Boolean(m.decision) ||
        (m.actionProposals ?? []).length > 0;
      if (sinTerminar) return true;
      // Terminado: abandono si no la miró.
      const desde = vistoDesde.get(m.turnoId);
      return desde === null || desde === undefined || ahora() - desde < MIRADA_MINIMA_MS;
    },
  };
}
