/**
 * Cómo ESCRIBE la plata el front: P8 a de «centavos en todo» (C3-FRONT,
 * 03-10-2026). Nico eligió:
 *
 *   · **En pantalla**, los centavos SÓLO si el valor los tiene:
 *     `2500000` → «$ 2.500.000» (exactamente lo de siempre) y
 *     `1234567.29` → «$ 1.234.567,29» («que no se redondee, se trae tal
 *     cual»). 🔴 Y sólo cuando la plataforma ya escribe centavos (alguna área
 *     prendida en `GET /config/plata`): con TODAS las llaves apagadas cada
 *     pantalla muestra EXACTAMENTE lo de hoy, también una cifra con fracción
 *     que calcula el front o que llega de un texto (se redondea como siempre;
 *     regla de Nico «no dañar lo que ya estaba»).
 *   · **En un documento** (estado de cuenta, extracto, liquidación), con la
 *     llave de su área prendida, SIEMPRE dos decimales («$ 2.500.000,00»);
 *     con la llave apagada, al peso como siempre — así, apagado, ningún
 *     documento cambia ni una letra. Es la misma regla de los documentos del
 *     back (`escribirPlata`, `pesos(…, { conCentavos })`).
 *
 * Los formatos de cada pantalla se quedan con SU forma (con o sin espacio
 * después del «$», `Intl` con `currency` o a mano): esto sólo decide cuántos
 * decimales. Con un valor entero, las opciones son EXACTAMENTE las de hoy.
 *
 * Sólo del front (`formato.ts`, en cambio, es igual en los tres repos).
 */

import { hayPlataConCentavos } from './con-centavos';
import { aCentavos } from './plata';

/** ¿El valor tiene centavos (al centavo: `1234.004` no los tiene)? */
export function tieneCentavos(valor: unknown): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return false;
  return aCentavos(valor) % 100 !== 0;
}

/**
 * ¿Una PANTALLA muestra los centavos de este valor? Si los tiene y la
 * plataforma ya escribe centavos (alguna llave prendida). Apagadas todas, no:
 * la cifra sale como hoy.
 */
export function seMuestranLosCentavos(valor: unknown): boolean {
  return tieneCentavos(valor) && hayPlataConCentavos();
}

export interface DecimalesDeLaPlata {
  minimumFractionDigits: 0 | 2;
  maximumFractionDigits: 0 | 2;
}

const SIN_DECIMALES: DecimalesDeLaPlata = Object.freeze({
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const CON_DOS_DECIMALES: DecimalesDeLaPlata = Object.freeze({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Las opciones de `toLocaleString`/`Intl.NumberFormat` para una plata EN
 * PANTALLA: con centavos, dos decimales; sin ellos, ninguno (lo de hoy).
 */
export function decimalesEnPantalla(valor: unknown): DecimalesDeLaPlata {
  return seMuestranLosCentavos(valor) ? CON_DOS_DECIMALES : SIN_DECIMALES;
}

/** Las mismas opciones para un DOCUMENTO: con la llave, siempre dos. */
export function decimalesEnDocumento(valor: unknown, conCentavos: boolean): DecimalesDeLaPlata {
  return conCentavos ? CON_DOS_DECIMALES : decimalesEnPantalla(valor);
}

/** Un formato de plata: lo único que se le pide es `format`. */
export interface FormatoDePlata {
  format(valor: number): string;
}

/**
 * Reemplazo de un `new Intl.NumberFormat(locale, { …, maximumFractionDigits: 0 })`
 * de plata en una pantalla. Sin centavos que mostrar (un entero, o todas las
 * llaves apagadas) usa EXACTAMENTE las opciones que recibe: el texto no cambia
 * ni un espacio; con centavos, las mismas con dos decimales.
 *
 *   const COP = plataEnPantalla('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
 *   COP.format(2500000)    // «$ 2.500.000», como antes
 *   COP.format(1234567.29) // «$ 1.234.567,29»
 */
export function plataEnPantalla(locale: string, opcionesDeHoy: Intl.NumberFormatOptions): FormatoDePlata {
  const sinCentavos = new Intl.NumberFormat(locale, opcionesDeHoy);
  const conCentavos = new Intl.NumberFormat(locale, { ...opcionesDeHoy, ...CON_DOS_DECIMALES });
  return {
    format: (valor: number) => (seMuestranLosCentavos(valor) ? conCentavos : sinCentavos).format(valor),
  };
}

/**
 * Lo mismo para un DOCUMENTO: con `conCentavos` (la llave del área del
 * documento), siempre dos decimales; sin ella, como en pantalla — que con la
 * plata entera de hoy es exactamente el formato de hoy.
 */
export function plataEnDocumento(
  locale: string,
  opcionesDeHoy: Intl.NumberFormatOptions,
  conCentavos: boolean,
): FormatoDePlata {
  if (!conCentavos) return plataEnPantalla(locale, opcionesDeHoy);
  const siempreDos = new Intl.NumberFormat(locale, { ...opcionesDeHoy, ...CON_DOS_DECIMALES });
  return { format: (valor: number) => siempreDos.format(valor) };
}
