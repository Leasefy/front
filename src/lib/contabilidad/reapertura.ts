/**
 * Reabrir un mes cerrado: lo puro (contrato congelado del 19-09, §1).
 *
 * ── 🔴 `hasta` significa lo contrario de lo que parece ─────────────────────
 *
 * En el cierre, `hasta` es el último día que queda CERRADO. En la reapertura,
 * `hasta` es el primer día que se vuelve a poder ESCRIBIR — y la frontera
 * queda en el día anterior. Con la contabilidad cerrada al 31-dic, «reabrir
 * diciembre» es `2025-12-01` y deja la frontera en el 30-nov.
 *
 * Es el mismo nombre de campo con el sentido invertido, en dos botones que
 * viven en la misma tarjeta. Por eso este archivo existe: la pantalla no
 * puede limitarse a mandar la fecha, tiene que poder decir en palabras QUÉ
 * frontera va a quedar **antes** de que alguien confirme. `fronteraQueQueda`
 * y `frasesDeLaReapertura` son eso, y se prueban solas.
 *
 * ── Lo que NO pasa al reabrir, y hay que decirlo ───────────────────────────
 *
 * Se mueve la frontera; los asientos que ya estaban marcados `cerrado` NO se
 * desmarcan, y corregir sigue siendo por reversa. El back lo manda en `aviso`
 * y la pantalla lo muestra tal cual: es la mitad de la operación que nadie
 * espera, y suponerla al revés termina en alguien editando un asiento viejo.
 *
 * ── Los espejos del back, para que el botón no invite a un 400 ─────────────
 *
 * `problemaDeReapertura` repite las tres validaciones de
 * `reapertura.service.ts` (motivo de al menos 3 letras, algo que reabrir, y
 * que la fecha mueva la frontera HACIA ATRÁS). Nunca al revés: acá sólo se
 * DESHABILITA. El back sigue siendo la autoridad y su 409 se muestra en
 * palabras si igual llega.
 */

import { aTextoDeDia, diaDe, diaLegible } from './fechas';

export const LARGO_MINIMO_DEL_MOTIVO = 3;

/**
 * La frontera que queda si se reabre desde `hasta`: el día ANTERIOR.
 * `null` (o un texto que no es un día) = se reabre todo y no queda ninguna
 * fecha cerrada.
 */
export function fronteraQueQueda(hasta: string | null | undefined): string | null {
  const dia = diaDe(hasta);
  if (!dia) return null;
  const [y, m, d] = dia.split('-').map(Number);
  // Día `d - 1` del mismo mes: el constructor normaliza el 0 al último día del
  // mes anterior, y el 0 de enero al 31 de diciembre del año anterior.
  return aTextoDeDia(new Date(y, m - 1, d - 1));
}

/**
 * El primer día del mes en el que cae `dia`. Es el valor con el que arranca el
 * formulario: con la contabilidad cerrada al 31-dic propone `2025-12-01`, o
 * sea «reabrir diciembre», que es lo que alguien quiere decir nueve de cada
 * diez veces.
 */
export function primerDiaDelMesDe(dia: string | null | undefined): string {
  const valido = diaDe(dia);
  if (!valido) return '';
  return `${valido.slice(0, 7)}-01`;
}

export interface ProblemaDeReapertura {
  /** `null` = se puede pedir. */
  motivo: string | null;
}

/**
 * ¿Se puede pedir esta reapertura? Espeja `ReaperturaContableService.reabrir`.
 *
 * `hasta` vacío es válido a propósito: significa «reabrir todo», que el back
 * acepta (`hasta` es `@IsOptional()`).
 */
