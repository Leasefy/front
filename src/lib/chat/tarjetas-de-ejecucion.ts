/**
 * Las tarjetas del EJECUTOR del chat (24-09-2026, paquete F del chat piloto).
 *
 * ── De dónde salen ──────────────────────────────────────────────────────────
 *
 * El micro ya no contesta una acción sólo con «¿Lo hago?» o «Hecho / No se
 * pudo»: cada ejecución del chat tiene UNA tarjeta, con cinco formas
 * (`en-el-chat/contrato-del-hilo.ts` del micro, `AiHubChatTarjetaDeEjecucion`
 * en su `openapi-snapshot.json`):
 *
 *   propuesta  — «Voy a … ¿Lo hago?» con la vista previa del back (lo que va a
 *                quedar), el riesgo completo (💸 ✉️ ⛔ 👥 🧾 📦), el modo del
 *                Piloto y el doble control de P-4.
 *   en_curso   — se está haciendo: un proceso largo del Centro de procesos, o
 *                una llamada que no contestó a tiempo («sigue corriendo»).
 *   resultado  — hecha / cancelada / deshecha / vencida, y `en_gracia`: salió
 *                en Automático y todavía se puede recoger (P-10, 1 minuto).
 *   programada — fuera del horario de ley: sale cuando abra (P-10).
 *   error      — no se hizo, explicado (§4.3): el mensaje del back tal cual,
 *                quién sí puede y el segundo factor.
 *
 * Viaja en el `done` del stream (clave NUEVA `ejecucion`) y en
 * `GET …/ai-hub/chat/ejecuciones/{id}` (`{ tarjeta }`), que el chat pide
 * cuando termina la gracia, cuando vuelve a una programada cuya hora ya pasó y
 * cuando el Centro de procesos ve terminar el proceso.
 *
 * ── Compatibilidad ──────────────────────────────────────────────────────────
 *
 * El `done` SIGUE trayendo `confirmacion` y `resultado` con su forma de
 * siempre (`acciones-del-hilo.ts`). Con `ejecucion` presente, la tarjeta nueva
 * manda y las viejas no se pintan (serían la misma tarjeta dos veces). Sin
 * `ejecucion` (un micro de antes), el hilo queda como estaba.
 *
 * Todo tolerante: lo que no se entiende se descarta, y un botón que no llegó
 * bien formado NO se pinta (el micro ya filtró por permiso: el front no
 * inventa «Deshacer» ni «Cancelar»).
 */

import {
  ACCIONES_SOBRE_UN_PLAN,
  datosDelPlan,
  leerEntidadDeLaIntencion,
  type AccionSobreUnPlan,
  type IntencionDelChat,
  type ModoDelChat,
} from '@/lib/chat/acciones-del-hilo';
import type { EstadoDeProceso } from '@/lib/api/procesos.types';

// ── Tipos (espejo de `contrato-del-hilo.ts` del micro) ──────────────────────

export interface RiesgoDeLaEjecucion {
  muevePlata: boolean;
  escribeATerceros: boolean;
  irreversible: boolean;
  masiva: boolean;
  fiscal: boolean;
  dobleControl: { paso: 'propone' | 'aprueba' } | null;
  proceso: boolean;
  /** Máximo de destinatarios o filas por confirmación (P-3). */
  tope: number | null;
  /** De qué agente de la flota se leyó el modo (§3.2). */
  agenteDueno: string;
}

export interface VistaPreviaDeLaEjecucion {
  estado: 'ok' | 'no_disponible';
  metodo: 'GET' | 'POST';
  ruta: string;
  /** Lo que devolvió el back, tal cual. `null` si no hubo o pesaba demasiado. */
  datos: unknown;
  recortada: boolean;
  /** Por qué no hay vista previa, en una frase. */
  explicacion: string | null;
}

export interface DobleControlDeLaEjecucion {
  paso: 'propone' | 'aprueba';
  /** P-4: `la_puedes_hacer_tu` = administrador, las dos mitades (queda en la bitácora). */
  laOtraMitad: 'la_puedes_hacer_tu' | 'otra_persona';
  frase: string;
}

export interface ProcesoDeLaEjecucion {
  estado: EstadoDeProceso;
  hechos: number;
  total: number | null;
  porcentaje: number | null;
  mensaje: string | null;
}

