/**
 * 🔴 Ola E (03-10-2026): lo nuevo del giro devuelto, aparte de
 * `finanzas.service.ts` (que es el contrato congelado del 17-09).
 *
 *   · `GET  /inmobiliaria/finanzas/giros-devueltos/lineas-del-extracto?dispersionId=`
 *     — las ENTRADAS del extracto que pueden ser la devolución del giro (el
 *     mismo valor, hasta 30 días después), para enlazarla al registrarla
 *     (C2-SALIDAS Q4). Permiso `dispersiones:view`.
 *   · `POST /inmobiliaria/finanzas/giros-devueltos/:id/reversar-en-el-libro`
 *     — vuelve a pedir la reversa en el libro si al registrarla faltaba una
 *     cuenta del mapeo. Permiso `dispersiones:edit`.
 *
 * ⚠ Rutas nuevas del back de esta ola: `rutas-del-back.json` se regenera con
 * el back de la ola (lo hace el principal).
 */

import { apiClient } from '@/lib/api/client';
import type { LineasDeLaDevolucion, ReversaDelGiroDevuelto } from '@/lib/api/finanzas.types';

const BASE = '/inmobiliaria/finanzas/giros-devueltos';

export const girosDevueltosApi = {
  lineasDeLaDevolucion: (dispersionId: string) =>
    apiClient.get<LineasDeLaDevolucion>(
      `${BASE}/lineas-del-extracto?dispersionId=${encodeURIComponent(dispersionId)}`,
    ),

  reversarEnElLibro: (id: string) =>
    apiClient.post<ReversaDelGiroDevuelto>(
      `${BASE}/${encodeURIComponent(id)}/reversar-en-el-libro`,
      {},
    ),
};
