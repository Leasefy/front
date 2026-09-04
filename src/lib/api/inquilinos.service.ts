/**
 * Los inquilinos de la inmobiliaria.
 *
 * 🔴 Por qué este servicio no existía: en Leasefy el inquilino **no es un
 * modelo**. Es un `User` con rol TENANT que aparece adentro de un `Lease`, así
 * que el panel tenía sección de propietarios y no de inquilinos — no había a
 * dónde apuntar. En la reunión del 2026-08-31 quedó explícito («yo ni siquiera
 * tengo sección de inquilinos»).
 *
 * Sólo lectura, a propósito. Un inquilino nace de un contrato o de la
 * migración de terceros, nunca de un formulario suelto: si se pudiera crear
 * uno acá existirían inquilinos sin arriendo y la lista dejaría de significar
 * «a quién le administro un inmueble». El back tampoco expone POST/PATCH.
 */

import { apiClient } from './client';

/** Los cuatro estados de `LeaseStatus` en el back. No se inventan otros. */
export type EstadoDeArriendo = 'ACTIVE' | 'ENDING_SOON' | 'ENDED' | 'TERMINATED';

/**
 * El filtro de la lista. `activos` es el default del back — se manda igual
 * cuando el usuario lo elige, para que la URL diga qué está viendo.
 */
export type FiltroDeEstado = 'activos' | 'terminados' | 'todos';

/** Un arriendo de la persona con ESTA inmobiliaria. */
export interface ArriendoDeInquilino {
  leaseId: string;
  contractId: string;
  estado: EstadoDeArriendo;
  /** ISO. El back lo guarda como `@db.Date`, así que no hay hora que mostrar. */
  desde: string;
  hasta: string;
  /** Entero en pesos: `Lease.monthlyRent` es `Int`, no decimal. */
  canonCop: number;
  /** `null` cuando el arriendo quedó sin inmueble (migración incompleta). */
  inmueble: { id: string; title: string; address: string; city: string } | null;
}

/**
 * Una PERSONA con todos sus arriendos adentro.
 *
 * La misma persona puede tener varios arriendos con la misma inmobiliaria; el
 * back ya agrupa por `tenantId`. El front no vuelve a agrupar — dos filas con
 * el mismo nombre y sin decir por qué es cómo alguien termina llamando dos
 * veces al mismo inquilino.
 */
export interface Inquilino {
  tenantId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  arriendos: ArriendoDeInquilino[];
}

export const inquilinosApi = {
  /**
   * La lista, una fila por persona.
   *
   * `buscar` va contra nombre, correo y teléfono (el back arma el `OR`). Se
   * omite del query cuando está vacío en vez de mandar `buscar=`: un
   * parámetro presente y vacío dice «busqué y no filtré», que no es lo mismo
   * que no haber buscado, y ensucia la URL que el usuario copia.
   */
  async listar(filtros: { buscar?: string; estado?: FiltroDeEstado } = {}): Promise<Inquilino[]> {
    const q = new URLSearchParams();
    const buscar = filtros.buscar?.trim();
    if (buscar) q.set('buscar', buscar);
    if (filtros.estado) q.set('estado', filtros.estado);
    const qs = q.toString();
    return apiClient.get<Inquilino[]>(`/inmobiliaria/inquilinos${qs ? `?${qs}` : ''}`);
  },

  /**
   * Una persona con TODOS sus arriendos, incluidos los terminados.
   *
   * El back resuelve esto con `estado: 'todos'`, así que la ficha nunca
   * esconde un arriendo por el filtro que había puesto la lista — que es
   * justamente lo que se va a mirar al abrirla.
   */
  async obtener(tenantId: string): Promise<Inquilino> {
    return apiClient.get<Inquilino>(
      `/inmobiliaria/inquilinos/${encodeURIComponent(tenantId)}`,
    );
  },
};

/**
 * Cuántos de sus arriendos siguen vivos.
 *
 * `ENDING_SOON` cuenta como vivo: el contrato está corriendo, sólo que se
 * vence pronto. Tratarlo como terminado haría desaparecer de «activos» a
 * gente a la que todavía hay que cobrarle.
 */
export function arriendosVigentes(inquilino: Inquilino): ArriendoDeInquilino[] {
  return inquilino.arriendos.filter(
    (a) => a.estado === 'ACTIVE' || a.estado === 'ENDING_SOON',
  );
}
