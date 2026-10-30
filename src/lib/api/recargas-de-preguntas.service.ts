/**
 * Recargas de preguntas al chat (back `inmobiliaria/plan/recargas-de-preguntas/`, 27-10-2026) y la bolsa del mes
 * (micro `GET /api/agency/{agencyId}/ai-hub/bolsa-de-preguntas`).
 * Al micro, SIEMPRE `agentFetch` (guardián `micro-por-agent-fetch`).
 */
import { agentFetch } from './agent-fetch';
import { apiClient } from './client';
import type { components } from './generated/agent';

export type BolsaDePreguntas = components['schemas']['AiHubBolsaDePreguntas'];

export interface RecargaALaVenta {
  preguntas: number;
  precio: number;
  iva: number;
  total: number;
  porPregunta: number;
}

export interface CompraDeRecarga {
  id: string;
  preguntas: number;
  precioCop: number;
  ivaCop: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  pagadoAt: string | null;
  venceAt: string | null;
  creadoAt: string;
}

export interface VistaDeLasRecargas {
  disponible: boolean;
  migracion: string | null;
  incluidasAlMes: number;
  aLaVenta: RecargaALaVenta[];
  vigentes: number;
  venceLaPrimera: string | null;
  compras: CompraDeRecarga[];
  /** La bolsa que trae la cuenta: 50 al mes, o 5 de una vez la gratis (30-10-2026). Ausente en un back anterior. */
  bolsa?: { incluidas: number; periodo: 'mes' | 'siempre' };
}

export const recargasDePreguntasApi = {
  ver: () => apiClient.get<VistaDeLasRecargas>('/inmobiliaria/plan/recargas-de-preguntas'),
  comprar: (preguntas: number) =>
    apiClient.post<{ recargaId: string; paymentUrl: string; total: number }>('/inmobiliaria/plan/recargas-de-preguntas', { preguntas }),
};

/**
 * La bolsa del mes, para la línea bajo el chat. Es un dato de apoyo: cualquier fallo (micro viejo sin la ruta, caído,
 * sin la URL) devuelve `null` y la pantalla no muestra nada.
 */
export async function verBolsaDePreguntas(agencyId: string): Promise<BolsaDePreguntas | null> {
  const base = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!base || !agencyId) return null;
  try {
    const res = await agentFetch(`${base}/api/agency/${encodeURIComponent(agencyId)}/ai-hub/bolsa-de-preguntas`, { method: 'GET' });
    if (!res.ok) return null;
    return (await res.json()) as BolsaDePreguntas;
  } catch {
    return null;
  }
}

export const CODIGO_BOLSA_AGOTADA = 'BOLSA_DE_PREGUNTAS_AGOTADA';
export const PANTALLA_DE_LAS_RECARGAS = '/panel/inmobiliaria/upgrade?seccion=preguntas';
