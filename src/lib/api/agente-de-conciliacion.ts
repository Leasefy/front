'use client';

/**
 * 🔴 LO QUE PROPONE EL AGENTE DE CONCILIACIÓN para UNA línea del extracto
 * (seguimiento 6, pendiente técnico: «el cajón del front no muestra "por el
 * alias" ni las salidas del agente»).
 *
 * Micro (`NEXT_PUBLIC_AGENT_URL`, `agentFetch`):
 *   · `GET  /api/agency/{agencyId}/piloto/conciliacion/movimientos/{id}/agente`
 *     → las propuestas con su explicación (frases, porqué: alias, memoria,
 *       regla, libro), las descartadas y si la línea es una entrada o una
 *       SALIDA. Nunca escribe. Con el modelo prendido, el micro lo recuerda 10
 *       minutos por línea (abrir el cajón dos veces no paga dos veces).
 *   · `POST …/agente/rechazar` `{ opcion, noEsLaPersona? }` → «esto no es»; con
 *     `noEsLaPersona` el alias de esa señal queda bloqueado.
 *
 * Conciliar lo propuesto NO pasa por acá: va por las rutas del BACK de
 * siempre (`conciliacionBancariaApi.conciliar` / `conciliarConRecibos`, o la
 * salida como gasto del banco), que vuelven a verificar todo.
 */

import { agentFetch } from './agent-fetch';
import { falloDelMicro } from './fallo-del-micro';

export type TipoDeOpcionDelAgente =
  | 'cobro'
  | 'contrato'
  | 'recibos'
  | 'cuotas'
  | 'gasto_bancario'
  | 'giro'
  | 'egreso';

export interface OpcionDelAgente {
  tipo: TipoDeOpcionDelAgente;
  ids: string[];
}

export type AccionDelAgente =
  | { tipo: 'conciliar_uno'; body: { cobroId: string } | { tenantId: string } }
  | { tipo: 'conciliar_con_recibos'; body: { reciboIds: string[] } };

export interface AliasDeLaPropuesta {
  /** El texto del pago que se aprendió («TRANSF JUAN P»). */
  muestra: string;
  senalLlave: string;
  /** Cuántas veces lo confirmó una persona. */
  personas: number;
  /** Cuántas lo confirmó el Piloto (vale la mitad, nunca completa las 3 solo). */
  piloto: number;
  confirmaciones: number;
}

export interface PropuestaDelAgente {
  ref: string;
  tipo: TipoDeOpcionDelAgente;
  ids: string[];
  titulo: string;
  persona: string | null;
  sumaCop: number;
  diferenciaCop: number;
  calza: boolean;
  seAplicaSola: boolean;
  porQueNoSeAplicaSola: string | null;
  frases: string[];
  porQue: { tipo: 'alias' | 'grafo' | 'back' | 'regla' | 'libro' | 'valor'; texto: string; fuente?: string }[];
  avisos: string[];
  verificadaPorElBack: boolean | null;
  accion: AccionDelAgente | null;
  rechazar: OpcionDelAgente;
  destino: { tipo: 'contrato' | 'pagador'; id: string } | null;
  comoSeAplicaSola: 'exacto' | 'muchos_a_uno' | 'alias' | null;
  contractId: string | null;
  cuotaIds: string[];
  tenantId: string | null;
  alias: AliasDeLaPropuesta | null;
}

export interface AnalisisDelAgente {
  movimientoId: string;
  estado: string;
  valorCop: number;
  fecha: string;
  propuestas: PropuestaDelAgente[];
  descartadas: { titulo: string; motivo: string }[];
  memoria: { disponible: boolean; aliasUsados: number };
  razonador: string;
  libros: { id: string; titulo: string; fuente: string }[];
  resumen: string;
  inventadas?: number;
  /** `salida` = la línea es una salida de plata (4×1000, comisión, giro…). */
  sentido?: 'entrada' | 'salida';
}

export type LecturaDelAgente =
  | { estado: 'listo'; analisis: AnalisisDelAgente }
  | { estado: 'apagado' }
  | { estado: 'no-disponible' }
  | { estado: 'error'; fallo: unknown };

const base = (agencyId: string, movimientoId: string) =>
  `${process.env.NEXT_PUBLIC_AGENT_URL}/api/agency/${agencyId}/piloto/conciliacion/movimientos/${movimientoId}/agente`;

/** ¿La propuesta vino del ALIAS aprendido (el texto del pago que ya se confirmó)? */
export function vinoDelAlias(p: Pick<PropuestaDelAgente, 'comoSeAplicaSola' | 'alias' | 'porQue'>): boolean {
  return p.comoSeAplicaSola === 'alias' || p.alias !== null || p.porQue.some((x) => x.tipo === 'alias');
}

/** La clase del gasto del banco que el back entiende, si la propuesta es una. */
export function claseDelGastoDelBanco(
  p: Pick<PropuestaDelAgente, 'tipo' | 'ids'>,
): 'GMF_4X1000' | 'COMISION' | 'CUOTA_DE_MANEJO' | null {
  if (p.tipo !== 'gasto_bancario') return null;
  const c = p.ids[0];
  return c === 'GMF_4X1000' || c === 'COMISION' || c === 'CUOTA_DE_MANEJO' ? c : null;
}

export async function leerLoQuePropone(
  agencyId: string,
  movimientoId: string,
  signal?: AbortSignal,
): Promise<LecturaDelAgente> {
  if (!process.env.NEXT_PUBLIC_AGENT_URL) return { estado: 'no-disponible' };
  try {
    const res = await agentFetch(base(agencyId, movimientoId), { signal });
    if (res.status === 404) return { estado: 'no-disponible' };
    if (res.status === 409) return { estado: 'apagado' };
    if (!res.ok) return { estado: 'error', fallo: await falloDelMicro(res) };
    return { estado: 'listo', analisis: (await res.json()) as AnalisisDelAgente };
  } catch (fallo) {
    if ((fallo as { name?: string })?.name === 'AbortError') throw fallo;
    return { estado: 'error', fallo };
  }
}

/** «Esto no es» (y, con `noEsLaPersona`, el alias de esa señal queda bloqueado). */
export async function rechazarLoQuePropone(
  agencyId: string,
  movimientoId: string,
  opcion: OpcionDelAgente,
  noEsLaPersona = false,
): Promise<{ ok: true } | { ok: false; fallo: unknown }> {
  if (!process.env.NEXT_PUBLIC_AGENT_URL) return { ok: false, fallo: new Error('not_configured') };
  try {
    const res = await agentFetch(`${base(agencyId, movimientoId)}/rechazar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ opcion, ...(noEsLaPersona ? { noEsLaPersona: true } : {}) }),
    });
    if (!res.ok) return { ok: false, fallo: await falloDelMicro(res) };
    return { ok: true };
  } catch (fallo) {
    return { ok: false, fallo };
  }
}
