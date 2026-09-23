/**
 * `/inmobiliaria/contabilidad/copropiedades` — los conjuntos y edificios donde
 * están los inmuebles, y el tercero dueño de la cuota de administración.
 *
 * ── Por qué esto existe (20-09-2026) ───────────────────────────────────────
 *
 * Abriendo «Contabilidad → Reportes → Terceros» se vio que la cuenta 2815 —la
 * del régimen de mandato, la que dice de quién es la plata que la inmobiliaria
 * tiene y no es suya— no tenía UN SOLO movimiento a nombre de su dueño:
 *
 *     líneas a nombre de un PROPIETARIO ...........      0
 *     líneas a nombre de un ARRENDATARIO ..........     41
 *     líneas sin tercero ..........................  1.241
 *
 * sobre $1.051.300.000. El canon se arregló apuntando al propietario. La cuota
 * de administración no tenía a quién apuntar: la cuenta se llama «recaudadas
 * para la COPROPIEDAD» y la copropiedad no existía en Leasefy.
 *
 * ── Sin la migración ───────────────────────────────────────────────────────
 *
 * `listar()` devuelve una lista VACÍA, no un error: la pantalla lo explica y
 * ofrece el nombre de la migración. Crear o asignar responden 503 con ese
 * mismo nombre. Mientras tanto la administración se sigue asentando sin
 * tercero —que es lo de hoy— y la pantalla de terceros lo cuenta.
 */

import { apiClient } from './client';

const BASE = '/inmobiliaria/contabilidad/copropiedades';

export interface Copropiedad {
  id: string;
  nombre: string;
  /** Sólo dígitos, sin DV. */
  nit: string;
  /** Lo calcula el back con el algoritmo de la DIAN, no se teclea. */
  digitoVerificacion: number | null;
  direccion: string | null;
  activa: boolean;
  /** Cuántos mandatos apuntan a ella. */
  inmuebles: number;
}

export interface NuevaCopropiedad {
  nombre: string;
  nit: string;
  direccion?: string;
  contactoNombre?: string;
  contactoCorreo?: string;
  contactoTelefono?: string;
}

/** El NIT como lo escribe un humano: «900.123.456-7». */
export function nitLegible(c: Pick<Copropiedad, 'nit' | 'digitoVerificacion'>): string {
  const conPuntos = c.nit.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return c.digitoVerificacion === null ? conPuntos : `${conPuntos}-${c.digitoVerificacion}`;
}

export interface ListaDeCopropiedades {
  copropiedades: Copropiedad[];
  /**
   * 🔴 `true` = la base todavía no tiene la migración.
   *
   * Sin este dato «ninguna todavía» y «la tabla no existe» se ven igual —una
   * lista vacía— y la pantalla ofrecería «Registrar la primera», un botón que
   * lleva derecho a un 503. Una pantalla no puede ofrecer una acción que sabe
   * que va a fallar.
   */
  faltaLaMigracion: boolean;
  migracion: string;
}

export const copropiedadesApi = {
  /** Las copropiedades de la inmobiliaria, y si la base ya puede guardarlas. */
  async listar(): Promise<ListaDeCopropiedades> {
    return apiClient.get<ListaDeCopropiedades>(BASE);
  },

  async crear(datos: NuevaCopropiedad): Promise<{
    id: string;
    nombre: string;
    nit: string;
    digitoVerificacion: number | null;
  }> {
    return apiClient.post(BASE, datos);
  },

  /** A qué copropiedad pertenece el inmueble de un mandato. `null` desvincula. */
  async asignarAMandato(
    consignacionId: string,
    copropiedadId: string | null,
  ): Promise<{ consignacionId: string; copropiedadId: string | null }> {
    return apiClient.put(`${BASE}/mandato/${encodeURIComponent(consignacionId)}`, {
      copropiedadId,
    });
  },
};
