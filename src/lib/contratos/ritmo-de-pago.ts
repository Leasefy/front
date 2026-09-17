/**
 * Cuándo paga el inquilino, dicho en palabras.
 *
 * Nico (2026-09-16): la ficha decía «Día 21 / +2 de plazo», que obliga a
 * traducir. Lo que se lee es «Paga el 21 de cada mes, con 2 días de plazo».
 *
 * ── De dónde salen el día y el plazo ────────────────────────────────────────
 * Los dos viven en dos niveles y se resuelven igual que en el back
 * (`cartera/cuota-es-cartera.ts#diasDePlazoDelContrato`): lo del CONTRATO pisa
 * lo de la INMOBILIARIA, y `null` en el contrato quiere decir «hereda», no
 * «cero». Un `0` explícito del contrato SÍ es un valor: hay contratos sin
 * plazo, y confundirlo con «no lo sé» le regalaría días de gracia a quien no
 * los pactó.
 *
 * Cuando el contrato hereda y los términos de la inmobiliaria todavía no
 * llegaron (o no se pudieron traer), el plazo es DESCONOCIDO — `null` — y la
 * frase lo dice sin inventar un número.
 */

/** Lo de la inmobiliaria que un contrato puede heredar. `null` = no llegó. */
export interface TerminosDeLaAgencia {
  /** `Agency.diasDePlazo`. Ausente en la inmobiliaria = 0, como en el back. */
  diasDePlazo?: number | null;
  /** `Agency.paymentDueDay`. */
  diaDePago?: number | null;
}

export type Periodicidad = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

export interface TerminosDelContrato {
  paymentDueDay?: number | null;
  /**
   * El modo (back `regla-del-arriendo.ts`, 16-09): `true` = se genera el 1 de
   * cada mes; `false` = fecha a fecha, vence el día de la fecha de cartera.
   */
  prorratearPrimerMes?: boolean | null;
  /** `'YYYY-MM-DD'`. Sin ella, la de inicio. */
  fechaDeCartera?: string | null;
  startDate?: string | null;
  diasDePlazo?: number | null;
  periodicidad?: Periodicidad | null;
}

/**
 * Los días de plazo que rigen para este contrato, con la herencia resuelta.
 * `null` sólo cuando hereda y la inmobiliaria no se conoce.
 */
export function diasDePlazoQueRigen(
  contrato: TerminosDelContrato,
  agencia: TerminosDeLaAgencia | null,
): number | null {
  const propio = contrato.diasDePlazo;
  if (propio !== null && propio !== undefined) return Math.max(0, Math.trunc(propio));
  if (!agencia) return null;
  return Math.max(0, Math.trunc(agencia.diasDePlazo ?? 0));
}

const CADA: Record<Periodicidad, string> = {
  MENSUAL: ' de cada mes',
  BIMESTRAL: ', cada dos meses',
  TRIMESTRAL: ', cada tres meses',
  SEMESTRAL: ', cada seis meses',
  ANUAL: ', una vez al año',
};

function dias(n: number): string {
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

/** «Paga el 21 de cada mes, con 2 días de plazo.» */
export function ritmoDePago(
  contrato: TerminosDelContrato,
  agencia: TerminosDeLaAgencia | null,
): string {
  const cada = CADA[contrato.periodicidad ?? 'MENSUAL'] ?? CADA.MENSUAL;

  // El día de la cartera, leído del texto: un `new Date('2026-08-21')` en
  // Bogotá es el 20 a las 7 p. m.
  const diaDeCartera = Number((contrato.fechaDeCartera ?? contrato.startDate ?? '').slice(8, 10)) || null;

  let cuando: string;
  if (contrato.prorratearPrimerMes === true) {
    // Nico y Juan Camilo, 16-09: «el arriendo se genera el día 1, sólo que se
    // le dan N días de plazo». El primer mes se cobra por días desde la cartera.
    cuando = `Se genera el 1${cada}`;
  } else if (contrato.prorratearPrimerMes === false && diaDeCartera) {
    // Fecha a fecha: del 20 al 19 del mes siguiente, vence el día en que empieza.
    cuando = `Va fecha a fecha: vence el ${diaDeCartera}${cada}`;
  } else if (contrato.paymentDueDay) {
    cuando = `Paga el ${contrato.paymentDueDay}${cada}`;
  } else if (agencia?.diaDePago) {
    cuando = `Paga el ${agencia.diaDePago}${cada} (el día de tu inmobiliaria)`;
  } else {
    cuando = `Paga el día que fija tu inmobiliaria${cada === CADA.MENSUAL ? ', cada mes' : cada}`;
  }

  const heredaPlazo = contrato.diasDePlazo === null || contrato.diasDePlazo === undefined;
  const plazo = diasDePlazoQueRigen(contrato, agencia);

  let conPlazo: string;
  if (plazo === null) {
    conPlazo = 'con los días de plazo de tu inmobiliaria';
  } else if (plazo === 0) {
    conPlazo = heredaPlazo ? 'sin días de plazo (como tu inmobiliaria)' : 'sin días de plazo';
  } else {
    conPlazo = `con ${dias(plazo)} de plazo${heredaPlazo ? ' (los de tu inmobiliaria)' : ''}`;
  }

  return `${cuando}, ${conPlazo}.`;
}
