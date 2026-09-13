/**
 * «Terminó la migración y todavía no ha visto la bienvenida».
 *
 * 🔴 Nico, 2026-09-12: «cuando finalicé la migración, con el link de ingresar
 * al panel, no me mostró la bienvenida a Leasefy».
 *
 * No estaba rota: estaba atada a la sesión. `MuroDeMigracion` celebra la
 * TRANSICIÓN —el muro estaba puesto y dejó de estarlo en esta misma pestaña—
 * y eso es lo correcto para quien termina el paso 6 y se queda mirando. Pero
 * el último paso ofrece un enlace para entrar al panel, y ese enlace navega:
 * la pestaña nueva monta el muro ya bajado, no hay transición que detectar, y
 * la bienvenida no aparece nunca. Lo mismo con un F5 en el momento justo.
 *
 * Lo que faltaba no era la celebración sino la MARCA: haber terminado es un
 * hecho que sobrevive a la navegación, y verla o no es otro hecho distinto.
 * Se anota al bajar el muro y se borra al entrar. Mientras exista, la
 * bienvenida se muestra la próxima vez que se abra el panel — una vez, porque
 * entrar la borra.
 *
 * ── Por qué en el navegador y no en el back ─────────────────────────────────
 * Es el mismo criterio que `decision-de-migracion.ts`: el back sabe si la
 * migración terminó, pero no si ESTA persona ya vio la pantalla. Guardarlo
 * allá sería una columna nueva y una migración más para algo que no cambia
 * ningún dato de la inmobiliaria.
 *
 * La consecuencia se acepta a propósito: quien termina en un navegador y
 * entra desde otro no ve la bienvenida. Mostrarla dos veces sería peor.
 */

import type { PasoDeMigracion } from '@/lib/api/migracion-estado.service';

export interface BienvenidaPendiente {
  /** Los pasos tal como quedaron, para decir qué entró. */
  pasos: PasoDeMigracion[];
  /** `omitida` = «arranco de cero»: se saluda igual, sin resumen. */
  resuelta: 'completada' | 'omitida';
}

const PREFIJO = 'leasefy:migracion:bienvenida:';

function clave(agencyId: string | null | undefined): string {
  return `${PREFIJO}${agencyId ?? 'agencia'}`;
}

function esResuelta(v: unknown): v is BienvenidaPendiente['resuelta'] {
  return v === 'completada' || v === 'omitida';
}

export function leerBienvenidaPendiente(
  agencyId: string | null | undefined,
): BienvenidaPendiente | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.localStorage.getItem(clave(agencyId));
    if (!crudo) return null;
    const v: unknown = JSON.parse(crudo);
    if (!v || typeof v !== 'object') return null;
    const { pasos, resuelta } = v as Partial<BienvenidaPendiente>;
    // Ante cualquier duda, nada: una bienvenida a medias es peor que ninguna.
    if (!Array.isArray(pasos) || !esResuelta(resuelta)) return null;
    return { pasos, resuelta };
  } catch {
    return null;
  }
}

export function marcarBienvenidaPendiente(
  agencyId: string | null | undefined,
  pendiente: BienvenidaPendiente,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(clave(agencyId), JSON.stringify(pendiente));
  } catch {
    // Sin almacenamiento (modo privado, cuota) la bienvenida sigue
    // funcionando dentro de la misma pestaña, que es como funcionaba antes.
  }
}

export function olvidarBienvenidaPendiente(agencyId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(clave(agencyId));
  } catch {
    // Si no se puede borrar, la bienvenida volvería a aparecer. Es el modo
    // de fallo menos malo: molesta, no pierde nada.
  }
}
