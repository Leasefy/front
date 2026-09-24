/**
 * La configuración de exógena de la inmobiliaria: lo puro (contrato del 19-09, §2).
 *
 * ── 🔴 Dos interruptores idénticos que NO valen lo mismo ───────────────────
 *
 * `girosAPropietariosEn1001` ya se decidió (Nico, 18-09: sólo en el 1647) y
 * `saldo2815En1009` todavía espera al contador. Dibujados iguales, quien los
 * mira supone que las dos son preguntas abiertas y prende la que no debía.
 * `estadoDelInterruptor` los separa, y el texto de cada uno sale de la
 * respuesta del back (`decididoPorNico` / `esperaAlContador`) — nunca se
 * inventa acá.
 *
 * ── 🔴 El tope heredado no es cero ─────────────────────────────────────────
 *
 * `topeCuantiasMenoresCop` en `null` significa «hereda el del año que Leasefy
 * publicó», y el del año publicado en `null` significa «no se agrupa nada».
 * Ninguno de los dos es `$0`: un tope de cero agruparía todo bajo el NIT
 * 222222222 y escondería a cada tercero que había que declarar. Por eso
 * `topeVigente` devuelve el ORIGEN además del número, y la pantalla dice de
 * dónde sale el valor que está usando antes de dejar pisarlo.
 */

import type {
  CambiosDeConfiguracion,
  ConfiguracionDeExogena,
} from '@/lib/api/exogena.service';

export type OrigenDelTope = 'PROPIO' | 'PLATAFORMA' | 'NINGUNO';

export interface TopeVigente {
  /** `null` = no hay tope y NO se agrupa nada. Nunca es `0`. */
  valorCop: number | null;
  origen: OrigenDelTope;
}

/**
 * Qué tope rige hoy y de dónde sale. Espeja `ExogenaService.topeDeCuantias`:
 * el override propio gana, debajo está el del año PUBLICADO, y si no hay
 * ninguno no se agrupa nada.
 */
export function topeVigente(config: ConfiguracionDeExogena): TopeVigente {
  if (config.topeCuantiasMenoresCop !== null && config.topeCuantiasMenoresCop !== undefined) {
    return { valorCop: config.topeCuantiasMenoresCop, origen: 'PROPIO' };
  }
  const delAnio = config.delAnioDeLaPlataforma?.topeCuantiasMenoresCop ?? null;
  if (delAnio !== null) return { valorCop: delAnio, origen: 'PLATAFORMA' };
  return { valorCop: null, origen: 'NINGUNO' };
}

/**
 * La frase que acompaña al campo del tope: de dónde sale el número que rige.
 * `formatear` es el `formatCurrency` de la pantalla, para no meter pesos acá.
 */
export function fraseDelTope(
  config: ConfiguracionDeExogena,
  formatear: (n: number) => string,
): string {
  const vigente = topeVigente(config);
  const anio = config.delAnioDeLaPlataforma;
  if (vigente.origen === 'PROPIO') {
    return anio?.topeCuantiasMenoresCop != null
      ? `Rige el tuyo: ${formatear(vigente.valorCop!)}. Pisa el que Leasefy publicó para ${anio.anio} (${formatear(anio.topeCuantiasMenoresCop)}).`
      : `Rige el tuyo: ${formatear(vigente.valorCop!)}. Leasefy no publicó ningún tope para ese año.`;
  }
  if (vigente.origen === 'PLATAFORMA') {
    return `Rige el que Leasefy publicó para ${anio!.anio}: ${formatear(vigente.valorCop!)}. Deja el campo vacío para seguir heredándolo.`;
  }
  return 'No hay ningún tope: NO se agrupa nada en cuantías menores. Es lo correcto mientras la resolución del año no fije uno — agrupar con un tope inventado esconde terceros que había que declarar.';
}

export type EstadoDelInterruptor = 'DECIDIDO' | 'ESPERA_AL_CONTADOR' | 'SIN_NOTA';