/** Un botón de la tarjeta: su etiqueta y la intención que manda (otro mensaje de la persona). */
export interface BotonDeLaTarjeta {
  etiqueta: string;
  intencion: IntencionDelChat;
}

interface BaseDeLaTarjeta {
  /** El `propuestaId` de las intenciones y el id de `GET …/ejecuciones/{id}`. */
  ejecucionId: string;
  /** `acciones_posibles[].id`. */
  accion: string;
  titulo: string;
}

export interface TarjetaPropuesta extends BaseDeLaTarjeta {
  tipo: 'propuesta';
  frase: string;
  pregunta: string;
  porQue: string;
  modo: ModoDelChat;
  riesgo: RiesgoDeLaEjecucion;
  vistaPrevia: VistaPreviaDeLaEjecucion | null;
  venceEn: string | null;
  siConfirmas: { sale: 'ahora' | 'programada'; ejecutarDesde: string | null; cuando: string | null };
  dobleControl: DobleControlDeLaEjecucion | null;
  ensayo: boolean;
  siNoFueraEnsayo: string | null;
}

export interface TarjetaEnCurso extends BaseDeLaTarjeta {
  tipo: 'en_curso';
  resumen: string;
  procesoId: string | null;
  proceso: ProcesoDeLaEjecucion | null;
  desde: string | null;
}

export type EstadoDelResultado = 'en_gracia' | 'hecha' | 'cancelada' | 'deshecha' | 'vencida';
export const ESTADOS_DEL_RESULTADO: EstadoDelResultado[] = ['en_gracia', 'hecha', 'cancelada', 'deshecha', 'vencida'];

export interface TarjetaResultado extends BaseDeLaTarjeta {
  tipo: 'resultado';
  estado: EstadoDelResultado;
  resumen: string;
  gracia: { hasta: string; segundos: number } | null;
  deshacer: BotonDeLaTarjeta | null;
}

export interface TarjetaProgramada extends BaseDeLaTarjeta {
  tipo: 'programada';
  resumen: string;
  ejecutarDesde: string;
  /** «mañana a las 8:00 a. m.». */
  cuando: string;
  ventana: 'cobranza' | 'aviso' | null;
  /** `false` = la sesión vence antes: sale cuando la persona vuelva a escribirle al chat. */
  saleSola: boolean;
  deshacer: BotonDeLaTarjeta | null;
}

export interface TarjetaError extends BaseDeLaTarjeta {
  tipo: 'error';
  status: number | null;
  code: string | null;
  /** La explicación de la tabla fija §4.3 (nunca «Error»). */
  explicacion: string;
  permiso: { modulo: string; accion: string } | null;
  /** Quién de la inmobiliaria sí puede; `null` = no se pudo saber. */
  quienesPueden: string[] | null;
  /** «Confirma tu segundo factor»: después, la MISMA acción otra vez. */
  segundoFactor: BotonDeLaTarjeta | null;
}

export type TarjetaDeEjecucion =
  | TarjetaPropuesta
  | TarjetaEnCurso
  | TarjetaResultado
  | TarjetaProgramada
  | TarjetaError;

export type TipoDeTarjeta = TarjetaDeEjecucion['tipo'];
export const TIPOS_DE_TARJETA: TipoDeTarjeta[] = ['propuesta', 'en_curso', 'resultado', 'programada', 'error'];

/** SSE `proceso_iniciado`: la acción arrancó un proceso largo en el back (sale antes del `done`). */
export interface EventoProcesoIniciado {
  procesoId: string;
  ejecucionId: string;
}

// ── Lectores tolerantes ─────────────────────────────────────────────────────

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const textoONulo = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const CLAVE_DE_DATO = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

/**
 * La intención de un botón de la tarjeta, tal como la manda el micro
 * (`AiHubChatIntencionDelBoton`), en la forma del hilo. Sobre una ejecución
 * (`confirmar` / `cancelar` / `deshacer` + `propuestaId`), o una acción de la
 * ficha otra vez (`accion` + `entidad` + `datos`, el reintento después del
 * segundo factor). Lo que no cumple la forma que el micro acepta → `null`, y
 * el botón no se pinta.
 */
