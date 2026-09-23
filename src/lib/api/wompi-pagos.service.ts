/**
 * Wompi · Pagos a terceros — `/inmobiliaria/wompi-pagos`.
 *
 * Dos cosas distintas y dos permisos distintos en el back:
 *   · la CONEXIÓN (llaves de la inmobiliaria) pide `configuracion` — sólo el
 *     administrador por defecto;
 *   · el LOTE (mandarlo, ver cómo va, consultar) pide `dispersiones`.
 *
 * Los cuerpos se arman clave por clave: el back valida con
 * `forbidNonWhitelisted` y una clave de más es un 400.
 *
 * 🔴 Las llaves viajan SÓLO en `guardarConexion` y nunca vuelven: el back las
 * cifra y responde sin ellas.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import { anunciarProceso } from './procesos.service';
import { RECURSO_DE_LOTES } from './lotes-de-dispersion.service';
import type { LlavesDeWompi, VistaDeLaConexion, VistaDelLoteEnWompi } from './wompi-pagos.types';

export const BASE_DE_WOMPI = '/inmobiliaria/wompi-pagos';

export const wompiPagosApi = {
  async verConexion(): Promise<VistaDeLaConexion> {
    return apiClient.get<VistaDeLaConexion>(`${BASE_DE_WOMPI}/conexion`);
  },

  /** Guarda las llaves (el back las cifra) y las prueba de una vez. */
  async guardarConexion(llaves: LlavesDeWompi): Promise<VistaDeLaConexion> {
    const cuerpo: Record<string, unknown> = {
      ambiente: llaves.ambiente,
      apiKey: llaves.apiKey.trim(),
      usuarioPrincipalId: llaves.usuarioPrincipalId.trim(),
    };
    if (llaves.secretoDeEventos !== undefined) cuerpo.secretoDeEventos = llaves.secretoDeEventos.trim();
    return apiClient.put<VistaDeLaConexion>(`${BASE_DE_WOMPI}/conexion`, cuerpo);
  },

  /** «Probar conexión»: el back lee las cuentas origen y el saldo en Wompi. */
  async probarConexion(): Promise<VistaDeLaConexion> {
    return apiClient.post<VistaDeLaConexion>(`${BASE_DE_WOMPI}/conexion/probar`);
  },

  async verLote(loteId: string): Promise<VistaDelLoteEnWompi> {
    return apiClient.get<VistaDelLoteEnWompi>(`${BASE_DE_WOMPI}/lotes/${loteId}`);
  },

  /**
   * «Enviar a Wompi». Idempotente del lado del back: mandarlo dos veces nunca
   * crea dos lotes en Wompi. `facturarAhora` se manda sólo si se decidió.
   */
  async enviar(loteId: string, facturarAhora?: boolean): Promise<VistaDelLoteEnWompi> {
    const cuerpo: Record<string, unknown> = {};
    if (facturarAhora !== undefined) cuerpo.facturarAhora = facturarAhora;
    anunciarProceso();
    const res = await apiClient.post<VistaDelLoteEnWompi>(`${BASE_DE_WOMPI}/lotes/${loteId}/enviar`, cuerpo);
    invalidar(RECURSO_DE_LOTES);
    invalidar('dispersiones');
    return res;
  },

  /** «Consultar ahora»: la misma conciliación del webhook y del sondeo. */
  async consultar(loteId: string): Promise<VistaDelLoteEnWompi> {
    const res = await apiClient.post<VistaDelLoteEnWompi>(`${BASE_DE_WOMPI}/lotes/${loteId}/consultar`);
    invalidar(RECURSO_DE_LOTES);
    invalidar('dispersiones');
    return res;
  },
};

export type * from './wompi-pagos.types';
