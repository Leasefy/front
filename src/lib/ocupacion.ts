/**
 * 🔴 LA OCUPACIÓN DEL PORTAFOLIO — la copia del front de las dos reglas.
 *
 * El original vive en el back, en
 * `src/inmobiliaria/ocupacion/ocupacion-del-portafolio.ts`, con este mismo
 * comentario. Acá está porque hay pantallas que cuentan del lado del cliente
 * (el portafolio de inmuebles, por ejemplo) y porque el resumen rehace la tasa
 * con el numerador y el denominador que le manda el back, para distinguir un
 * 0 % medido de un «no se midió» (ver `tasas.ts`).
 *
 * Nico, 2026-09-12, con estas palabras:
 *
 *   «No me está relacionando bien los inmuebles arrendados porque tengo 741
 *    contratos activos pero me dice que solo tengo 674 inmuebles arrendados.
 *    Eso es un problema en el chat muy grande: no está yendo a la información
 *    correcta y tomando la información correcta. 58 inmuebles que migramos, no
 *    tuve en cuenta cuáles no están disponibles. Entonces él me está midiendo
 *    la ocupación de mi portafolio basado en los que tampoco están
 *    disponibles. No, esa tasa de ocupación se debe medir contra el inmueble
 *    disponible, no contra el no disponible, porque ya está fuera del
 *    catálogo.»
 *
 * Las dos reglas:
 *
 *   1. **Arrendados = inmuebles DISTINTOS con un contrato ACTIVE.** La fuente
 *      de verdad es el CONTRATO, no el estado del inmueble ni la
 *      disponibilidad del mandato. En la base de Nico, el 2026-09-12: 730
 *      contratos vigentes, 741 inmuebles marcados «arrendado» y 667 mandatos
 *      con disponibilidad «arrendado». Tres números para la misma pregunta.
 *
 *   2. **Tasa de ocupación = arrendados / inmuebles EN CATÁLOGO.** El
 *      denominador excluye lo que está fuera del catálogo, porque la
 *      inmobiliaria no lo puede arrendar.
 *
 * Y la regla de presentación que Nico pidió en la misma frase: el número dice
 * QUÉ cuenta. Nunca un porcentaje suelto — «730 arrendados de 880 en catálogo
 * · 1.944 fuera del catálogo».
 */

/** Los cinco estados de un inmueble, tal como los manda el back. */
export type EstadoDeInmueble =
  | 'DRAFT'
  | 'AVAILABLE'
  | 'RENTED'
  | 'PENDING'
  | 'RESERVED';

/**
 * 🔴 La MISMA lista que `ESTADOS_DE_INMUEBLE_FUERA_DEL_CATALOGO` del back.
 *
 * `DRAFT` es el único estado que significa «no publicado»: es a donde va el
 * «Inactiva» del archivo de inmuebles de la inmobiliaria. `PENDING` y
 * `RESERVED` son etapas de una negociación viva — siguen en el catálogo.
 */
export const ESTADOS_FUERA_DEL_CATALOGO: readonly EstadoDeInmueble[] =
  Object.freeze(['DRAFT']);

/** Un inmueble cuenta para la ocupación sólo si está en el catálogo. */
export function cuentaParaLaOcupacion(estado: EstadoDeInmueble): boolean {
  return !ESTADOS_FUERA_DEL_CATALOGO.includes(estado);
}

export interface InmuebleParaOcupacion {
  id: string;
  estado: EstadoDeInmueble;
  /** Si el inmueble tiene AL MENOS un contrato vigente. */
  arrendado: boolean;
}

export interface OcupacionDelPortafolio {
  arrendados: number;
  arrendadosEnCatalogo: number;
  enCatalogo: number;
  fueraDelCatalogo: number;
  disponibles: number;
  total: number;
  /** 0–100, o `null` cuando no hay catálogo que medir (ver `tasas.ts`). */
  tasa: number | null;
  arrendadosFueraDelCatalogo: number;
}

/**
 * La cuenta. El numerador se acota al catálogo para que la tasa nunca pase de
 * 100 %; lo que queda arrendado fuera del catálogo se reporta aparte, que es
 * justo el caso que Nico encontró.
 */
export function ocupacionDelPortafolio(
  inmuebles: readonly InmuebleParaOcupacion[],
): OcupacionDelPortafolio {
  // Por `id`: la lista puede traer el mismo inmueble dos veces (dos contratos
  // vigentes) y eso es UN inmueble arrendado, no dos.
  const unicos = new Map<string, InmuebleParaOcupacion>();
  for (const inmueble of inmuebles) {
    const yaVisto = unicos.get(inmueble.id);
    if (!yaVisto || inmueble.arrendado) unicos.set(inmueble.id, inmueble);
  }

  let arrendados = 0;
  let arrendadosEnCatalogo = 0;
  let enCatalogo = 0;
  let fueraDelCatalogo = 0;

  for (const inmueble of unicos.values()) {
    const esDelCatalogo = cuentaParaLaOcupacion(inmueble.estado);
    if (esDelCatalogo) enCatalogo += 1;
    else fueraDelCatalogo += 1;
    if (inmueble.arrendado) {
      arrendados += 1;
      if (esDelCatalogo) arrendadosEnCatalogo += 1;
    }
  }

  return {
    arrendados,
    arrendadosEnCatalogo,
    enCatalogo,
    fueraDelCatalogo,
    disponibles: enCatalogo - arrendadosEnCatalogo,
    total: unicos.size,
    tasa: enCatalogo === 0 ? null : (arrendadosEnCatalogo / enCatalogo) * 100,
    arrendadosFueraDelCatalogo: arrendados - arrendadosEnCatalogo,
  };
}

/**
 * La frase que acompaña al porcentaje. Nunca un porcentaje solo: el número
 * tiene que decir contra qué se midió y qué quedó afuera.
 */
export function comoSeLeeLaOcupacion(datos: {
  arrendados: number;
  enCatalogo: number;
  fueraDelCatalogo?: number;
}): string {
  const miles = (n: number) => n.toLocaleString('es-CO');
  const partes = [
    `${miles(datos.arrendados)} arrendados de ${miles(datos.enCatalogo)} en catálogo`,
  ];
  if ((datos.fueraDelCatalogo ?? 0) > 0) {
    partes.push(`${miles(datos.fueraDelCatalogo ?? 0)} fuera del catálogo`);
  }
  return partes.join(' · ');
}
