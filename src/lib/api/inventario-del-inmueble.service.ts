/**
 * El inventario del inmueble por versiones. Las rutas entran por la
 * consignación, igual que la ficha del inmueble.
 */
import { apiClient, ApiError, getAccessToken } from '@/lib/api/client';
import type {
  CopiaDelContrato,
  InventariosDelInmueble,
  ItemDeVersion,
  ParaIniciarUnContrato,
} from '@/lib/types/inventario-del-inmueble';

const BASE = '/inmobiliaria';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export const inventarioDelInmuebleApi = {
  listar(consignacionId: string): Promise<InventariosDelInmueble> {
    return apiClient.get<InventariosDelInmueble>(`${BASE}/consignaciones/${consignacionId}/inventarios`);
  },

  /** Reemplaza los ítems del borrador; si no hay, el back abre la versión siguiente. */
  guardarBorrador(consignacionId: string, items: ItemDeVersion[]): Promise<InventariosDelInmueble> {
    return apiClient.put<InventariosDelInmueble>(
      `${BASE}/consignaciones/${consignacionId}/inventarios/borrador`,
      { items },
    );
  },

  completar(consignacionId: string): Promise<InventariosDelInmueble> {
    return apiClient.post<InventariosDelInmueble>(
      `${BASE}/consignaciones/${consignacionId}/inventarios/borrador/completar`,
    );
  },

  paraIniciar(propertyId: string): Promise<ParaIniciarUnContrato> {
    return apiClient.get<ParaIniciarUnContrato>(
      `${BASE}/inventarios/para-iniciar?propertyId=${encodeURIComponent(propertyId)}`,
    );
  },

  copiaDelContrato(contractId: string): Promise<CopiaDelContrato> {
    return apiClient.get<CopiaDelContrato>(`${BASE}/contratos/${contractId}/inventario`);
  },

  /**
   * La foto de UN ítem del borrador. Reintentar pisa la misma foto del mismo
   * borrador (la ruta la arma el back con la versión y el `itemId`).
   */
  async subirFotoDelBorrador(consignacionId: string, itemId: string, foto: Blob): Promise<string> {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append('file', foto, `${itemId}.jpg`);
    formData.append('itemId', itemId);
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}${BASE}/consignaciones/${consignacionId}/inventarios/borrador/foto`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } catch (err) {
      throw new ApiError(
        0,
        `No pudimos conectarnos al servidor. ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: unknown };
      throw new ApiError(
        res.status,
        typeof body.message === 'string' ? body.message : 'No se pudo subir la foto',
      );
    }
    const { photoUrl } = (await res.json()) as { photoUrl: string };
    return photoUrl;
  },
};
