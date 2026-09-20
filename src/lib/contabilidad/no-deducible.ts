/**
 * «No deducible» en la cuenta del PUC: lo puro (contrato del 19-09, §3).
 *
 * Nico: «todo deducible **salvo lo marcado**». Lo marcado va a la columna
 * «Pago o abono no deducible» del formato 1001 de la exógena; se marca una vez
 * en la cuenta y sirve para todos los años, que es donde el contador lo sabe.
 *
 * ── 🔴 Tres estados, no dos ───────────────────────────────────────────────
 *
 * `noDeducible` llega como `true`, como `null` o SIN VENIR. Los tres significan
 * cosas distintas y sólo dos se parecen:
 *
 *   · `true`      → marcada: su gasto no se deduce.
 *   · `null`      → la columna existe y esta cuenta no está marcada.
 *   · `undefined` → la base NO tiene la columna (migración 70 sin aplicar; el
 *                   back la omite en toda lectura del PUC).
 *
 * La diferencia entre los dos últimos es la que evita un 503 tonto: si el
 * formulario mandara `noDeducible: false` en una base sin la columna, el back
 * respondería 503 `NO_DEDUCIBLE_SIN_MIGRAR` y se perdería la edición ENTERA de
 * la cuenta —el nombre, la naturaleza, el activa— por un campo que nadie tocó.
 * Por eso `soportaNoDeducible` decide si la clave viaja, y no un `?? false`.
 */

import type { CambiosDeCuenta, CuentaPuc } from '@/lib/api/contabilidad.service';

/**
 * ¿Esta base tiene la columna? Se sabe porque el back la OMITE cuando falta:
 * la clave no viene en el JSON.
 */
export function soportaNoDeducible(cuenta: Pick<CuentaPuc, 'noDeducible'> | null): boolean {
  return cuenta !== null && cuenta.noDeducible !== undefined;
}

/** ¿Está marcada? `null` y `undefined` son «no», y ninguno se pinta distinto. */
export function estaMarcadaNoDeducible(
  cuenta: Pick<CuentaPuc, 'noDeducible'> | null | undefined,
): boolean {
  return cuenta?.noDeducible === true;
}

export interface EdicionDeCuenta {
  nombre: string;
  naturaleza: CuentaPuc['naturaleza'];
  imputable: boolean;
  activa: boolean;
  noDeducible: boolean;
}

/**
 * El cuerpo del `PATCH /puc/:id`.
 *
 * 🔴 `noDeducible` viaja SÓLO si la base tiene la columna. Sin ella, mandarlo
 * —aunque sea en `false`— es un 503 que tumba la edición completa.
 */
export function cambiosDeLaCuenta(
  edicion: EdicionDeCuenta,
  soporta: boolean,
): CambiosDeCuenta {
  return {
    nombre: edicion.nombre.trim(),
    naturaleza: edicion.naturaleza,
    imputable: edicion.imputable,
    activa: edicion.activa,
    ...(soporta ? { noDeducible: edicion.noDeducible } : {}),
  };
}

/**
 * Qué decir al lado de la casilla. Sin la columna no se promete nada: se dice
 * que falta la migración y que mientras tanto TODO el gasto se declara
 * deducible, que es el valor por defecto que decidió Nico.
 */
export function frasesDeLoNoDeducible(soporta: boolean): {
  titulo: string;
  explicacion: string;
} {
  return soporta
    ? {
        titulo: 'No deducible',
        explicacion:
          'El gasto de esta cuenta va a la columna «Pago o abono no deducible» del formato 1001. Se marca una vez y sirve para todos los años.',
      }
    : {
        titulo: 'No deducible',
        explicacion:
          'Todavía no se puede marcar: falta la migración que crea la columna, y la aplica Víctor. Mientras tanto todo el gasto se declara deducible en el 1001, que es el valor por defecto.',
      };
}
