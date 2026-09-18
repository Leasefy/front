'use client';

/**
 * ¿Este rol puede mover la contabilidad? Y si no, por qué.
 *
 * ── Por qué existe, si el back ya lo decide ─────────────────────────────────
 *
 * El back es la autoridad: `ContabilidadEscrituraGuard` deja escribir sólo a
 * ADMIN y CONTADOR, y un AGENTE recibe 403 haga lo que haga la pantalla. Eso no
 * cambia. Lo que cambia es CUÁNDO se entera la persona: sin esto, un AGENTE
 * digita una factura de veinte líneas, le da a «Registrar» y recibe un toast
 * rojo. Con esto, el botón llega deshabilitado y dice por qué antes de que
 * escriba la primera línea.
 *
 * 🔴 Nunca al revés. Esto sólo DESHABILITA: jamás habilita nada que el back
 * rechace, y ninguna pantalla decide con esto si mostrar datos —eso lo hace
 * `PageGuard module="reportes"`, que es el mismo permiso con el que el back
 * protege las lecturas—. Si este hook se equivoca hacia el «sí», el 403 del back
 * sigue ahí y la pantalla lo muestra en palabras (`mensajeDeContabilidad`).
 *
 * ── Mientras carga no se afirma nada ────────────────────────────────────────
 *
 * `isLoading` deja `puede` en `false` con el motivo de que todavía no se sabe.
 * Un botón habilitado durante el medio segundo de carga invita a un clic que
 * puede terminar en 403; uno deshabilitado con «verificando tu rol» dice la
 * verdad de ese instante.
 */

import { useContext } from 'react';

import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { AuthContext } from '@/lib/auth/auth-context';
import { AGENCY_ROLES } from '@/lib/auth/agency-roles';

/** Los dos roles que el back deja escribir, además del admin de plataforma. */
export const ROLES_QUE_ESCRIBEN: readonly string[] = [
  AGENCY_ROLES.ADMIN,
  AGENCY_ROLES.CONTADOR,
];

export interface PuedeEscribir {
  puede: boolean;
  /** Por qué no. `null` cuando sí. Va en el `title` y al lado del botón. */
  motivo: string | null;
  /**
   * Quién está mirando, para el aviso de doble firma del lote de egresos.
   *
   * Sale de `useAuth().user.id` —el id del usuario— y no de `memberId` del
   * contexto de permisos: `LoteDeEgreso.creadoPorUserId` es lo primero, y
   * compararlo con lo segundo daría siempre «no sos el mismo», que es
   * exactamente el error que deja pasar la doble firma. `null` si no se sabe, y
   * con `null` la comparación no se hace: decide el 409 del back.
   */
  usuarioId: string | null;
}

export function usePuedeEscribir(): PuedeEscribir {
  /*
   * Las dos versiones SEGURAS de los contextos —`usePermissionsContextSafe` y
   * `useContext(AuthContext)` en vez de `useAuth()`—: los dos hooks normales
   * lanzan sin su provider, y éste se llama desde pantallas que se montan
   * sueltas en las pruebas. Que una pieza de gobierno tire la pantalla entera
   * cuando no puede averiguar un rol es peor que lo que la pieza evita: sin
   * contexto, `puede` queda en `false` con su motivo, que es la respuesta
   * honesta, y el back sigue siendo la autoridad.
   */
  const permisos = usePermissionsContextSafe();
  const auth = useContext(AuthContext);

  const usuarioId = auth?.user?.id ?? null;

  if (!permisos) {
    return {
      puede: false,
      motivo: 'No pudimos leer tu rol en la inmobiliaria. Recargá la pantalla.',
      usuarioId,
    };
  }

  if (permisos.isLoading) {
    return {
      puede: false,
      motivo: 'Estamos verificando tu rol en la inmobiliaria.',
      usuarioId,
    };
  }

  const { isAdmin, agencyRole } = permisos;
  if (isAdmin || (agencyRole !== null && ROLES_QUE_ESCRIBEN.includes(agencyRole))) {
    return { puede: true, motivo: null, usuarioId };
  }

  return {
    puede: false,
    motivo: MOTIVO_SIN_ESCRITURA,
    usuarioId,
  };
}

/**
 * El mismo texto que `mensajeDeContabilidad` usa para el 403 del back, para que
 * la pantalla diga lo mismo antes y después del intento.
 */
export const MOTIVO_SIN_ESCRITURA =
  'Sólo el administrador o el contador de la inmobiliaria pueden mover la contabilidad.';

/**
 * El texto del 403 de `SoloAdministradorGuard`, palabra por palabra.
 *
 * 🔴 No es el mismo que `MOTIVO_SIN_ESCRITURA`, y la diferencia es el punto:
 * el contador SÍ puede cerrar y SÍ puede asentar, pero no puede deshacer un
 * cierre. Decirle «sólo el administrador o el contador» al contador que no ve
 * el botón sería mentirle.
 */
export const MOTIVO_SIN_REAPERTURA =
  'Sólo un administrador puede reabrir un mes cerrado. El contador cierra; deshacer el cierre es otra decisión.';

/**
 * ¿Este rol puede REABRIR un mes cerrado? Sólo ADMIN — ni siquiera el contador
 * (`SoloAdministradorGuard`, contrato del 19-09 §1).
 *
 * Mismo criterio que `usePuedeEscribir`: esto sólo deshabilita y explica; el
 * back sigue siendo la autoridad y su 403 llega igual si la pantalla se
 * equivoca hacia el «sí».
 */
export function usePuedeReabrir(): PuedeEscribir {
  const permisos = usePermissionsContextSafe();
  const auth = useContext(AuthContext);
  const usuarioId = auth?.user?.id ?? null;

  if (!permisos) {
    return {
      puede: false,
      motivo: 'No pudimos leer tu rol en la inmobiliaria. Recargá la pantalla.',
      usuarioId,
    };
  }
  if (permisos.isLoading) {
    return {
      puede: false,
      motivo: 'Estamos verificando tu rol en la inmobiliaria.',
      usuarioId,
    };
  }
  if (permisos.isAdmin || permisos.agencyRole === AGENCY_ROLES.ADMIN) {
    return { puede: true, motivo: null, usuarioId };
  }
  return { puede: false, motivo: MOTIVO_SIN_REAPERTURA, usuarioId };
}
