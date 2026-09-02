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
import { cleanNumericValue } from './valorNumerico';

/** Campos editables que pueden bloquear la creación. */
export type CampoRequerido =
  | 'propertyAddress'
  | 'propertyZone'
  | 'monthlyRent'
  | 'salePrice'
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
/** contract.md T-0038 §3.2.3 — mirrors CreatePropertyDto's `@Min(1_000_000)` on `salePrice`. */
export const MINIMO_VENTA = 1_000_000;

/**
 * T-0038 §3.2.2/C13 — `ImportProperty.listingType` is raw free text as read
 * from the file ("Arriendo", "Venta", "For sale"...), not yet the wire's
 * RENT/SALE. This is the import-review step's OWN heuristic, deliberately
 * lenient (CSV text varies a lot) — it only decides which price field this
 * row's completeness check applies to. The actual wire validation, and the
 * throw-on-unrecognised rule (C19), happen at `POST /properties`
 * (`resolveListingType` in `properties.mapper.ts`), not here.
 */
export function resolveImportListingType(raw: string | undefined): 'rent' | 'sale' {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized.includes('venta') || normalized.includes('sale')) return 'sale';
  return 'rent';
}

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

  // El barrio lo exige la activación en el back (`revisar()` →
  // `faltantes: ['barrio']`) igual que lo exige el asistente de consignación.
  // Faltaba ACÁ: la revisión decía «3 listos» y el back devolvía uno
  // pendiente por barrio — dos listas que dicen lo mismo terminan diciendo
  // cosas distintas (2026-09-01, tres enlaces reales de Fincaraíz).
  if (!p.propertyZone?.trim()) {
    faltan.push({
      campo: 'propertyZone',
      etiqueta: 'Barrio',
      ayuda: 'El barrio o sector del inmueble.',
      tipo: 'texto',
    });
  }

  // T-0038 §3.2.4 — a SALE row needs salePrice, never monthlyRent (the CHECK
  // constraint requires exactly one of the two per listingType). Mirrors
  // ImportWizard.isStepValid / StepColumnMapping's monthlyRent<->salePrice
  // alternative at the column-mapping gate, applied per-row here.
  if (resolveImportListingType(p.listingType) === 'sale') {
    if (!p.salePrice || p.salePrice < MINIMO_VENTA) {
      faltan.push({
        campo: 'salePrice',
        etiqueta: 'Precio de venta',
        ayuda: `Mínimo ${formatearPesos(MINIMO_VENTA)}.`,
        sufijo: 'COP',
        tipo: 'numero',
      });
    }
  } else if (!p.monthlyRent || p.monthlyRent < MINIMO_CANON) {
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
    'salePrice',
    'adminFee',
    'commissionPercent',
    'propertyArea',
    'bedrooms',
    'bathrooms',
  ];

  let valor: string | number | undefined;
  if (numericos.includes(campo)) {
    // El MISMO limpiador que las celdas del archivo: «65,5» tipeado a mano es
    // 65,5 — el viejo strip de no-dígitos lo volvía 655.
    valor = cleanNumericValue(valorCrudo);
  } else {
    valor = valorCrudo;
  }

  const actualizado: ImportProperty = { ...p, [campo]: valor };
  // Si la persona corrige la dirección a mano, ya no es una aproximación:
  // dejarla marcada después de que alguien la arregló sería mentir sobre el
  // dato que hay ahora.
  if (campo === 'propertyAddress') actualizado.direccionAproximada = false;

  return recalcularEstado(actualizado);
}
