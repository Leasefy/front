/**
 * 🔴 La tasa de recaudo: la mide el BACK, como la eligió cada inmobiliaria, y la
 * pantalla sólo la pinta con su rótulo.
 *
 * ── Por qué existe este archivo ─────────────────────────────────────────────
 *
 * El 2026-09-16, para la misma agencia de QA, el Resumen del negocio decía
 * **2,2 %** y Cartera → Cobros emitidos **43,6 %**, las dos «tasa de recaudo».
 * Cada pantalla dividía por su lado —`tasaMedida(collectedRevenue,
 * expectedRevenue)` en una, `tasaMedida(totalCollected, totalExpected)` en otra,
 * y Recaudo dividía la caja del mes—. Nico: «eso lo pone cada negocio».
 *
 * Desde entonces:
 *
 *   · la inmobiliaria elige en Configuración: sobre lo CAUSADO (por defecto) o
 *     sobre lo EMITIDO en cobros;
 *   · el back la calcula en UN lugar (`dashboard/tasa-de-recaudo.ts`) y la manda
 *     con su base, sus dos cifras y `pct` (`null` = no hubo contra qué medir);
 *   · el front NO divide: `tasa-de-recaudo.guardian.test.ts` falla si una
 *     pantalla vuelve a sacar la tasa de sus propias cifras;
 *   · toda pantalla dice con qué fórmula se midió, con `claveDelRotulo`, para
 *     que nadie compare dos números distintos bajo el mismo nombre.
 */

import type { TranslationParams } from '@/lib/i18n/types';

export const BASES_DE_LA_TASA_DE_RECAUDO = ['CAUSADO', 'EMITIDO'] as const;
export type BaseDeLaTasaDeRecaudo = (typeof BASES_DE_LA_TASA_DE_RECAUDO)[number];

/** La que usa una inmobiliaria que no eligió: la definición del CEO. */
export const BASE_POR_DEFECTO: BaseDeLaTasaDeRecaudo = 'CAUSADO';

/** Una tasa de recaudo medida por el back, con la fórmula con que se midió. */
export interface TasaDeRecaudo {
  base: BaseDeLaTasaDeRecaudo;
  /** `true` = la inmobiliaria no eligió: se midió sobre lo causado. */
  porDefecto: boolean;
  /** El rótulo en español que manda el back. En pantalla va `claveDelRotulo`. */
  rotulo: string;
  definicion: string;
  /** Lo que entró: lo abonado a las cuotas, o lo pagado de los cobros. */
  numeradorCop: number;
  /** Contra qué se midió: lo causado, o lo emitido. */
  denominadorCop: number;
  /** 0–100. `null` = no hubo denominador: no se midió. */
  pct: number | null;
}

/** La medida sin cifras, como la describen las series y los informes. */
export type MedidaDeLaTasa = Omit<TasaDeRecaudo, 'numeradorCop' | 'denominadorCop' | 'pct'>;

/** `GET /inmobiliaria/dashboard/tasa-de-recaudo`. */
export interface ComoSeMideLaTasa {
  month: string;
  base: BaseDeLaTasaDeRecaudo;
  porDefecto: boolean;
  /** `false` = la base de datos todavía no puede guardar el ajuste. */
  disponible: boolean;
  /** Las dos medidas del mes con los números de la inmobiliaria. */
  opciones: TasaDeRecaudo[];
}

export function esBaseDeLaTasa(valor: unknown): valor is BaseDeLaTasaDeRecaudo {
  return typeof valor === 'string' && (BASES_DE_LA_TASA_DE_RECAUDO as readonly string[]).includes(valor);
}

/** El rótulo de la fórmula, traducido: «Recaudo sobre lo causado» / «Pagado de lo emitido». */
export function claveDelRotulo(base: BaseDeLaTasaDeRecaudo): string {
  return `inmobiliaria.tasaDeRecaudo.rotulo.${base}`;
}

/**
 * La frase con las dos cifras de la tasa: «$8,2 M abonados de $364,8 M causados».
 * Sin denominador, la frase que dice que no hubo contra qué medir.
 */
export function fraseDeLasCifras(
  tasa: TasaDeRecaudo,
  t: (clave: string, params?: TranslationParams) => string,
  formatCurrency: (valor: number) => string,
): string {
  if (tasa.pct === null) return t(`inmobiliaria.tasaDeRecaudo.sinMedir.${tasa.base}`);
  return t(`inmobiliaria.tasaDeRecaudo.cifras.${tasa.base}`, {
    numerador: formatCurrency(tasa.numeradorCop),
    denominador: formatCurrency(tasa.denominadorCop),
  });
}

/**
 * La tasa que mandó el back, o la de una respuesta de antes del 2026-09-16.
 *
 * Una respuesta vieja en caché no trae `tasaDeRecaudo`. Ese back medía SIEMPRE
 * sobre lo causado y lo mandaba en un campo numérico (`collectionRate`), con 0
 * cuando no había causado: se reconstruye con esos mismos números, sin dividir
 * nada acá.
 */
export function tasaOLaDeAntes(args: {
  tasaDeRecaudo?: TasaDeRecaudo | null;
  /** El número viejo (`collectionRate`), ya medido sobre lo causado por el back. */
  pctViejo: number;
  numeradorCop: number;
  denominadorCop: number;
}): TasaDeRecaudo {
  if (args.tasaDeRecaudo) return args.tasaDeRecaudo;
  return {
    base: 'CAUSADO',
    porDefecto: true,
    rotulo: 'Recaudo sobre lo causado',
    definicion: '',
    numeradorCop: args.numeradorCop,
    denominadorCop: args.denominadorCop,
    pct: args.denominadorCop > 0 ? args.pctViejo : null,
  };
}

/** La tasa del tablero (`/analytics/kpis`). */
export function tasaDelTablero(kpis: {
  tasaDeRecaudo?: TasaDeRecaudo | null;
  collectionRate: number;
  collectedRevenue: number;
  expectedRevenue: number;
}): TasaDeRecaudo {
  return tasaOLaDeAntes({
    tasaDeRecaudo: kpis.tasaDeRecaudo,
    pctViejo: kpis.collectionRate,
    numeradorCop: kpis.collectedRevenue,
    denominadorCop: kpis.expectedRevenue,
  });
}
