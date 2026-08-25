/**
 * Lo que `POST /properties` EXIGE, en un solo lugar.
 *
 * ── Por qué existe este archivo ──────────────────────────────────────────
 * Estas reglas vivían dentro del ÚLTIMO paso del asistente. O sea que la
 * revisión decía «Listo» y recién en el resumen aparecía «N inmuebles no se
 * pueden importar: les falta área, baños» — **en una pantalla donde no hay
 * nada que editar**. La persona llegaba al final y se encontraba con una pared.
 *
 * Ahora las mismas reglas se evalúan en la revisión, que es donde cada
 * inmueble se puede completar. El resumen sigue usándolas, pero ya sólo como
 * red de seguridad.
 *
 * Los mínimos salen del `CreatePropertyDto` del back (`create-property.dto.ts`).
 * Si allá cambian, se cambian acá y los dos pasos quedan al día juntos.
 */

import type { ImportProperty } from './importTypes';

/** Campos editables que pueden bloquear la creación. */
export type CampoRequerido =
  | 'propertyAddress'
  | 'monthlyRent'
  | 'bathrooms'
  | 'propertyArea';

export interface RequisitoFaltante {
  campo: CampoRequerido;
  /** Cómo se llama en pantalla. */
  etiqueta: string;
  /** Qué hay que poner, en términos de la regla real del back. */
  ayuda: string;
  /** Unidad para el input, cuando aplica. */
  sufijo?: string;
  tipo: 'texto' | 'numero';
}

export const MINIMO_CANON = 100_000;
export const MINIMO_AREA = 10;
export const MINIMO_BANOS = 1;

/**
 * Qué le falta a este inmueble para que el back lo acepte.
 *
 * ⚠️ Ninguno se puede inventar: el área de un inmueble es un dato, no una
 * suposición. Por eso esto NO rellena nada — sólo dice qué falta y con qué
 * regla, para que la persona lo complete.
 */
export function faltantesParaElBack(p: ImportProperty): RequisitoFaltante[] {
  const faltan: RequisitoFaltante[] = [];

  if (!p.propertyAddress?.trim()) {
    faltan.push({
      campo: 'propertyAddress',
      etiqueta: 'Dirección',
      ayuda: 'Sin dirección el inmueble no se puede crear.',
      tipo: 'texto',
    });
  }

  if (!p.monthlyRent || p.monthlyRent < MINIMO_CANON) {
    faltan.push({
      campo: 'monthlyRent',
      etiqueta: 'Canon mensual',
      ayuda: `Mínimo ${formatearPesos(MINIMO_CANON)}.`,
      sufijo: 'COP',
      tipo: 'numero',
    });
  }

  if (!p.bathrooms || p.bathrooms < MINIMO_BANOS) {
    faltan.push({
      campo: 'bathrooms',
      etiqueta: 'Baños',
      ayuda: `Mínimo ${MINIMO_BANOS}.`,
      tipo: 'numero',
    });
  }

  if (!p.propertyArea || p.propertyArea < MINIMO_AREA) {
    faltan.push({
      campo: 'propertyArea',
      etiqueta: 'Área',
      ayuda: `Mínimo ${MINIMO_AREA} m².`,
      sufijo: 'm²',
      tipo: 'numero',
    });
  }

  return faltan;
}

function formatearPesos(valor: number): string {
  return `$${valor.toLocaleString('es-CO')}`;
}

/**
 * Recalcula si el inmueble se puede crear, **sin tocar las sugerencias**.
 *
 * `analyzeProperties` no sirve para esto: reconstruye `suggestions` desde cero
 * y perdería lo que la persona ya aceptó o rechazó. Acá sólo se recalcula el
 * veredicto.
 *
 * `selected` sigue la misma regla que el análisis: lo que no se puede crear
 * queda deseleccionado, y al completarlo se vuelve a seleccionar solo.
 */
export function recalcularEstado(p: ImportProperty): ImportProperty {
  const faltan = faltantesParaElBack(p);
  const errorMessages = faltan.map((f) => `Falta ${f.etiqueta.toLowerCase()}. ${f.ayuda}`);
  const hasErrors = errorMessages.length > 0;

  return { ...p, hasErrors, errorMessages, selected: !hasErrors };
}

/**
 * Escribe un campo y devuelve el inmueble con su veredicto al día.
 * Los numéricos vacíos vuelven a `undefined` —no a cero— porque cero es un
 * dato y vacío es «no sé»: [[no saber no es estar bien]].
 */
export function escribirCampo(
  p: ImportProperty,
  campo: keyof ImportProperty,
  valorCrudo: string,
): ImportProperty {
  const numericos: (keyof ImportProperty)[] = [
    'monthlyRent',
    'adminFee',
    'commissionPercent',
    'propertyArea',
    'bedrooms',
    'bathrooms',
  ];

  let valor: string | number | undefined;
  if (numericos.includes(campo)) {
    const limpio = valorCrudo.replace(/[^\d]/g, '');
    valor = limpio === '' ? undefined : Number(limpio);
  } else {
    valor = valorCrudo;
  }

  return recalcularEstado({ ...p, [campo]: valor });
}