export function problemaDeReapertura(entrada: {
  cerradaHasta: string | null;
  hasta: string;
  motivo: string;
}): string | null {
  const cerrada = diaDe(entrada.cerradaHasta);
  if (!cerrada) {
    return 'La contabilidad no tiene ninguna fecha cerrada: no hay nada que reabrir.';
  }
  if (entrada.motivo.trim().length < LARGO_MINIMO_DEL_MOTIVO) {
    return 'Escribí el motivo: queda en la bitácora y es lo que hace que un cierre se pueda deshacer sin perder el rastro.';
  }
  if (entrada.hasta !== '') {
    const pedida = diaDe(entrada.hasta);
    if (!pedida) return 'Elegí un día, o dejá la fecha vacía para reabrir todo.';
    /*
     * La frontera nueva es `pedida - 1 día`, así que sólo se mueve hacia atrás
     * cuando `pedida` es igual o anterior a la frontera vigente. Una fecha
     * posterior es el 409 `NO_ES_UNA_REAPERTURA` del back: para cerrar MÁS se
     * usa el cierre.
     */
    if (pedida > cerrada) {
      return `La contabilidad está cerrada hasta el ${diaLegible(cerrada)}: reabrir desde el ${diaLegible(pedida)} no mueve nada hacia atrás. Para cerrar más se usa el cierre, no la reapertura.`;
    }
  }
  return null;
}

export interface FrasesDeLaReapertura {
  /** «Podés volver a escribir desde el 1 dic 2025». */
  desde: string;
  /** 🔴 La que importa: qué queda cerrado DESPUÉS. */
  resultado: string;
  /** `true` cuando no va a quedar ninguna fecha cerrada. */
  reabreTodo: boolean;
}

/**
 * Lo que el diálogo dice ANTES de confirmar.
 *
 * 🔴 `resultado` es la frase entera —«la contabilidad quedará cerrada hasta el
 * 30 de noviembre»— y no un número suelto: es exactamente donde la gente se
 * equivoca, porque la fecha que escribió (1 de diciembre) no es la que va a
 * quedar.
 */
export function frasesDeLaReapertura(
  hasta: string,
  cerradaHasta: string | null,
): FrasesDeLaReapertura {
  const cerrada = diaDe(cerradaHasta);
  if (hasta === '' || !diaDe(hasta)) {
    return {
      desde: cerrada
        ? `Hoy no se puede escribir nada con fecha igual o anterior al ${diaLegible(cerrada)}.`
        : 'La contabilidad no tiene ninguna fecha cerrada.',
      resultado:
        'Se reabre TODO: la contabilidad no va a quedar cerrada en ninguna fecha, y cualquier día vuelve a admitir asientos.',
      reabreTodo: true,
    };
  }
  const frontera = fronteraQueQueda(hasta);
  return {
    desde: `Vas a poder volver a escribir desde el ${diaLegible(hasta)}.`,
    resultado: frontera
      ? `La contabilidad quedará cerrada hasta el ${diaLegible(frontera)} — no hasta el ${diaLegible(hasta)}.`
      : 'Se reabre TODO: no va a quedar ninguna fecha cerrada.',
    reabreTodo: frontera === null,
  };
}

/** Una línea de la bitácora, ya legible. */
export interface LineaDeBitacora {
  cuando: string;
  /** «del 31 dic 2025 al 30 nov 2025», o «al principio de todo». */
  movimiento: string;
}

/**
 * De qué fecha a qué fecha se movió la frontera, en palabras.
 *
 * 🔴 `fronteraNueva: null` NO se pinta como un cero ni como un guion: significa
 * que no quedó ninguna fecha cerrada, que es el caso más grave de la lista.
 */
export function movimientoDeLaFrontera(
  fronteraAnterior: string | null,
  fronteraNueva: string | null,
): string {
  const antes = diaDe(fronteraAnterior);
  const despues = diaDe(fronteraNueva);
  const desde = antes ? diaLegible(antes) : 'sin fecha cerrada';
  if (!despues) return `de ${desde} a sin ninguna fecha cerrada`;
  return `de ${desde} a ${diaLegible(despues)}`;
}
