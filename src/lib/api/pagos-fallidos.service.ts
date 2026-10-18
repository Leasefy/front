/**
 * COBRI-13 (Nico 18-10): las acciones masivas de Pagos fallidos.
 * `POST /inmobiliaria/pagos-fallidos/acciones` → qué pasó con cada cuota.
 */
import { apiClient } from '@/lib/api/client'

export type AccionDeLosFallidos = 'reenviar' | 'generar' | 'seguimiento' | 'quitar_seguimiento' | 'cobranza' | 'transferencia'

export interface ResultadoDeUnaCuota {
  cuotaId: string
  /** `pedido`: se le pasó a Cobri; sale en el horario de ley si la Ley 2300 lo deja. */
  resultado: 'hecho' | 'pedido' | 'no'
  mensaje: string
}

export const pagosFallidosApi = {
  async aplicar(accion: AccionDeLosFallidos, cuotaIds: string[]): Promise<ResultadoDeUnaCuota[]> {
    const r = await apiClient.post<{ resultados: ResultadoDeUnaCuota[] }>('/inmobiliaria/pagos-fallidos/acciones', {
      accion,
      cuotaIds,
    })
    return r?.resultados ?? []
  },
}
