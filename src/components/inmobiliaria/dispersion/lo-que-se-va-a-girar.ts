/**
 * Qué entra en la corrida del mes y cuánto suma — la cuenta de la pantalla de
 * una sola página.
 *
 * ── La regla que ordena este archivo ────────────────────────────────────────
 *
 * 🔴 **El navegador no liquida.** El canon y la comisión de lo seleccionado sí
 * son la suma de los renglones que manda el back, pero el NETO no: las
 * deducciones del propietario se aplican sobre la base que queda, así que
 * destildar un inmueble cambia el descuento, y esa regla vive en el back
 * (`conDeduccionesDelMes`). Por eso, cuando la selección se achica, los montos
 * los vuelve a pedir la pantalla (`POST /dispersiones/preview`) y hasta que
 * lleguen `exacto` es `false` — y con `exacto` en `false` el botón de confirmar
 * no se puede apretar. Nunca se confirma sobre un número que no vino del back.
 *
 * La selección se guarda por lo que QUEDÓ AFUERA y no por lo que entró, porque
 * el default es «todos marcados» (pedido del CEO) sobre 518 propietarios: un
 * conjunto vacío es «va todo el mes», que es exactamente lo que el back entiende
 * cuando no le mandan listas.
 */

import type { VistaPreviaDeDispersiones } from '@/lib/types/inmobiliaria';

export type PropietarioDeLaPrevia =
  VistaPreviaDeDispersiones['propietarios'][number];

export interface SeleccionDeLaLiquidacion {
  /** Propietarios destildados. Vacío = todos. */
  propietariosFuera: ReadonlySet<string>;
  /** Inmuebles destildados, de cualquier propietario. Vacío = todos. */
  inmueblesFuera: ReadonlySet<string>;
}

export const NADA_FUERA: SeleccionDeLaLiquidacion = {
  propietariosFuera: new Set(),
  inmueblesFuera: new Set(),
};

/**
 * Los renglones de un propietario que siguen dentro.
 *
 * Un renglón sin `propertyId` no se puede nombrar en la lista —una liquidación
 * vieja, los intereses de mora ya guardados— y por eso entra siempre: es la
 * única opción que no pierde plata en silencio. El back hace lo mismo.
 */
export function renglonesDentro(
  items: PropietarioDeLaPrevia['items'],
  inmueblesFuera: ReadonlySet<string>,
) {
  return items.filter((i) => !i.propertyId || !inmueblesFuera.has(i.propertyId));
}

/** Los inmuebles de un propietario, sin repetir y en el orden en que vienen. */
export function inmueblesDelPropietario(p: PropietarioDeLaPrevia) {
  const vistos = new Map<string, { propertyId: string; titulo: string }>();
  for (const i of p.items) {
    if (!i.propertyId || vistos.has(i.propertyId)) continue;
    vistos.set(i.propertyId, {
      propertyId: i.propertyId,
      titulo: i.propertyTitle,
    });
  }
  return [...vistos.values()];
}

/**
 * Un propietario entra en la corrida si no lo destildaron, si no tiene ya su
 * liquidación del mes y si le quedó al menos un inmueble. Lo último importa:
 * destildarle todos los inmuebles lo saca, y el back hace lo mismo — sin esto la
 * pantalla contaría una dispersión que no se va a crear.
 */
export function entraEnLaCorrida(
  p: PropietarioDeLaPrevia,
  seleccion: SeleccionDeLaLiquidacion,
): boolean {
  if (p.yaExiste) return false;
  if (seleccion.propietariosFuera.has(p.propietarioId)) return false;
  return renglonesDentro(p.items, seleccion.inmueblesFuera).length > 0;
}

/** Sin nada destildado, el mes entero: no hay que volver a pedir la cuenta. */
export function seleccionCompleta(seleccion: SeleccionDeLaLiquidacion): boolean {
  return (
    seleccion.propietariosFuera.size === 0 && seleccion.inmueblesFuera.size === 0
  );
}

/**
 * La huella de una selección, para saber si los montos que llegaron son de la
 * selección que hay AHORA en pantalla. Sin esto, destildar dos veces rápido
 * dejaría en la barra el total de la selección anterior.
 */
export function huellaDeLaSeleccion(seleccion: SeleccionDeLaLiquidacion): string {
  const orden = (s: ReadonlySet<string>) => [...s].sort().join(',');
  return `${orden(seleccion.propietariosFuera)}|${orden(seleccion.inmueblesFuera)}`;
}

