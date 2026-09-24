/**
 * Los inquilinos de la inmobiliaria.
 *
 * 🔴 Por qué este servicio no existía: en Leasefy el inquilino **no es un
 * modelo**. Es un `User` con rol TENANT que aparece adentro de un `Lease`, así
 * que el panel tenía sección de propietarios y no de inquilinos — no había a
 * dónde apuntar. En la reunión del 2026-08-31 quedó explícito («yo ni siquiera
 * tengo sección de inquilinos»).
 *
 * ── 🔴 2026-09-04: acá se crea un inquilino ────────────────────────────────
 *
 * Este archivo decía «sólo lectura, a propósito». Nico, mirando la pantalla:
 * «*¿pero por qué crear contrato en inquilinos? En inquilino es crear
 * inquilino*». Como en Propietarios se crea un propietario.
 *
 * El back ahora expone `POST /inmobiliaria/inquilinos` y la lista ya no sale
 * sólo de los arriendos: una persona sin contrato existe y se ve, con
 * `arriendos: []`. Lo que NO cambia es que sin contrato no se le cobra — eso
 * lo dice el cajón que la crea.
 */

import { apiClient } from './client';

/** Los cuatro estados de `LeaseStatus` en el back. No se inventan otros. */
export type EstadoDeArriendo = 'ACTIVE' | 'ENDING_SOON' | 'ENDED' | 'TERMINATED';

/**
 * El filtro de la lista. `activos` es el default del back — se manda igual
 * cuando el usuario lo elige, para que la URL diga qué está viendo.
 */
export type FiltroDeEstado = 'activos' | 'terminados' | 'todos';

/**
 * Cuántas personas hay detrás de cada pestaña.
 *
 * 🔴 `activos + terminados` puede ser MAYOR que `todos`, y está bien: una
 * persona con un contrato vivo y otro terminado sale en las dos listas, así
 * que sale en los dos números. Lo que sí se cumple es que el número de una
 * pestaña es cuántas filas se ven al clickearla.
 */
export interface ConteosDeInquilinos {
  activos: number;
  terminados: number;
  todos: number;
}

/** Un arriendo de la persona con ESTA inmobiliaria. */
export interface ArriendoDeInquilino {
  /**
   * 🔴 `null` cuando el contrato nunca generó `Lease`. Desde el 20-09 la lista
   * sale del CONTRATO y no del `Lease`: un contrato migrado sin cuenta del
   * inquilino nunca generó uno, y sus inquilinos —13 personas que pagan
   * $39.045.650 de arriendo al mes en la agencia de QA— no aparecían en esta
   * pantalla en ninguna parte.
   */
  leaseId: string | null;
  contractId: string;
  estado: EstadoDeArriendo;
  /** ISO. El back lo guarda como `@db.Date`, así que no hay hora que mostrar. */
  desde: string | null;
  /** `null` si el contrato no dice hasta cuándo. */
  hasta: string | null;
  /** Entero en pesos: `Contract.monthlyRent` es `Int`, no decimal. */
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
  /**
   * Su `User.id` cuando tiene cuenta del portal. Cuando no —se cargó con
   * documento y sin correo—, el id de su ficha de tercero. Es un uuid en los
   * dos casos y es con lo que el back la vuelve a encontrar.
   */
  tenantId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  /** Ya normalizado por el back (una cédula son sólo dígitos). */
  documento: string | null;
  arriendos: ArriendoDeInquilino[];
}

/** Los cinco tipos de `PropietarioDocumentType` en el back. No hay otros. */
export type TipoDeDocumento = 'CC' | 'CE' | 'TI' | 'NIT' | 'PASSPORT';

/**
 * Lo que se manda para crear UNO.
 *
 * El correo y el documento son opcionales, pero el back exige al menos uno:
 * son las dos llaves con las que después se lo encuentra —el documento para
 * la migración de contratos, el correo para su cuenta del portal—. El drawer
 * valida lo mismo antes de mandar, para no gastar un viaje.
 */
export interface NuevoInquilino {
  nombre: string;
  tipoDocumento?: TipoDeDocumento;
  documento?: string;
  correo?: string;
  telefono?: string;
}

export const inquilinosApi = {
  /**
   * Crear un inquilino, sin contrato.
   *
   * Devuelve la persona con la MISMA forma que una fila de la lista (con
   * `arriendos: []`) e `invitado`: si esta llamada mandó la invitación al
   * portal, o si la cuenta ya existía y sólo se vinculó.
   */
  async crear(datos: NuevoInquilino): Promise<{ inquilino: Inquilino; invitado: boolean }> {
    return apiClient.post<{ inquilino: Inquilino; invitado: boolean }>(
      '/inmobiliaria/inquilinos',
      datos,
    );
  },

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
   * Los números de las pestañas, con la misma búsqueda que la lista.
   *
   * Va aparte de `listar` porque la lista trae UNA pestaña y los números son
   * de las tres: meterlos en la misma respuesta obligaría a recalcular los
   * tres agrupados en cada página de la lista.
   */
  async conteos(filtros: { buscar?: string } = {}): Promise<ConteosDeInquilinos> {
    const q = new URLSearchParams();
    const buscar = filtros.buscar?.trim();
    if (buscar) q.set('buscar', buscar);
    const qs = q.toString();
    return apiClient.get<ConteosDeInquilinos>(
      `/inmobiliaria/inquilinos/conteos${qs ? `?${qs}` : ''}`,
    );
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