export function leerIntencionDelBoton(v: unknown): IntencionDelChat | null {
  if (!esObjeto(v) || typeof v.accion !== 'string') return null;
  const accion = v.accion;
  if (accion === 'confirmar' || accion === 'cancelar' || accion === 'deshacer') {
    const propuestaId = texto(v.propuestaId);
    return propuestaId ? { accion, propuestaId } : null;
  }
  // (24-09, paquete H) «Hacer todo», «No», «Seguir desde aquí» sobre un plan.
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
  const datos: Record<string, string | number> = {};
  if (esObjeto(v.datos)) {
    for (const [k, d] of Object.entries(v.datos)) {
      if (!CLAVE_DE_DATO.test(k)) continue;
      if (typeof d === 'string' && d.length <= 1000) datos[k] = d;
      else if (typeof d === 'number' && Number.isFinite(d)) datos[k] = d;
    }
  }
  return Object.keys(datos).length > 0 ? { accion, entidad, datos } : { accion, entidad };
}

export function leerBoton(v: unknown): BotonDeLaTarjeta | null {
  if (!esObjeto(v)) return null;
  const etiqueta = texto(v.etiqueta);
  const intencion = leerIntencionDelBoton(v.intencion ?? v.reintento);
  return etiqueta && intencion ? { etiqueta, intencion } : null;
}

export function leerRiesgoDeLaEjecucion(v: unknown): RiesgoDeLaEjecucion {
  const o = esObjeto(v) ? v : {};
  const dc = esObjeto(o.dobleControl) ? o.dobleControl : null;
  return {
    muevePlata: o.muevePlata === true,
    escribeATerceros: o.escribeATerceros === true,
    irreversible: o.irreversible === true,
    masiva: o.masiva === true,
    fiscal: o.fiscal === true,
    dobleControl: dc && (dc.paso === 'propone' || dc.paso === 'aprueba') ? { paso: dc.paso } : null,
    proceso: o.proceso === true,
    tope: numero(o.tope),
    agenteDueno: texto(o.agenteDueno) ?? '',
  };
}

function leerVistaPrevia(v: unknown): VistaPreviaDeLaEjecucion | null {
  if (!esObjeto(v)) return null;
  return {
    estado: v.estado === 'ok' ? 'ok' : 'no_disponible',
    metodo: v.metodo === 'POST' ? 'POST' : 'GET',
    ruta: textoONulo(v.ruta) ?? '',
    datos: v.datos ?? null,
    recortada: v.recortada === true,
    explicacion: texto(v.explicacion),
  };
}

function leerDobleControl(v: unknown): DobleControlDeLaEjecucion | null {
  if (!esObjeto(v)) return null;
  if (v.laOtraMitad !== 'la_puedes_hacer_tu' && v.laOtraMitad !== 'otra_persona') return null;
  return {
    paso: v.paso === 'aprueba' ? 'aprueba' : 'propone',
    laOtraMitad: v.laOtraMitad,
    frase: textoONulo(v.frase) ?? '',
  };
}

const ESTADOS_DE_PROCESO: EstadoDeProceso[] = ['EN_COLA', 'CORRIENDO', 'TERMINADO', 'FALLO', 'CANCELADO'];

function leerProceso(v: unknown): ProcesoDeLaEjecucion | null {
  if (!esObjeto(v) || !ESTADOS_DE_PROCESO.includes(v.estado as EstadoDeProceso)) return null;
  return {
    estado: v.estado as EstadoDeProceso,
    hechos: numero(v.hechos) ?? 0,
    total: numero(v.total),
    porcentaje: numero(v.porcentaje),
    mensaje: texto(v.mensaje),
  };
}

/**
 * La tarjeta de una ejecución, o `null` si no se entiende (un `tipo` que este
 * panel no conoce, o sin id/acción/título): en ese caso el hilo se queda con
 * lo de siempre (`confirmacion` / `resultado`).
 */
