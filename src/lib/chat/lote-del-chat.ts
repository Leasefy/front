/**
 * La tarjeta LOTE del chat (29-10-2026). Nico: «que pueda hacer manejo en
 * lotes: si se le dice que le cobre a 3 o 4 o 100, lo haga».
 *
 * «Cóbrale a Juan, Ana y Pedro», «a los que deben más de 2 meses», «a los
 * contratos 12, 15 y 33»: el micro arma UNA tarjeta con la lista (cada uno con
 * lo que le toca), lo que no entra y por qué, los nombres que no resolvió solo
 * (con entre cuáles elegir) y un solo «Sí, hazlo». Con el clic corre en
 * SEGUNDO PLANO: la tarjeta pide su avance (`GET …/ai-hub/chat/lotes/{id}`)
 * mientras corre, y al final dice cómo quedó y ofrece «Reintentar los que
 * fallaron».
 *
 * Viaja en el `done` del stream (clave NUEVA `lote`) con la forma de
 * `AiHubChatTarjetaLote` del micro (`en-el-chat/contrato-del-hilo.ts`). Todo
 * tolerante: lo que no se entiende se descarta, y un botón que no llegó bien
 * formado NO se pinta (el micro ya filtró por permiso).
 */

import { leerCampos, type CampoDelFormulario, type ModoDelChat } from '@/lib/chat/acciones-del-hilo';
import { leerBoton, leerRiesgoDeLaEjecucion, type BotonDeLaTarjeta, type RiesgoDeLaEjecucion } from '@/lib/chat/tarjetas-de-ejecucion';

export type EstadoDelLote = 'propuesto' | 'ejecutando' | 'programado' | 'en_pausa' | 'hecho' | 'cancelado' | 'vencido';
export const ESTADOS_DEL_LOTE: EstadoDelLote[] = ['propuesto', 'ejecutando', 'programado', 'en_pausa', 'hecho', 'cancelado', 'vencido'];

export type EstadoDelItem = 'listo' | 'quitado' | 'pendiente' | 'en_curso' | 'hecho' | 'fallido' | 'omitido';
export const ESTADOS_DEL_ITEM: EstadoDelItem[] = ['listo', 'quitado', 'pendiente', 'en_curso', 'hecho', 'fallido', 'omitido'];

export interface ItemDelLote {
  n: number;
  /** «Juan Pérez · contrato #12». */
  etiqueta: string;
  /** «Debe $ 1.200.000», o lo que le toca. */
  detalle: string | null;
  estado: EstadoDelItem;
  resumen: string | null;
  quitable: boolean;
  /** `false` = su ficha se revisa justo antes de hacerlo (lotes grandes). */
  revisado: boolean;
}

export interface NombrePorResolver {
  nombre: string;
  motivo: 'ambiguo' | 'no_aparece' | 'no_se_pudo_buscar';
  opciones: Array<{ etiqueta: string; detalle: string | null; entidad: { tipo: string; id: string } }>;
}

export interface ProgresoDelLote {
  total: number;
  hechos: number;
  fallidos: number;
  omitidos: number;
  pendientes: number;
  quitados: number;
}

export interface TarjetaDeLote {
  tipo: 'lote';
  loteId: string;
  titulo: string;
  cita: string;
  verbo: string;
  descripcion: string;
  estado: EstadoDelLote;
  modo: ModoDelChat;
  pregunta: string;
  porQue: string;
  venceEn: string | null;
  riesgo: RiesgoDeLaEjecucion;
  cifra: number | null;
  items: ItemDelLote[];
  noEntran: Array<{ porQue: string; cuantos: number; quienes: string[] }>;
  porResolver: NombrePorResolver[];
  quedan: number;
  tope: number;
  progreso: ProgresoDelLote;
  espera: { tipo: 'horario' | 'sin_sesion' | 'limite' | 'proceso'; porQue: string; hasta: string | null } | null;
  resumen: string | null;
  fallas: Array<{ porQue: string; cuantos: number }>;
  /** Lo que se pide UNA vez para todos; la clave viaja tal cual en `datos`. */
  campos: CampoDelFormulario[];
  hacer: BotonDeLaTarjeta | null;
  cancelar: BotonDeLaTarjeta | null;
  reintentar: BotonDeLaTarjeta | null;
  seguir: BotonDeLaTarjeta | null;
  ensayo: boolean;
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const textoONulo = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const entero = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) ? v : null);
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Un botón del lote sólo vale si su intención es sobre ESTE lote. */
function botonDelLote(v: unknown, loteId: string): BotonDeLaTarjeta | null {
  const b = leerBoton(v);
  return b && 'loteId' in b.intencion && b.intencion.loteId === loteId ? b : null;
}

function leerItem(v: unknown): ItemDelLote | null {
  if (!esObjeto(v)) return null;
  const n = entero(v.n);
  const etiqueta = texto(v.etiqueta);
  if (n === null || n < 1 || !etiqueta) return null;
  return {
    n,
    etiqueta,
    detalle: texto(v.detalle),
    estado: ESTADOS_DEL_ITEM.includes(v.estado as EstadoDelItem) ? (v.estado as EstadoDelItem) : 'pendiente',
    resumen: texto(v.resumen),
    quitable: v.quitable === true,
    revisado: v.revisado !== false,
  };
}

