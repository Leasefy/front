/**
 * El dominio propio de la inmobiliaria (Nico, 31-10-2026): su página y las fichas de sus inmuebles en SU dominio, sólo
 * en los planes de pago. El back lo da de alta en Vercel y lee cómo va el DNS; aquí sólo se pide y se muestra.
 *
 * Rutas del back (`src/inmobiliaria/dominio-propio/`):
 *   · `GET /inmobiliaria/dominio-propio` — el dominio, su estado y los registros del DNS.
 *   · `PUT /inmobiliaria/dominio-propio { dominio }` — lo guarda y lo da de alta (402 `PLAN_REQUERIDO`,
 *     409 `DOMINIO_EN_USO`, 400 `DOMINIO_INVALIDO`, 503 `DOMINIO_PROPIO_SIN_CONFIGURAR`).
 *   · `POST /inmobiliaria/dominio-propio/verificar` — vuelve a mirar el DNS.
 *   · `DELETE /inmobiliaria/dominio-propio` — lo quita (su página vuelve a leasefy.co/i/<nombre>).
 */

import { apiClient } from './client';

export type EstadoDelDominio = 'SIN_DOMINIO' | 'ESPERANDO_DNS' | 'ACTIVO';

export interface RegistroDelDns {
  tipo: 'CNAME' | 'A' | 'TXT';
  /** El «nombre» o «host» del registro, tal como lo pide el proveedor del dominio (`inmuebles`, `@`, `_vercel`). */
  nombre: string;
  valor: string;
  /** `apuntar`: lleva el dominio a Leasefy. `verificar`: prueba que el dominio es de la inmobiliaria. */
  para: 'apuntar' | 'verificar';
}

export interface DominioPropio {
  /** `false` sin la migración o sin la llave de Vercel: se dice y no se ofrece guardar. */
  disponible: boolean;
  motivo: 'SIN_MIGRACION' | 'SIN_VERCEL' | null;
  /** Sólo con un plan de pago activo. */
  puedeUsarlo: boolean;
  dominio: string | null;
  estado: EstadoDelDominio;
  registros: RegistroDelDns[];
  /** `https://<dominio>` cuando está activo. */
  enlace: string | null;
  /** Cuándo se miró el DNS por última vez (ISO). */
  revisadoEl: string | null;
}

export const dominioPropioApi = {
  ver: () => apiClient.get<DominioPropio>('/inmobiliaria/dominio-propio'),
  guardar: (dominio: string) => apiClient.put<DominioPropio>('/inmobiliaria/dominio-propio', { dominio }),
  verificar: () => apiClient.post<DominioPropio>('/inmobiliaria/dominio-propio/verificar', {}),
  quitar: () => apiClient.delete<DominioPropio>('/inmobiliaria/dominio-propio'),
};
