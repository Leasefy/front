/**
 * Medios de pago de la inmobiliaria — `/inmobiliaria/medios-de-pago`.
 *
 * Mismo patrón que `reglas-de-mora.service.ts`: `apiClient` + cuerpos armados
 * clave por clave, porque el back valida con `forbidNonWhitelisted: true` y
 * una clave de más es 400. `medios-de-pago.service.test.ts` fija el juego
 * exacto de claves.
 */

import { apiClient } from '@/lib/api/client';
import type {
  CambiosDeMedioDePago,
  MedioDePago,
  MediosDeUnaInmobiliariaParaInquilino,
  NuevoMedioDePago,
  TipoDelCatalogo,
} from './medios-de-pago.types';

const BASE = '/inmobiliaria/medios-de-pago';

function comoLista<T>(res: T[] | { data: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

/** «» viaja como `null`: para el back un banco vacío no es un banco. */
function texto(v: string | null | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const limpio = v.trim();
  return limpio === '' ? null : limpio;
}

const CLAVES_DE_TEXTO = [
  'instrucciones',
  'banco',
  'tipoDeCuenta',
  'numeroDeCuenta',
  'titular',
  'documentoTitular',
  'enlace',
] as const;

export function cuerpoDeMedio(datos: NuevoMedioDePago | CambiosDeMedioDePago): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {};
  if (datos.tipo !== undefined) cuerpo.tipo = datos.tipo;
  if (datos.nombre !== undefined) cuerpo.nombre = datos.nombre.trim();
  for (const clave of CLAVES_DE_TEXTO) {
    const v = texto(datos[clave]);
    if (v !== undefined) cuerpo[clave] = v;
  }
  if (datos.visibleAlInquilino !== undefined) cuerpo.visibleAlInquilino = datos.visibleAlInquilino;
  if (datos.activo !== undefined) cuerpo.activo = datos.activo;
  if (datos.orden !== undefined) cuerpo.orden = datos.orden;
  return cuerpo;
}

/** Los medios se muestran como se ordenaron; a igual orden, el más viejo primero. */
export function ordenarMedios(medios: MedioDePago[]): MedioDePago[] {
  return [...medios].sort((a, b) => a.orden - b.orden || a.createdAt.localeCompare(b.createdAt));
}

export const mediosDePagoApi = {
  async listar(): Promise<MedioDePago[]> {
    const res = await apiClient.get<MedioDePago[] | { data: MedioDePago[] }>(BASE);
    return ordenarMedios(comoLista(res));
  },

  async catalogo(): Promise<TipoDelCatalogo[]> {
    return comoLista(await apiClient.get<TipoDelCatalogo[]>(`${BASE}/catalogo-de-medios`));
  },

  async crear(nuevo: NuevoMedioDePago): Promise<MedioDePago> {
    return apiClient.post<MedioDePago>(BASE, cuerpoDeMedio(nuevo));
  },

  async actualizar(id: string, cambios: CambiosDeMedioDePago): Promise<MedioDePago> {
    return apiClient.put<MedioDePago>(`${BASE}/${id}`, cuerpoDeMedio(cambios));
  },

  /** DELETE = desactivar. El medio queda, apagado. */
  async desactivar(id: string): Promise<MedioDePago> {
    return apiClient.delete<MedioDePago>(`${BASE}/${id}`);
  },

  async reordenar(items: { id: string; orden: number }[]): Promise<MedioDePago[]> {
    const res = await apiClient.put<MedioDePago[]>(`${BASE}/orden`, {
      items: items.map((i) => ({ id: i.id, orden: i.orden })),
    });
    return ordenarMedios(comoLista(res));
  },

  /** El lado del inquilino: por inmobiliaria, sólo lo visible, enmascarado. */
  async paraInquilino(): Promise<MediosDeUnaInmobiliariaParaInquilino[]> {
    return comoLista(
      await apiClient.get<MediosDeUnaInmobiliariaParaInquilino[]>(`${BASE}/para-inquilino`),
    );
  },
};