export function leerTarjetaDeEjecucion(v: unknown): TarjetaDeEjecucion | null {
  if (!esObjeto(v)) return null;
  const ejecucionId = texto(v.ejecucionId);
  const accion = texto(v.accion);
  if (!ejecucionId || !accion) return null;
  const base = { ejecucionId, accion, titulo: textoONulo(v.titulo) ?? '' };

  switch (v.tipo) {
    case 'propuesta': {
      const frase = texto(v.frase);
      if (!frase) return null;
      const si = esObjeto(v.siConfirmas) ? v.siConfirmas : {};
      return {
        tipo: 'propuesta',
        ...base,
        frase,
        pregunta: texto(v.pregunta) ?? '¿Lo hago?',
        porQue: textoONulo(v.porQue) ?? '',
        modo: v.modo === 'manual' || v.modo === 'automatico' ? v.modo : 'copiloto',
        riesgo: leerRiesgoDeLaEjecucion(v.riesgo),
        vistaPrevia: leerVistaPrevia(v.vistaPrevia),
        venceEn: texto(v.venceEn),
        siConfirmas: {
          sale: si.sale === 'programada' ? 'programada' : 'ahora',
          ejecutarDesde: texto(si.ejecutarDesde),
          cuando: texto(si.cuando),
        },
        dobleControl: leerDobleControl(v.dobleControl),
        ensayo: v.ensayo === true,
        siNoFueraEnsayo: texto(v.siNoFueraEnsayo),
      };
    }
    case 'en_curso':
      return {
        tipo: 'en_curso',
        ...base,
        resumen: textoONulo(v.resumen) ?? '',
        procesoId: texto(v.procesoId),
        proceso: leerProceso(v.proceso),
        desde: texto(v.desde),
      };
    case 'resultado': {
      const estado = v.estado as EstadoDelResultado;
      if (!ESTADOS_DEL_RESULTADO.includes(estado)) return null;
      const g = esObjeto(v.gracia) ? v.gracia : null;
      const hasta = g ? texto(g.hasta) : null;
      return {
        tipo: 'resultado',
        ...base,
        estado,
        resumen: textoONulo(v.resumen) ?? '',
        gracia: hasta && !Number.isNaN(Date.parse(hasta)) ? { hasta, segundos: numero(g?.segundos) ?? 60 } : null,
        deshacer: leerBoton(v.deshacer),
      };
    }
    case 'programada': {
      const ejecutarDesde = texto(v.ejecutarDesde);
      if (!ejecutarDesde) return null;
      return {
        tipo: 'programada',
        ...base,
        resumen: textoONulo(v.resumen) ?? '',
        ejecutarDesde,
        cuando: textoONulo(v.cuando) ?? '',
        ventana: v.ventana === 'cobranza' || v.ventana === 'aviso' ? v.ventana : null,
        saleSola: v.saleSola !== false,
        deshacer: leerBoton(v.deshacer),
      };
    }
    case 'error': {
      const p = esObjeto(v.permiso) ? v.permiso : null;
      const modulo = p ? texto(p.modulo) : null;
      const accionDelPermiso = p ? texto(p.accion) : null;
      return {
        tipo: 'error',
        ...base,
        status: numero(v.status),
        code: texto(v.code),
        explicacion: texto(v.explicacion) ?? 'No se hizo.',
        permiso: modulo && accionDelPermiso ? { modulo, accion: accionDelPermiso } : null,
        quienesPueden: Array.isArray(v.quienesPueden)
          ? v.quienesPueden.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
          : null,
        segundoFactor: leerBoton(v.segundoFactor),
      };
    }
    default:
      return null;
  }
}

/** El evento `proceso_iniciado` del stream, o `null` si no trae sus dos ids. */
export function leerEventoProcesoIniciado(v: unknown): EventoProcesoIniciado | null {
  if (!esObjeto(v)) return null;
  const procesoId = texto(v.procesoId);
  const ejecucionId = texto(v.ejecucionId);
  return procesoId && ejecucionId ? { procesoId, ejecucionId } : null;
}

/**
 * El proceso que anunció el stream, pegado a la tarjeta `en_curso` de la MISMA
 * ejecución cuando ésta todavía no lo trae. Cualquier otra tarjeta queda igual.
 */
export function conElProcesoDelStream(
  tarjeta: TarjetaDeEjecucion | null,
  evento: EventoProcesoIniciado | null,
): TarjetaDeEjecucion | null {
  if (!tarjeta || !evento) return tarjeta;
  if (tarjeta.tipo !== 'en_curso' || tarjeta.ejecucionId !== evento.ejecucionId || tarjeta.procesoId) return tarjeta;
  return { ...tarjeta, procesoId: evento.procesoId };
}

// ── Lo que la tarjeta ya dice ───────────────────────────────────────────────

/**
 * ¿El texto de la respuesta es la misma frase que la tarjeta? El micro repite
 * el resumen de las tarjetas que un panel viejo no sabe pintar (en gracia,
 * programada, en curso) como texto, para que éste no quede mudo. Con la
 * tarjeta a la vista sería decirlo dos veces (el molde: la misma frase no se
 * dice dos veces).
 */
