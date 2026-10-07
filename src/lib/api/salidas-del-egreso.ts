/**
 * 🔴 EGRESOS YA NO PIDE EL ID DEL MOVIMIENTO A MANO (seguimiento 6, pendiente
 * técnico de las salidas): la persona elige la salida del extracto de una lista
 * con búsqueda.
 *
 * `GET /inmobiliaria/contabilidad/egresos/:id/salidas-del-extracto?q=` → las
 * salidas PENDIENTES del extracto que pueden ser este egreso: primero las que
 * calzan con el NETO (lo único que el back concilia), después las más
 * cercanas en días; con `q`, por palabras de la descripción o la referencia,
 * o por el valor («480.000»). Conciliar sigue siendo
 * `POST egresos/:id/conciliar { movimientoBancarioId }` (`gastosApi`).
 */

import { apiClient } from '@/lib/api/client';

export interface SalidaParaElEgreso {
  id: string;
  fecha: string;
  descripcion: string;
  referencia: string | null;
  /** Lo que salió, en positivo. */
  valorCop: number;
  /** Igual al NETO del egreso: es la única que se puede conciliar. */
  calza: boolean;
  /** Días entre la línea y la fecha del egreso. */
  dias: number | null;
  cuenta: { id: string; nombre: string } | null;
}

export interface SalidasParaElEgreso {
  egreso: { id: string; netoCop: number; fecha: string | null; beneficiario: string };
  sePuedeConciliar: boolean;
  porQueNo: string | null;
  salidas: SalidaParaElEgreso[];
  total: number;
}

export const salidasDelEgresoApi = {
  listar(egresoId: string, q?: string): Promise<SalidasParaElEgreso> {
    const busqueda = (q ?? '').trim();
    const cola = busqueda ? `?${new URLSearchParams({ q: busqueda.slice(0, 120) }).toString()}` : '';
    return apiClient.get<SalidasParaElEgreso>(
      `/inmobiliaria/contabilidad/egresos/${egresoId}/salidas-del-extracto${cola}`,
    );
  },
};
