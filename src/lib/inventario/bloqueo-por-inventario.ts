/**
 * El bloqueo de «iniciar un contrato» por el inventario del inmueble.
 *
 * El back lo dice de dos maneras y las dos terminan acá:
 *  · ANTES de crear, `GET /inmobiliaria/inventarios/para-iniciar` (el
 *    formulario lo pregunta al elegir el inmueble);
 *  · AL crear o activar, un 409 con `code: INVENTARIO_NO_VIGENTE` y la
 *    consignación para armar el enlace.
 */
import { ApiError } from '@/lib/api/client';
import type {
  ContratoQuePideActualizar,
  MotivoDeInventarioNoVigente,
  ParaIniciarUnContrato,
} from '@/lib/types/inventario-del-inmueble';

export const CODIGO_INVENTARIO_NO_VIGENTE = 'INVENTARIO_NO_VIGENTE';

export interface BloqueoPorInventario {
  motivo: MotivoDeInventarioNoVigente;
  /** `null` si el back no supo a qué ficha mandar. */
  consignacionId: string | null;
  porActualizarTras: ContratoQuePideActualizar | null;
}

const MOTIVOS: MotivoDeInventarioNoVigente[] = [
  'SIN_INVENTARIO',
  'SOLO_BORRADOR',
  'ANTERIOR_AL_FIN_DEL_CONTRATO',
];

function esMotivo(x: unknown): x is MotivoDeInventarioNoVigente {
  return typeof x === 'string' && (MOTIVOS as string[]).includes(x);
}

/** El 409 del back, o `null` si el error es otro. */
export function bloqueoDelError(err: unknown): BloqueoPorInventario | null {
  if (!(err instanceof ApiError) || err.code !== CODIGO_INVENTARIO_NO_VIGENTE) return null;
  const d = err.detalle ?? {};
  return {
    motivo: esMotivo(d.motivo) ? d.motivo : 'SIN_INVENTARIO',
    consignacionId: typeof d.consignacionId === 'string' ? d.consignacionId : null,
    porActualizarTras:
      d.porActualizarTras && typeof d.porActualizarTras === 'object'
        ? (d.porActualizarTras as ContratoQuePideActualizar)
        : null,
  };
}

/** Lo que responde `para-iniciar`, o `null` si se puede iniciar (o no se exige). */
export function bloqueoDeLaConsulta(r: ParaIniciarUnContrato | null | undefined): BloqueoPorInventario | null {
  if (!r?.exigible || !r.vigencia || r.vigencia.vigente || !r.vigencia.motivo) return null;
  return {
    motivo: r.vigencia.motivo,
    consignacionId: r.consignacionId,
    porActualizarTras: r.vigencia.porActualizarTras,
  };
}

/** A dónde manda el enlace: la sección del inventario en la ficha del inmueble. */
export function enlaceAlInventario(consignacionId: string): string {
  return `/panel/inmobiliaria/inmuebles/${consignacionId}#inventario`;
}

/** «A-12» si trae el número del sistema viejo, «#12» si no. */
export function numeroDelContrato(c: Pick<ContratoQuePideActualizar, 'code' | 'externalId'>): string {
  if (c.externalId) return c.externalId;
  return c.code != null ? `#${c.code}` : '';
}

/** `2026-08-31` → «31 de agosto de 2026». */
export function diaLegible(dia: string): string {
  const fecha = new Date(`${dia.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(fecha.getTime())) return dia;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
}

/** Un instante (`2026-09-01T01:00:00Z`) → su día en Colombia, legible. */
export function instanteLegible(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(fecha);
}
