/**
 * Términos de cobro del contrato — lo que el formulario de crear/editar
 * manda al back en `prorratearPrimerMes` y `diasDePlazo`.
 *
 * Puro y sin React para poder fijar el payload exacto en un test: el back
 * corre `forbidNonWhitelisted`, así que una clave de más es 400 y una clave
 * con el tipo equivocado (un `"3"` en vez de `3`) también.
 */

/** Techo del esquema (`@Max(60)` en los DTOs del back). */
export const MAX_DIAS_DE_PLAZO = 60;

export interface TerminosDeCobroForm {
  prorratearPrimerMes: boolean;
  /** Texto del input. Vacío = hereda los días de plazo de la inmobiliaria. */
  diasDePlazo: string;
}

export interface TerminosDeCobro {
  prorratearPrimerMes: boolean;
  /** `null` = hereda los de la inmobiliaria. */
  diasDePlazo: number | null;
}

/** Mensaje de error del campo, o `undefined` si está bien. Vacío es válido. */
export function validarDiasDePlazo(texto: string): string | undefined {
  const limpio = texto.trim();
  if (limpio === '') return undefined;
  if (!/^\d+$/.test(limpio)) return 'Sólo días enteros';
  const dias = Number(limpio);
  if (dias > MAX_DIAS_DE_PLAZO) return `Máximo ${MAX_DIAS_DE_PLAZO} días`;
  return undefined;
}

/** El tramo del DTO que sale de estos dos campos. Sin claves de más. */
export function terminosDeCobro(form: TerminosDeCobroForm): TerminosDeCobro {
  const limpio = form.diasDePlazo.trim();
  return {
    prorratearPrimerMes: form.prorratearPrimerMes === true,
    diasDePlazo: limpio === '' ? null : Number(limpio),
  };
}

/** Lo que el back devolvió → texto del input. `null`/ausente = vacío. */
export function diasDePlazoComoTexto(valor: number | null | undefined): string {
  return valor == null ? '' : String(valor);
}
