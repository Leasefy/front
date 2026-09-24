/**
 * Los datos del perfil: el retrato que se pinta y cómo se manda al backend.
 *
 * 🔴 22-09 · Vivían dentro de `page.tsx` con `export`, y un archivo de página
 * sólo puede exportar el juego cerrado que Next admite (`default`, `metadata`,
 * `revalidate`…). Cualquier otro export lo rechaza con «Property 'X' is
 * incompatible with index signature».
 *
 * Lo llamativo es DÓNDE no se veía. `next build` no lo dice, porque
 * `next.config` trae `typescript: { ignoreBuildErrors: true }`. El CI tampoco,
 * porque corre `tsc --noEmit` sobre un checkout limpio y esa restricción vive
 * en `.next/types`, que sólo existe después de compilar. Se ve en un solo
 * sitio: compilar en local y correr `tsc` encima. Cuatro páginas estaban así.
 *
 * Estaban exportados para poder probarlos desde `page.test.tsx`. Sacarlos a su
 * propio archivo es lo que correspondía de entrada: no son de la página, y así
 * se prueban sin montar la pantalla entera.
 */

/** Los campos que esta pantalla pinta y edita. */
export interface DatosDelPerfil {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

/**
 * El retrato del usuario tal como lo guarda el backend.
 *
 * 🔴 Existe porque «Cancelar» no cancelaba. El formulario se sembraba UNA vez
 * en el `useState` inicial y `handleCancelEdit` sólo cerraba la edición: lo
 * tipeado quedaba en `formData`, que es lo mismo que pinta la vista de lectura.
 * Entonces escribías un nombre, dabas Cancelar, y la ficha seguía mostrando el
 * nombre descartado — y el siguiente «Guardar» de CUALQUIER sección lo mandaba
 * al backend como si lo hubieras confirmado.
 */
export function datosDelUsuario(
  user: Partial<DatosDelPerfil> | null | undefined,
): DatosDelPerfil {
  return {
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    birthDate: user?.birthDate || '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
  };
}

/**
 * Un campo vaciado se manda como `null`, no como `undefined`.
 *
 * 🔴 `UsersService.updateProfile` distingue las dos cosas a propósito —«null
 * clears the field; undefined leaves it unchanged»— y esta pantalla mandaba
 * `undefined` con un `|| undefined`. `JSON.stringify` borra las claves
 * `undefined`, así que el campo ni siquiera llegaba al backend: borrabas tu
 * teléfono, apretabas Guardar, salía «Cambios guardados» y el número volvía.
 * El toast afirmaba un borrado que nunca pasó.
 */
export function oNulo(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}
