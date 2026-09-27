/**
 * Niti · calidad — las tres rutas de panel del micro (26-09-2026).
 *
 *   GET  /api/agency/{agencyId}/calidad/resumen
 *   GET  /api/agency/{agencyId}/calidad/inmuebles?page&limit&filtro
 *   POST /api/agency/{agencyId}/calidad/propuestas/{correccionId}/decision
 *
 * La forma la fija el contrato entre repos (`__tests__/niti-contrato.json`,
 * sección `panel`); el micro las construye en paralelo, así que esto se
 * programa contra el contrato, no contra un servidor vivo. Tipos propios en
 * `@/lib/types/niti` (no los generados: estas rutas son nuevas).
 *
 * Va directo al micro con el JWT del usuario vía `agentFetch` (reintento ante
 * un 401 por token vencido), el mismo camino que `ap.service.ts` y `piloto.ts`.
 *
 * Qué se «parsea»: el cuerpo tiene que tener la forma del contrato (si no, es
 * un error, no una lista vacía), las listas ausentes se leen vacías y una
 * `accion` que este front no conoce queda como `desconocida` para que la
 * pantalla no ofrezca aprobar algo que no sabe qué hace.
 */

import { ApiError } from './client';
import { agentFetch } from './agent-fetch';
import type {
  AccionDePropuesta,
  DecisionDeCalidad,
  EstadoDePropuesta,
  FaltaDeCalidad,
  FiltrosDeCalidad,
  FotoSenalada,
  FotosIADelMes,
  InmuebleAuditado,
  MotivoDeCalidad,
  PaginaDeCalidad,
  ProblemaDeCalidad,
  PropuestaDeCalidad,
  RespuestaDeDecision,
  ResumenDeCalidad,
  TipoDeNegocioDeCalidad,
  TipoDePropuesta,
} from '@/lib/types/niti';

/** No hay URL del micro: no sale ninguna llamada. */
export class NitiNoDisponibleError extends Error {
  constructor(message = 'Niti · calidad no está disponible en este momento.') {
    super(message);
    this.name = 'NitiNoDisponibleError';
  }
}

function agentUrl(): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!url) throw new NitiNoDisponibleError();
  return url;
}

const base = (agencyId: string) => `${agentUrl()}/api/agency/${encodeURIComponent(agencyId)}/calidad`;

/** El micro escribe sus errores en español; si no trae ninguno, se dice por status. */
async function lanzarError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const delMicro = [body.mensaje, body.motivo, body.error, body.message].find(
    (x): x is string => typeof x === 'string' && x.trim() !== '',
  );
  if (res.status === 401) throw new ApiError(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  if (delMicro) throw new ApiError(res.status, delMicro);
  if (res.status === 403) {
    throw new ApiError(403, 'No tienes permiso para ver la calidad de las publicaciones de esta inmobiliaria.');
  }
  if (res.status === 503) throw new ApiError(503, 'Niti · calidad no está disponible en este momento. Intenta más tarde.');
  throw new ApiError(res.status, `Error ${res.status}`);
}

async function leerJson(res: Response): Promise<unknown> {
  if (!res.ok) await lanzarError(res);
  return res.json();
}

// ── Lectores ────────────────────────────────────────────────────────────────

type Crudo = Record<string, unknown>;

