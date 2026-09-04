/**
 * valorNumerico — el limpiador numérico de la importación, en un módulo propio.
 *
 * Lo usan `gapFiller.ts` (celdas del archivo) y `requisitosDelBack.ts` (los
 * inputs de reparación de la revisión): la misma celda tiene que valer lo
 * mismo venga del Excel o tipeada a mano. Vive aparte porque gapFiller ya
 * importa de requisitosDelBack y al revés sería un ciclo.
 */
export function cleanNumericValue(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;

  const str = String(value).trim();

  // Prefijos y sufijos de texto (aprox, ~, COP, $, unidades, %). El símbolo
  // va afuera del número; el número tiene que quedar solo.
  let cleaned = str
    .replace(/^(aprox\.?\s*|~\s*|cerca\s*de\s*|approx\.?\s*|cop\s+)/i, '')
    .replace(/\s*(COP|cop|pesos|m2|mts2?|m²|%)\s*$/i, '')
    .replace(/[$\s\u00a0]/g, '')
    // Apóstrofo de miles («1'200.000»), recto o tipográfico: es un punto de miles.
    .replace(/['\u2019]/g, '.');

  // El signo se aparta ANTES de mirar los grupos de miles: «-45.000» son
  // -45.000 pesos, no -45.
  let negativo = false;
  if (cleaned.startsWith('-')) {
    negativo = true;
    cleaned = cleaned.slice(1);
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Colombiano: 1.800.000 — todos los puntos son miles.
    cleaned = cleaned.replace(/\./g, '');
  } else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(cleaned)) {
    // Colombiano con decimales: 1.800.000,50
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(cleaned)) {
    // US: 1,800,000.50
    cleaned = cleaned.replace(/,/g, '');
  } else if (/^\d+,\d{1,2}$/.test(cleaned)) {
    // Coma decimal sola («65,5», un área): NO son miles.
    cleaned = cleaned.replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  /*
   * 🔴 Entero o nada. `parseFloat` acepta prefijos: «$1.2M» daba 1.2 y
   * «120 millones» daba 120 — números INVENTADOS que entraban al inmueble sin
   * error. Si después de limpiar no queda un número completo, no hay número:
   * la celda queda vacía y la revisión lo muestra, que es lo honesto.
   */
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;

  const result = parseFloat(cleaned);
  if (isNaN(result)) return undefined;
  return negativo ? -result : result;
}
