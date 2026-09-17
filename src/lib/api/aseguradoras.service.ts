/**
 * 🔴 D11 (17-09-2026): las aseguradoras que le pagan siniestros a la
 * inmobiliaria. Cada inmobiliaria registra las suyas.
 *
 *   GET   /inmobiliaria/aseguradoras       (cobros:view)
 *   POST  /inmobiliaria/aseguradoras       (cobros:edit)  { nombre, nit }
 *   PATCH /inmobiliaria/aseguradoras/:id   (cobros:edit)  { nombre?, activa? }
 *
 * Sin la migración 20260917160000 el back responde 503
 * `PAGADOR_ASEGURADORA_SIN_MIGRAR` con el motivo.
 */

import { apiClient } from '@/lib/api/client';

export interface Aseguradora {
  id: string;
  nombre: string;
  /** Sólo dígitos, sin dígito de verificación. */
  nit: string;
  activa: boolean;
}

/** Quién pagó un recibo cuando no fue el cliente. */
export interface PagadorDelRecibo {
  tipo: 'ASEGURADORA';
  aseguradoraId: string;
  nombre: string;
  nit: string;
  siniestroReferencia: string | null;
}

export const aseguradorasApi = {
  listar(): Promise<Aseguradora[]> {
    return apiClient.get<Aseguradora[]>('/inmobiliaria/aseguradoras');
  },

  crear(datos: { nombre: string; nit: string }): Promise<Aseguradora> {
    return apiClient.post<Aseguradora>('/inmobiliaria/aseguradoras', {
      nombre: datos.nombre,
      nit: datos.nit,
    });
  },

  actualizar(id: string, datos: { nombre?: string; activa?: boolean }): Promise<Aseguradora> {
    const cuerpo: Record<string, unknown> = {};
    if (datos.nombre !== undefined) cuerpo.nombre = datos.nombre;
    if (datos.activa !== undefined) cuerpo.activa = datos.activa;
    return apiClient.patch<Aseguradora>(`/inmobiliaria/aseguradoras/${id}`, cuerpo);
  },
};