/** Lo que hay que mandarle al back para generar (o para pedir la cuenta). */
export function loQueViajaAlBack(
  previa: VistaPreviaDeDispersiones,
  seleccion: SeleccionDeLaLiquidacion,
): { propietarioIds?: string[]; propertyIds?: string[] } {
  const dentro = previa.propietarios.filter((p) => entraEnLaCorrida(p, seleccion));
  return {
    // Sin nada destildado no se manda lista: el back liquida el mes entero, que
    // es lo que hacen las otras pantallas.
    ...(seleccion.propietariosFuera.size > 0 ||
    seleccion.inmueblesFuera.size > 0
      ? { propietarioIds: dentro.map((p) => p.propietarioId) }
      : {}),
    ...(seleccion.inmueblesFuera.size > 0
      ? {
          propertyIds: [
            ...new Set(
              dentro.flatMap((p) =>
                renglonesDentro(p.items, seleccion.inmueblesFuera)
                  .map((i) => i.propertyId)
                  .filter((x): x is string => Boolean(x)),
              ),
            ),
          ],
        }
      : {}),
  };
}

export interface ElTotalDeLaCorrida {
  propietarios: number;
  canonCop: number;
  comisionesCop: number;
  /** Lo que sale del banco: cada propietario entero o nada. */
  aGirarCop: number;
  /**
   * `true` = estos montos los calculó el back para ESTA selección. `false` =
   * son la suma de los renglones mientras la cuenta del back viene en camino, y
   * el neto puede cambiar por deducciones: no se puede confirmar así.
   */
  exacto: boolean;
}

/**
 * Los montos de la corrida.
 *
 * Con la selección completa alcanza la previa del mes, que ya vino del back.
 * Con una selección más chica manda `ajustada` —la previa de ESA selección— y,
 * mientras no haya llegado, se suman los renglones seleccionados y se avisa que
 * no es exacto.
 */
export function elTotalDeLaCorrida({
  previa,
  ajustada,
  seleccion,
}: {
  previa: VistaPreviaDeDispersiones;
  /** La previa de la selección, si ya llegó y es de ESTA selección. */
  ajustada: VistaPreviaDeDispersiones | null;
  seleccion: SeleccionDeLaLiquidacion;
}): ElTotalDeLaCorrida {
  const delBack = seleccionCompleta(seleccion) ? previa : ajustada;
  if (delBack) {
    const porGenerar = delBack.propietarios.filter((p) => !p.yaExiste);
    return {
      propietarios: porGenerar.length,
      canonCop: porGenerar.reduce((s, p) => s + p.totalCollected, 0),
      comisionesCop: delBack.totalComisiones,
      aGirarCop: delBack.totalAGirar,
      exacto: true,
    };
  }

  const dentro = previa.propietarios.filter((p) => entraEnLaCorrida(p, seleccion));
  const renglones = dentro.flatMap((p) =>
    renglonesDentro(p.items, seleccion.inmueblesFuera),
  );
  return {
    propietarios: dentro.length,
    canonCop: renglones.reduce((s, i) => s + i.rentCollected, 0),
    comisionesCop: renglones.reduce((s, i) => s + i.commissionAmount, 0),
    aGirarCop: renglones.reduce((s, i) => s + i.netAmount, 0),
    exacto: false,
  };
}

/**
 * Los montos de UN propietario con la selección de ahora.
 *
 * Igual que arriba: si el back ya contó esta selección, sus números; si no, la
 * suma de los renglones que quedaron. El del propietario se puede sumar acá con
 * la selección completa porque el back hace exactamente eso
 * (`netToPropietario = items.reduce(netAmount)`) — lo que NO se puede sumar es
 * el neto después de deducciones, y para eso está `exacto`.
 */
export function elTotalDelPropietario({
  p,
  ajustada,
  seleccion,
}: {
  p: PropietarioDeLaPrevia;
  ajustada: VistaPreviaDeDispersiones | null;
  seleccion: SeleccionDeLaLiquidacion;
}): { canonCop: number; comisionCop: number; netoCop: number; exacto: boolean } {
  const delBack = ajustada?.propietarios.find(
    (x) => x.propietarioId === p.propietarioId,
  );
  const sinTocar =
    seleccionCompleta(seleccion) ||
    renglonesDentro(p.items, seleccion.inmueblesFuera).length === p.items.length;

  if (delBack) {
    return {
      canonCop: delBack.totalCollected,
      comisionCop: delBack.totalCommission,
      netoCop: delBack.netToPropietario,
      exacto: true,
    };
  }
  if (sinTocar) {
    return {
      canonCop: p.totalCollected,
      comisionCop: p.totalCommission,
      netoCop: p.netToPropietario,
      exacto: true,
    };
  }
  const renglones = renglonesDentro(p.items, seleccion.inmueblesFuera);
  return {
    canonCop: renglones.reduce((s, i) => s + i.rentCollected, 0),
    comisionCop: renglones.reduce((s, i) => s + i.commissionAmount, 0),
    netoCop: renglones.reduce((s, i) => s + i.netAmount, 0),
    exacto: false,
  };
}