export interface Interruptor {
  clave: string;
  estado: EstadoDelInterruptor;
  /** El texto del back, entero. `null` cuando no mandó ninguno. */
  explicacion: string | null;
}

/**
 * ¿Este interruptor ya se resolvió o todavía espera al contador?
 *
 * Sale de la respuesta y no de una lista escrita acá a propósito: el día que
 * el contador responda lo del 2815, el back mueve la clave de un objeto al
 * otro y la pantalla cambia sola. Una copia en el front se quedaría vieja
 * diciendo «pendiente» sobre algo ya decidido.
 */
export function estadoDelInterruptor(
  config: ConfiguracionDeExogena,
  clave: string,
): Interruptor {
  const decidido = config.decididoPorNico?.[clave];
  if (decidido) return { clave, estado: 'DECIDIDO', explicacion: decidido };
  const espera = config.esperaAlContador?.[clave];
  if (espera) return { clave, estado: 'ESPERA_AL_CONTADOR', explicacion: espera };
  return { clave, estado: 'SIN_NOTA', explicacion: null };
}

/** Lo que el formulario tiene en la mano. El tope va como TEXTO: vacío ≠ cero. */
export interface BorradorDeConfiguracion {
  girosAPropietariosEn1001: boolean;
  saldo2815En1009: boolean;
  /** `''` = sin override, o sea heredar. Nunca se convierte a `0`. */
  tope: string;
}

export function borradorDe(config: ConfiguracionDeExogena): BorradorDeConfiguracion {
  return {
    girosAPropietariosEn1001: config.girosAPropietariosEn1001,
    saldo2815En1009: config.saldo2815En1009,
    tope:
      config.topeCuantiasMenoresCop === null || config.topeCuantiasMenoresCop === undefined
        ? ''
        : String(config.topeCuantiasMenoresCop),
  };
}

/**
 * El tope escrito, en pesos. `null` = vacío, o sea heredar.
 * `'INVALIDO'` = escribieron algo que no es un entero positivo — el back lo
 * rechaza con 400, así que se frena acá.
 */
export function topeDelBorrador(tope: string): number | null | 'INVALIDO' {
  const limpio = tope.trim();
  if (limpio === '') return null;
  if (!/^\d+$/.test(limpio)) return 'INVALIDO';
  const n = Number(limpio);
  // `@Min(1)` en el DTO: cero no es «sin tope», es un 400.
  if (!Number.isSafeInteger(n) || n < 1) return 'INVALIDO';
  return n;
}

/** `null` = se puede guardar. */
export function problemaDeLaConfiguracion(borrador: BorradorDeConfiguracion): string | null {
  if (topeDelBorrador(borrador.tope) === 'INVALIDO') {
    return 'El tope va en pesos enteros y mayor que cero. Déjalo vacío para heredar el que Leasefy publicó para el año.';
  }
  return null;
}

export function hayCambios(
  config: ConfiguracionDeExogena,
  borrador: BorradorDeConfiguracion,
): boolean {
  const original = borradorDe(config);
  return (
    original.girosAPropietariosEn1001 !== borrador.girosAPropietariosEn1001 ||
    original.saldo2815En1009 !== borrador.saldo2815En1009 ||
    original.tope.trim() !== borrador.tope.trim()
  );
}

/**
 * El cuerpo del `PUT`, con la lista EXPLÍCITA del DTO y nada más.
 *
 * 🔴 `topeCuantiasMenoresCop` viaja como `null` cuando el campo está vacío: es
 * lo que borra el override. Omitirlo dejaría el que había, y quien vació el
 * campo creería que volvió a heredar.
 */
export function cuerpoDeConfiguracion(
  borrador: BorradorDeConfiguracion,
): CambiosDeConfiguracion {
  const tope = topeDelBorrador(borrador.tope);
  return {
    girosAPropietariosEn1001: borrador.girosAPropietariosEn1001,
    saldo2815En1009: borrador.saldo2815En1009,
    topeCuantiasMenoresCop: tope === 'INVALIDO' ? null : tope,
  };
}