function leerPorResolver(v: unknown): NombrePorResolver | null {
  if (!esObjeto(v)) return null;
  const nombre = texto(v.nombre);
  const motivo = v.motivo === 'ambiguo' || v.motivo === 'no_aparece' || v.motivo === 'no_se_pudo_buscar' ? v.motivo : null;
  if (!nombre || !motivo) return null;
  const opciones = Array.isArray(v.opciones)
    ? v.opciones.flatMap((o) => {
        if (!esObjeto(o) || !esObjeto(o.entidad)) return [];
        const etiqueta = texto(o.etiqueta);
        const tipo = texto(o.entidad.tipo);
        const id = texto(o.entidad.id);
        return etiqueta && tipo && id ? [{ etiqueta, detalle: texto(o.detalle), entidad: { tipo, id } }] : [];
      })
    : [];
  return { nombre, motivo, opciones };
}

function leerProgreso(v: unknown, items: ItemDelLote[]): ProgresoDelLote {
  const o = esObjeto(v) ? v : {};
  const contar = (e: EstadoDelItem[]) => items.filter((i) => e.includes(i.estado)).length;
  return {
    total: entero(o.total) ?? items.length - contar(['quitado']),
    hechos: entero(o.hechos) ?? contar(['hecho']),
    fallidos: entero(o.fallidos) ?? contar(['fallido']),
    omitidos: entero(o.omitidos) ?? contar(['omitido']),
    pendientes: entero(o.pendientes) ?? contar(['listo', 'pendiente', 'en_curso']),
    quitados: entero(o.quitados) ?? contar(['quitado']),
  };
}

/** La tarjeta del lote, o `null` si no se entiende (sin id, o sin nada que mostrar). */
export function leerTarjetaDeLote(v: unknown): TarjetaDeLote | null {
  if (!esObjeto(v) || v.tipo !== 'lote') return null;
  const loteId = texto(v.loteId);
  if (!loteId || !ESTADOS_DEL_LOTE.includes(v.estado as EstadoDelLote)) return null;
  const items = Array.isArray(v.items) ? v.items.map(leerItem).filter((i): i is ItemDelLote => i !== null) : [];
  const porResolver = Array.isArray(v.porResolver) ? v.porResolver.map(leerPorResolver).filter((x): x is NombrePorResolver => x !== null) : [];
  if (items.length === 0 && porResolver.length === 0) return null;
  const e = esObjeto(v.espera) ? v.espera : null;
  const TIPOS_DE_ESPERA = ['horario', 'sin_sesion', 'limite', 'proceso'] as const;
  type TipoDeEspera = (typeof TIPOS_DE_ESPERA)[number];
  const tipoDeEspera: TipoDeEspera | null = e && (TIPOS_DE_ESPERA as readonly unknown[]).includes(e.tipo) ? (e.tipo as TipoDeEspera) : null;
  const espera = e && tipoDeEspera && texto(e.porQue) ? { tipo: tipoDeEspera, porQue: texto(e.porQue)!, hasta: texto(e.hasta) } : null;
  return {
    tipo: 'lote',
    loteId,
    titulo: textoONulo(v.titulo) ?? '',
    cita: textoONulo(v.cita) ?? '',
    verbo: textoONulo(v.verbo) ?? '',
    descripcion: textoONulo(v.descripcion) ?? '',
    estado: v.estado as EstadoDelLote,
    modo: v.modo === 'manual' || v.modo === 'automatico' ? v.modo : 'copiloto',
    pregunta: texto(v.pregunta) ?? '¿Lo hago?',
    porQue: textoONulo(v.porQue) ?? '',
    venceEn: texto(v.venceEn),
    riesgo: leerRiesgoDeLaEjecucion(v.riesgo),
    cifra: numero(v.cifra),
    items,
    noEntran: Array.isArray(v.noEntran)
      ? v.noEntran.flatMap((g) =>
          esObjeto(g) && texto(g.porQue) && entero(g.cuantos) !== null
            ? [{ porQue: texto(g.porQue)!, cuantos: entero(g.cuantos)!, quienes: Array.isArray(g.quienes) ? g.quienes.filter((q): q is string => typeof q === 'string') : [] }]
            : [],
        )
      : [],
    porResolver,
    quedan: entero(v.quedan) ?? 0,
    tope: entero(v.tope) ?? items.length,
    progreso: leerProgreso(v.progreso, items),
    espera,
    resumen: texto(v.resumen),
    fallas: Array.isArray(v.fallas)
      ? v.fallas.flatMap((f) => (esObjeto(f) && texto(f.porQue) && entero(f.cuantos) !== null ? [{ porQue: texto(f.porQue)!, cuantos: entero(f.cuantos)! }] : []))
      : [],
    campos: leerCampos(v.campos),
    hacer: botonDelLote(v.hacer, loteId),
    cancelar: botonDelLote(v.cancelar, loteId),
    reintentar: botonDelLote(v.reintentar, loteId),
    seguir: botonDelLote(v.seguir, loteId),
    ensayo: v.ensayo === true,
  };
}

/** ¿Sigue moviéndose? Mientras corre, la tarjeta pregunta su avance. */
export function loteEnMarcha(estado: EstadoDelLote): boolean {
  return estado === 'ejecutando';
}

/** Cuántos ítems ya terminaron (hechos, fallidos u omitidos). */
export function terminados(p: ProgresoDelLote): number {
  return p.hechos + p.fallidos + p.omitidos;
}