export function elTextoRepiteLaTarjeta(textoDelMensaje: string, tarjeta: TarjetaDeEjecucion | null | undefined): boolean {
  if (!tarjeta) return false;
  const t = textoDelMensaje.trim();
  if (!t) return false;
  const frases =
    tarjeta.tipo === 'error'
      ? [tarjeta.explicacion]
      : tarjeta.tipo === 'propuesta'
        ? [tarjeta.frase]
        : [tarjeta.resumen];
  return frases.some((f) => f.trim() === t);
}

// ── Riesgo en palabras ──────────────────────────────────────────────────────

/**
 * Los riesgos que se nombran en la tarjeta, del más grave al más leve. Cada
 * uno va con su ícono Y su palabra (nunca sólo un ícono o un color).
 */
export type RiesgoNombrado = 'irreversible' | 'plata' | 'fiscal' | 'terceros' | 'masiva' | 'dobleControl';

export function riesgosNombrados(r: RiesgoDeLaEjecucion): RiesgoNombrado[] {
  const lista: RiesgoNombrado[] = [];
  if (r.irreversible) lista.push('irreversible');
  if (r.muevePlata) lista.push('plata');
  if (r.fiscal) lista.push('fiscal');
  if (r.escribeATerceros) lista.push('terceros');
  if (r.masiva) lista.push('masiva');
  if (r.dobleControl) lista.push('dobleControl');
  return lista;
}

// ── La cuenta regresiva de la gracia (P-10) ─────────────────────────────────

/** Segundos enteros que faltan hasta `hasta` (0 si ya pasó o no se entiende). */
export function segundosQueFaltan(hasta: string, ahora: number): number {
  const fin = Date.parse(hasta);
  if (Number.isNaN(fin)) return 0;
  return Math.max(0, Math.ceil((fin - ahora) / 1000));
}

