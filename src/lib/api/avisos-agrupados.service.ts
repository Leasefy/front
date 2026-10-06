/**
 * La bandeja de notificaciones AGRUPADA (QA de notificaciones del 04-10, NO-05).
 *
 * `GET /notifications/agrupadas` devuelve los avisos del mismo tipo, título y
 * día juntos («107 cobros generados hoy»). `total` y `unreadCount` son los de
 * los AVISOS (lo que va en «Todas» y «Sin leer»); `totalGrupos` es lo que
 * pagina. Un grupo de UN aviso trae su `id`: marcarlo o quitarlo va por las
 * rutas de siempre; uno de varios, por su `clave`.
 */
import { apiClient } from '@/lib/api/client';
import { destinoDeNotificacion } from '@/lib/utils/safe-redirect';

export interface GrupoDeAvisos {
  clave: string;
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: unknown;
  cantidad: number;
  sinLeer: number;
  read: boolean;
  createdAt: string;
}

export interface BandejaAgrupada {
  grupos: GrupoDeAvisos[];
  totalGrupos: number;
  total: number;
  unreadCount: number;
}

export interface FiltroDeLaBandeja {
  page?: number;
  limit?: number;
  soloSinLeer?: boolean;
  categoria?: string;
}

export const avisosAgrupadosApi = {
  async listar(filtro: FiltroDeLaBandeja = {}): Promise<BandejaAgrupada> {
    const q = new URLSearchParams();
    if (filtro.page) q.set('page', String(filtro.page));
    if (filtro.limit) q.set('limit', String(filtro.limit));
    if (filtro.soloSinLeer) q.set('read', 'false');
    if (filtro.categoria) q.set('category', filtro.categoria);
    const qs = q.toString();
    const r = await apiClient.get<BandejaAgrupada>(
      `/notifications/agrupadas${qs ? `?${qs}` : ''}`,
    );
    return {
      ...r,
      // Los enlaces pasan por la misma lista blanca que la bandeja de siempre.
      grupos: r.grupos.map((g) => ({
        ...g,
        actionUrl: destinoDeNotificacion(g.actionUrl) ?? null,
      })),
    };
  },

  async marcarLeido(g: Pick<GrupoDeAvisos, 'id' | 'clave' | 'cantidad'>): Promise<void> {
    if (g.cantidad <= 1) {
      await apiClient.patch(`/notifications/${g.id}/read`);
      return;
    }
    await apiClient.post('/notifications/grupo/leer', { clave: g.clave });
  },

  async quitar(g: Pick<GrupoDeAvisos, 'id' | 'clave' | 'cantidad'>): Promise<void> {
    if (g.cantidad <= 1) {
      await apiClient.delete(`/notifications/${g.id}`);
      return;
    }
    await apiClient.post('/notifications/grupo/descartar', { clave: g.clave });
  },

  async marcarTodasLeidas(): Promise<void> {
    await apiClient.post('/notifications/mark-all-read');
  },
};
