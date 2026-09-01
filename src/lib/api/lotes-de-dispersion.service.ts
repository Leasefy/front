/**
 * Lotes de pagos a propietarios — `/inmobiliaria/lotes-de-dispersion`.
 *
 * ⚠️ La ruta base NO cuelga de `/inmobiliaria/dispersiones`: el controller de
 * dispersiones tiene un `GET :id` con `ParseUUIDPipe`, y `GET .../lotes`
 * entraría ahí como `id="lotes"` → 400. El back lo separó a propósito; acá se
 * respeta y el test lo fija.
 *
 * Los cuerpos se arman clave por clave (mismo motivo que en
 * `recibos-de-caja.service.ts`): el back valida con `forbidNonWhitelisted`, una
 * clave de más es un 400.
 *
 * `invalidar('dispersiones')`: un lote toma dispersiones pendientes y las
 * compromete; la lista de dispersiones tiene que enterarse aunque la ruta que
 * se tocó se llame distinto.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import type {
  ArchivoGenerado,
  FiltrosDeLotes,
  FormatoArchivoDePagos,
  LoteArmado,
  LoteDeDispersion,
  LoteResumen,
  SolicitudDeAprobacion,
  VistaDelLote,
} from './lotes-de-dispersion.types';

export const BASE_DE_LOTES = '/inmobiliaria/lotes-de-dispersion';

/** El recurso que escuchan las pantallas de lotes (`useRefrescoAutomatico`). */
export const RECURSO_DE_LOTES = 'lotes-de-dispersion';

/** El back devuelve, según el endpoint, o el arreglo pelado o `{ data: [...] }`. */
function comoLista<T>(res: T[] | { data: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

export const lotesDeDispersionApi = {
  /**
   * Arma el lote del mes con las dispersiones pendientes.
   *
   * Falla con 400 si no hay pendientes o si ya están todas en un lote vivo.
   * Las que no tienen la cuenta completa ENTRAN igual, con su motivo: por eso
   * la respuesta trae `excluidos`.
   */
  async armar(month: string): Promise<LoteArmado> {
    const res = await apiClient.post<LoteArmado>(BASE_DE_LOTES, { month });
    invalidar('dispersiones');
    return res;
  },

  async listar(filtros?: FiltrosDeLotes): Promise<LoteResumen[]> {
    const query = new URLSearchParams();
    if (filtros?.month) query.set('month', filtros.month);
    if (filtros?.estado) query.set('estado', filtros.estado);
    const qs = query.toString();
    const res = await apiClient.get<LoteResumen[] | { data: LoteResumen[] }>(
      `${BASE_DE_LOTES}${qs ? `?${qs}` : ''}`,
    );
    return comoLista(res);
  },

  async ver(id: string): Promise<VistaDelLote> {
    return apiClient.get<VistaDelLote>(`${BASE_DE_LOTES}/${id}`);
  },

  /**
   * Manda el lote a aprobación. Si el monto lo exige, el back emite el código
   * y lo manda POR CORREO a quienes pueden aprobar; acá vuelven los correos
   * tapados y hasta cuándo vale.
   */
  async solicitarAprobacion(id: string): Promise<SolicitudDeAprobacion> {
    return apiClient.post<SolicitudDeAprobacion>(`${BASE_DE_LOTES}/${id}/solicitar-aprobacion`);
  },

  /**
   * Aprueba el lote. Tiene que ser OTRA persona que la que lo armó.
   *
   * `codigo` sólo cuando el lote lo exige; se manda si viene, y nada más —
   * un `codigo: undefined` en el cuerpo también sería una clave de más.
   */
  async aprobar(id: string, codigo?: string): Promise<LoteDeDispersion> {
    const cuerpo: Record<string, unknown> = {};
    const limpio = codigo?.trim();
    if (limpio) cuerpo.codigo = limpio;
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/aprobar`, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /**
   * Genera el archivo plano (desde APROBADO) o vuelve a entregar el MISMO
   * (desde ARCHIVO_GENERADO, `reenvio: true`, cotejando el hash).
   *
   * Sin `formato` se usa el que el lote ya tiene o el de la inmobiliaria.
   */
  async generarArchivo(id: string, formato?: FormatoArchivoDePagos): Promise<ArchivoGenerado> {
    const cuerpo: Record<string, unknown> = {};
    if (formato) cuerpo.formato = formato;
    const res = await apiClient.post<ArchivoGenerado>(`${BASE_DE_LOTES}/${id}/archivo`, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /**
   * Baja el archivo ya generado, tal cual se sube al banco.
   *
   * Sólo desde ARCHIVO_GENERADO: el back responde 400 en cualquier otro
   * estado, porque un GET no puede avanzar un lote de pagos.
   */
  async descargarArchivo(id: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE_DE_LOTES}/${id}/archivo`);
  },

  async marcarPagado(id: string, referenciaBanco: string): Promise<LoteDeDispersion> {
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/pagado`, {
      referenciaBanco: referenciaBanco.trim(),
    });
    invalidar('dispersiones');
    return res;
  },

  /** Anula el lote. El motivo es obligatorio (5 a 300 caracteres, lo exige el back). */
  async anular(id: string, motivo: string): Promise<LoteDeDispersion> {
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/anular`, {
      motivo: motivo.trim(),
    });
    invalidar('dispersiones');
    return res;
  },
};

export type {
  ArchivoGenerado,
  EstadoDelLote,
  FilaExcluida,
  FiltrosDeLotes,
  FormatoArchivoDePagos,
  ItemDelLote,
  LoteArmado,
  LoteDeDispersion,
  LoteResumen,
  SolicitudDeAprobacion,
  VistaDelLote,
} from './lotes-de-dispersion.types';