function esObjeto(x: unknown): x is Crudo {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function noEsElContrato(que: string): never {
  throw new Error(`La respuesta de Niti (${que}) no tiene la forma del contrato.`);
}

const texto = (x: unknown): string => (typeof x === 'string' ? x : '');
const textoONull = (x: unknown): string | null => (typeof x === 'string' ? x : null);
const numero = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
const numeroONull = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

function leerFotosIA(x: unknown): FotosIADelMes {
  const f = esObjeto(x) ? x : {};
  return {
    activo: f.activo === true,
    revisadasEsteMes: numero(f.revisadasEsteMes),
    gastoEstimadoUsdEsteMes: numero(f.gastoEstimadoUsdEsteMes),
    topeUsdMes: numero(f.topeUsdMes),
  };
}

export function leerResumen(x: unknown): ResumenDeCalidad {
  if (!esObjeto(x) || typeof x.activo !== 'boolean') noEsElContrato('resumen');
  return {
    activo: x.activo,
    nombre: texto(x.nombre),
    ultimaPasada: textoONull(x.ultimaPasada),
    errorDeLaUltimaPasada: textoONull(x.errorDeLaUltimaPasada),
    inmueblesAuditados: numero(x.inmueblesAuditados),
    conProblemas: numero(x.conProblemas),
    puntajePromedio: numeroONull(x.puntajePromedio),
    fotosIA: leerFotosIA(x.fotosIA),
  };
}

const ACCIONES: readonly AccionDePropuesta[] = ['campo', 'despublicar', 'portada', 'tarea'];

function leerPropuesta(x: unknown): PropuestaDeCalidad {
  const p = esObjeto(x) ? x : {};
  const accion = ACCIONES.find((a) => a === p.accion) ?? 'desconocida';
  return {
    id: texto(p.id),
    tipo: (p.tipo === 'tarea' ? 'tarea' : 'aplicable') as TipoDePropuesta,
    texto: texto(p.texto),
    accion,
  };
}

function leerInmueble(x: unknown): InmuebleAuditado {
  if (!esObjeto(x) || typeof x.propertyId !== 'string') noEsElContrato('inmueble');
  return {
    propertyId: x.propertyId,
    codigo: numeroONull(x.codigo),
    titulo: texto(x.titulo),
    barrio: textoONull(x.barrio),
    ciudad: textoONull(x.ciudad),
    tipoDeNegocio: texto(x.tipoDeNegocio) as TipoDeNegocioDeCalidad,
    motivo: texto(x.motivo) as MotivoDeCalidad,
    puntaje: numero(x.puntaje),
    posibleTomado: x.posibleTomado === true,
    falta: lista(x.falta).filter(esObjeto).map<FaltaDeCalidad>((f) => ({ campo: texto(f.campo), que: texto(f.que) })),
    problemas: lista(x.problemas)
      .filter(esObjeto)
      .map<ProblemaDeCalidad>((p) => ({ codigo: texto(p.codigo), severidad: texto(p.severidad), texto: texto(p.texto) })),
    fotosSenaladas: lista(x.fotosSenaladas)
      .filter(esObjeto)
      .map<FotoSenalada>((f) => ({ fotoId: texto(f.fotoId), url: texto(f.url), motivo: texto(f.motivo) })),
    propuestas: lista(x.propuestas).map(leerPropuesta).filter((p) => p.id !== ''),
    auditadoEn: texto(x.auditadoEn),
    href: texto(x.href) || `/panel/inmobiliaria/inmuebles/${x.propertyId}`,
  };
}

export function leerPagina(x: unknown): PaginaDeCalidad {
  if (!esObjeto(x) || !Array.isArray(x.items)) noEsElContrato('inmuebles');
  const items = x.items.map(leerInmueble);
  return {
    items,
    total: typeof x.total === 'number' ? x.total : items.length,
    page: numero(x.page) || 1,
    limit: numero(x.limit) || items.length,
  };
}

const ESTADOS: readonly EstadoDePropuesta[] = ['propuesta', 'aplicada', 'fallida', 'rechazada', 'resuelta', 'hecha'];

function leerDecision(x: unknown): RespuestaDeDecision {
  if (!esObjeto(x) || typeof x.estado !== 'string') noEsElContrato('decisión');
  const estado = ESTADOS.find((e) => e === x.estado);
  if (!estado) noEsElContrato('decisión');
  return { id: texto(x.id), estado, mensaje: texto(x.mensaje) };
}

// ── El cliente ──────────────────────────────────────────────────────────────

export const nitiApi = {
  /** Cómo va Niti en esta inmobiliaria: si está prendido, la última pasada y sus cifras. */
  async resumen(agencyId: string): Promise<ResumenDeCalidad> {
    const res = await agentFetch(`${base(agencyId)}/resumen`);
    return leerResumen(await leerJson(res));
  },

  /** Los inmuebles auditados, de peor a mejor puntaje, paginados y filtrados. */
  async inmuebles(
    agencyId: string,
    { page = 1, limit = 20, filtro = 'todos' }: FiltrosDeCalidad = {},
  ): Promise<PaginaDeCalidad> {
    const q = new URLSearchParams({ page: String(page), limit: String(limit), filtro });
    const res = await agentFetch(`${base(agencyId)}/inmuebles?${q.toString()}`);
    return leerPagina(await leerJson(res));
  },

  /**
   * Aprobar (aplica o marca hecha) o rechazar una propuesta. Una aplicación
   * que el back no pudo hacer NO es un error HTTP: llega `estado: 'fallida'`
   * con el motivo en `mensaje`.
   */
  async decidir(agencyId: string, correccionId: string, decision: DecisionDeCalidad): Promise<RespuestaDeDecision> {
    const res = await agentFetch(`${base(agencyId)}/propuestas/${encodeURIComponent(correccionId)}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    return leerDecision(await leerJson(res));
  },
};
