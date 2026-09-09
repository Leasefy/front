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
/**
 * Los mínimos de `CreatePropertyDto` **cuando el dato viene**.
 *
 * Bajaron el 2026-09-09 junto con volverlos opcionales: el área mínima era 10
 * m² y los baños mínimos 1. Un depósito de 6 m² existe, y un lote con 0 baños
 * también; con esos pisos, quien tenía el dato real tenía que falsearlo para
 * poder cargarlo. Lo que sigue sin entrar es un área en 0 — eso saldría en el
 * catálogo afirmando que el inmueble no mide nada.
 */
export const MINIMO_AREA = 1;
export const MINIMO_BANOS = 0;
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
 * Cómo se llama, qué pide y cómo se escribe cada campo que puede bloquear la
 * creación. Vive aparte de `faltantesParaElBack` porque la revisión necesita
 * describir un campo **también cuando ya está completo**: el input que la
 * persona está escribiendo no puede desaparecer con la primera letra
 * (Nico, 2026-09-02: «pone una letra y de una lo quita»).
 */
export const REQUISITOS: Record<CampoRequerido, Omit<RequisitoFaltante, 'campo'>> = {
  propertyAddress: {
    etiqueta: 'Dirección',
    ayuda: 'Sin dirección el inmueble no se puede crear.',
    tipo: 'texto',
  },
  // Editable, ya no obligatorio (2026-09-09). El texto lo dice: pedirlo sin
  // decir que se puede dejar vacío es cómo alguien inventa un barrio.
  propertyZone: {
    etiqueta: 'Barrio',
    ayuda: 'Opcional. Si el archivo no lo trae, se deja en blanco.',
    tipo: 'texto',
  },
  salePrice: {
    etiqueta: 'Precio de venta',
    ayuda: `Mínimo ${formatearPesos(MINIMO_VENTA)}.`,
    sufijo: 'COP',
    tipo: 'numero',
  },
  monthlyRent: {
    etiqueta: 'Canon mensual',
    ayuda: `Mínimo ${formatearPesos(MINIMO_CANON)}.`,
    sufijo: 'COP',
    tipo: 'numero',
  },
  bathrooms: {
    etiqueta: 'Baños',
    ayuda: 'Opcional. Déjalo vacío si no lo sabes.',
    tipo: 'numero',
  },
  propertyArea: {
    etiqueta: 'Área',
    ayuda: 'Opcional. Déjala vacía si no la sabes.',
    sufijo: 'm²',
    tipo: 'numero',
  },
};

export function requisitoDe(campo: CampoRequerido): RequisitoFaltante {
  return { campo, ...REQUISITOS[campo] };
}

/**
 * Qué le falta a este inmueble para que el back lo acepte.
 *
 * ⚠️ Ninguno se puede inventar: el área de un inmueble es un dato, no una
 * suposición. Por eso esto NO rellena nada — sólo dice qué falta y con qué
 * regla, para que la persona lo complete.
 *
 * 🔴 Desde el 2026-09-09 la lista es más corta: barrio, baños y área salieron.
 * Siguen siendo editables (`REQUISITOS` los describe y el formulario los
 * ofrece), pero no impiden crear el inmueble. Lo que queda acá es lo que el
 * back de verdad rechaza.
 */
export function faltantesParaElBack(p: ImportProperty): RequisitoFaltante[] {
  const faltan: CampoRequerido[] = [];

  if (!p.propertyAddress?.trim()) faltan.push('propertyAddress');

  /*
   * 🔴 El BARRIO ya no frena (2026-09-09). `Property.neighborhood` dejó de ser
   * NOT NULL en la base y `CreatePropertyDto` lo acepta ausente. Además el
   * back nunca lo pidió en su propia importación masiva: `revisar()` decía,
   * desde el 2026-09-07, «frenar un inmueble por el barrio es una opinión, no
   * un requisito». Acá se pedía igual, así que las dos listas decían cosas
   * distintas sobre el mismo archivo.
   */

  // T-0038 §3.2.4 — a SALE row needs salePrice, never monthlyRent (the CHECK
  // constraint requires exactly one of the two per listingType). Mirrors
  // ImportWizard.isStepValid / StepColumnMapping's monthlyRent<->salePrice
  // alternative at the column-mapping gate, applied per-row here.
  if (resolveImportListingType(p.listingType) === 'sale') {
    if (!p.salePrice || p.salePrice < MINIMO_VENTA) faltan.push('salePrice');
  } else if (!p.monthlyRent || p.monthlyRent < MINIMO_CANON) {
    faltan.push('monthlyRent');
  }

  /*
   * 🔴 Los BAÑOS y el ÁREA tampoco frenan (Nico, 2026-09-09, con el archivo
   * real de una inmobiliaria en pantalla: «nosotros tenemos cosas obligatorias
   * que las inmobiliarias tienen como opciones —el área, los baños— y ellos
   * muchas veces no traen esto»).
   *
   * Las tres columnas son nullables desde
   * `20260909180000_inmueble_datos_que_pueden_faltar`, así que ausente se
   * guarda NULL —que es lo que sabemos— en vez de obligar a inventar un número
   * para poder seguir. Antes el asistente mandaba `?? 0` y el back lo
   * rechazaba por el mínimo; ahora la clave simplemente no viaja.
   *
   * Lo que SÍ sigue frenando es un valor presente y absurdo: eso se revisa en
   * `avisosDeValor`, que advierte sin bloquear, porque un 0 tecleado es un
   * error de la celda y no una decisión.
   */

  return faltan.map(requisitoDe);
}

/**
 * Un valor que SÍ vino, pero que el back va a rechazar.
 *
 * 🔴 Avisa, no bloquea, y la diferencia importa. Que un campo sea opcional
 * significa «puedes dejarlo vacío», no «lo que escribas da igual»: un área en
 * 0 tecleada por error saldría en el catálogo afirmando que el inmueble no
 * mide nada. Pero tampoco puede frenar la fila —ya está el dato, sólo está
 * mal— así que se muestra y la persona decide: lo corrige o lo borra.
 *
 * Vacío nunca avisa. Ése es el caso normal desde hoy.
 */
export function avisosDeValor(p: ImportProperty): string[] {
  const avisos: string[] = [];

  if (p.propertyArea != null && p.propertyArea < MINIMO_AREA) {
    avisos.push(
      `El área dice ${p.propertyArea} m². Corrígela o déjala vacía: así queda como «no la sabemos».`,
    );
  }
  if (p.bathrooms != null && p.bathrooms < MINIMO_BANOS) {
    avisos.push(
      `Los baños dicen ${p.bathrooms}. Corrígelos o déjalos vacíos.`,
    );
  }
  if (p.bedrooms != null && p.bedrooms < 0) {
    avisos.push(
      `Las habitaciones dicen ${p.bedrooms}. Corrígelas o déjalas vacías.`,
    );
  }

  return avisos;
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
