/**
 * 🔴 DESHACER UNA CONCILIACIÓN (Nico, P11, 03-10-2026): «desvincular con
 * motivo y bitácora, sin anular el recibo. Sólo administrador o contador».
 *
 * `POST /inmobiliaria/conciliacion-bancaria/movimientos/:id/desvincular`
 * `{ motivo }` → la línea vuelve a PENDIENTE y sus recibos siguen vivos (sin
 * línea del banco: se pueden conciliar contra otra). El back exige el rol
 * (403 `SOLO_ADMINISTRADOR_O_CONTADOR`) y el motivo (400 `MOTIVO_OBLIGATORIO`
 * con `campos[].motivo`); sin la bitácora responde 503 `FALTA_UNA_MIGRACION`
 * sin tocar nada.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

const BASE = '/inmobiliaria/conciliacion-bancaria';

/** Los roles que pueden deshacer: el back también lo exige. */
export const ROLES_QUE_DESHACEN: ReadonlySet<string> = new Set(['ADMIN', 'CONTADOR']);

export const MOTIVO_MINIMO_PARA_DESHACER = 5;
export const MOTIVO_MAXIMO_PARA_DESHACER = 500;

export interface DesvinculacionDeLaConciliacion {
  id: string;
  movimientoId: string;
  motivo: string;
  antes: {
    conciliadoPor: string | null;
    conciliadoAt: string | null;
    reciboId: string | null;
    cobroId: string | null;
  };
  reciboIds: string[];
  vinculos: number;
  actor: { userId: string; nombre: string | null; email: string | null; rol: string };
  createdAt: string;
}

export interface ConciliacionDeshecha {
  movimientoId: string;
  estado: 'PENDIENTE';
  /** Los recibos que se quedaron sin línea del banco. Ninguno se anuló. */
  recibos: { id: string; numero: number; valorCop: number }[];
  desvinculacion: DesvinculacionDeLaConciliacion;
}

export interface HistoriaDeLaLinea {
  disponible: boolean;
  motivo: string | null;
  desvinculaciones: DesvinculacionDeLaConciliacion[];
}

export const deshacerLaConciliacionApi = {
  async desvincular(movimientoId: string, motivo: string): Promise<ConciliacionDeshecha> {
    const res = await apiClient.post<ConciliacionDeshecha>(
      `${BASE}/movimientos/${movimientoId}/desvincular`,
      { motivo: motivo.trim() },
    );
    invalidar('cobros');
    return res;
  },

  historia(movimientoId: string): Promise<HistoriaDeLaLinea> {
    return apiClient.get<HistoriaDeLaLinea>(`${BASE}/movimientos/${movimientoId}/desvinculaciones`);
  },
};

/** «Los recibos N.º 101, 102 y 103 siguen vivos…» para el aviso de después. */
export function textoDeLoDeshecho(r: ConciliacionDeshecha): string {
  const numeros = r.recibos.map((x) => `N.º ${x.numero}`);
  if (numeros.length === 0) return 'La línea volvió a pendientes.';
  const lista =
    numeros.length === 1
      ? numeros[0]
      : `${numeros.slice(0, -1).join(', ')} y ${numeros[numeros.length - 1]}`;
  return numeros.length === 1
    ? `La línea volvió a pendientes. El recibo ${lista} sigue vivo, sin línea del banco: concílialo contra la línea correcta.`
    : `La línea volvió a pendientes. Los recibos ${lista} siguen vivos, sin línea del banco: concílialos contra la línea correcta.`;
}