/** «0:45», «1:00», «12:05»: minutos y segundos, siempre con dos dígitos de segundos. */
export function relojDeLaCuenta(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Los momentos de la cuenta que se ANUNCIAN al lector de pantalla: al empezar,
 * a los 10 segundos y al terminar. El reloj visible cambia cada segundo; si
 * cada cambio se anunciara, el lector no diría otra cosa durante un minuto.
 */
export const HITOS_DE_LA_CUENTA = [10, 0] as const;

/** El hito en el que está la cuenta: `'inicio'` hasta los 10 s, luego 10, luego 0. */
export function hitoDeLaCuenta(segundos: number): 'inicio' | 10 | 0 {
  if (segundos <= 0) return 0;
  if (segundos <= 10) return 10;
  return 'inicio';
}

// ── La vista previa, legible ────────────────────────────────────────────────

/**
 * La vista previa llega como el back la devolvió (el plan de la renovación,
 * el preview de las dispersiones, los destinatarios del recordatorio…): cada
 * ruta con su forma. Se muestra genérica y conservadora:
 *
 *   · los datos sueltos, como pares «etiqueta · valor»;
 *   · una lista de objetos, como tabla (hasta 5 columnas);
 *   · los ids y lo vacío no se muestran (no le dicen nada a la persona);
 *   · plata, fechas y sí/no, con su formato.
 *
 * No hay HTML del back: React escapa todo.
 */
export type FormatoDeDato = 'texto' | 'moneda' | 'numero' | 'fecha' | 'booleano';

export interface DatoDeLaVistaPrevia {
  clave: string;
  etiqueta: string;
  valor: string | number | boolean;
  formato: FormatoDeDato;
}

export interface TablaDeLaVistaPrevia {
  clave: string;
  titulo: string;
  columnas: Array<{ clave: string; titulo: string; formato: FormatoDeDato }>;
  filas: Array<Record<string, string | number | boolean | null>>;
}

export interface VistaPreviaLegible {
  datos: DatoDeLaVistaPrevia[];
  tablas: TablaDeLaVistaPrevia[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;
/**
 * Una cifra es PLATA sólo si su nombre lo dice. Conservador a propósito:
 * «total», «pagos», «giros» o «cuotas» suelen ser CONTEOS («total: 38
 * destinatarios»), y «$ 38» sería un dato falso en la tarjeta.
 */
const CLAVE_DE_PLATA =
  /(canon|valor|monto|saldo|deuda|precio|neto|bruto|comision|retencion|reteica|abono|interes(?!ad)|arriendo|descuento)/i;
/** Con mayúsculas exactas: «ivaTotal», «totalCop», «valor_cop» (no «activa» ni «copropiedad»). */
const CLAVE_DE_PLATA_EXACTA = /^iva|Iva|_iva|Cop$|_cop$|^cop$/;
const esClaveDePlata = (clave: string) => CLAVE_DE_PLATA.test(clave) || CLAVE_DE_PLATA_EXACTA.test(clave);
const CLAVE_DE_ID = /^(id|uuid)$|Id$|_id$|^(agencyId|tenantId|userId)$/;
const MAX_COLUMNAS = 5;

/** «fechaDeInicio» → «Fecha de inicio»; «canon_nuevo» → «Canon nuevo». */
export function etiquetaDeLaClave(clave: string): string {
  const palabras = clave
    .replace(/[_-]+/g, ' ')
    .replace(/([a-záéíóúñ0-9])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return palabras ? palabras.charAt(0).toUpperCase() + palabras.slice(1) : clave;
}

function formatoDe(clave: string, valor: unknown): FormatoDeDato | null {
  if (typeof valor === 'boolean') return 'booleano';
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    return esClaveDePlata(clave) ? 'moneda' : 'numero';
  }
  if (typeof valor === 'string') {
    const v = valor.trim();
    if (!v || UUID.test(v)) return null;
    return FECHA_ISO.test(v) && !Number.isNaN(Date.parse(v)) ? 'fecha' : 'texto';
  }
  return null;
}

function esEscalar(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

function tablaDe(clave: string, lista: unknown[]): TablaDeLaVistaPrevia | null {
  const objetos = lista.filter(esObjeto);
  if (objetos.length === 0) return null;
  const columnas: TablaDeLaVistaPrevia['columnas'] = [];
  for (const o of objetos.slice(0, 20)) {
    for (const [k, v] of Object.entries(o)) {
      if (columnas.length >= MAX_COLUMNAS) break;
      if (CLAVE_DE_ID.test(k) || columnas.some((c) => c.clave === k)) continue;
      const formato = formatoDe(k, v);
      if (formato) columnas.push({ clave: k, titulo: etiquetaDeLaClave(k), formato });
    }
  }
  if (columnas.length === 0) return null;
  return {
    clave,
    titulo: etiquetaDeLaClave(clave),
    columnas,
    filas: objetos.map((o) =>
      Object.fromEntries(columnas.map((c) => [c.clave, esEscalar(o[c.clave]) ? (o[c.clave] as string | number | boolean) : null])),
    ),
  };
}

export function vistaPreviaLegible(datos: unknown): VistaPreviaLegible {
  const salida: VistaPreviaLegible = { datos: [], tablas: [] };
  if (datos === null || datos === undefined) return salida;
  if (Array.isArray(datos)) {
    const t = tablaDe('detalle', datos);
    if (t) salida.tablas.push(t);
    return salida;
  }
  if (!esObjeto(datos)) {
    const formato = formatoDe('valor', datos);
    if (formato && esEscalar(datos)) salida.datos.push({ clave: 'valor', etiqueta: '', valor: datos, formato });
    return salida;
  }
  const agregarDato = (clave: string, etiqueta: string, v: unknown) => {
    if (CLAVE_DE_ID.test(clave.split('.').pop() ?? clave)) return;
    const formato = formatoDe(clave, v);
    if (formato && esEscalar(v)) salida.datos.push({ clave, etiqueta, valor: v, formato });
  };
  for (const [k, v] of Object.entries(datos)) {
    if (Array.isArray(v)) {
      if (v.every(esEscalar) && v.length > 0) {
        agregarDato(k, etiquetaDeLaClave(k), v.map(String).join(', '));
      } else {
        const t = tablaDe(k, v);
        if (t) salida.tablas.push(t);
      }
    } else if (esObjeto(v)) {
      // Un nivel adentro («contrato · canon»); más hondo ya no se lee en un chat.
      for (const [k2, v2] of Object.entries(v)) {
        if (esEscalar(v2)) agregarDato(`${k}.${k2}`, `${etiquetaDeLaClave(k)} · ${etiquetaDeLaClave(k2).toLowerCase()}`, v2);
      }
    } else {
      agregarDato(k, etiquetaDeLaClave(k), v);
    }
  }
  return salida;
}
