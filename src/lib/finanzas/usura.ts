/**
 * Los meses de la serie de usura, y cuáles faltan. Puro.
 *
 * ── Por qué «cuáles faltan» es la cifra importante ──────────────────────────
 *
 * El interés de mora se topea con la usura del mes en que corrió (art. 884 del
 * Código de Comercio). Un mes sin tasa cargada NO frena el cálculo: el back
 * liquida el interés SIN topear —que es exactamente lo que hacía el producto
 * hasta el 17-09— y avisa. Así que la pantalla tiene que decir, fuerte y
 * arriba, qué meses están sin tope: son los meses en los que la inmobiliaria
 * puede estar cobrando por encima de lo que la ley permite.
 *
 * El back ya manda `mesesSinTasa` en su respuesta. Esto es el mismo cálculo
 * hecho acá, para cuando no venga: el contrato escrito no lo nombra, y una
 * pantalla que se queda muda porque faltó un campo opcional es peor que una
 * que lo deduce de lo que sí tiene.
 */

const FORMATO = /^\d{4}-(0[1-9]|1[0-2])$/;

export function esMesValido(mes: string): boolean {
  return FORMATO.test(mes);
}

/** El mes siguiente a `YYYY-MM`. */
export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(a, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Los meses de un rango, inclusive, del más viejo al más nuevo.
 *
 * Tope de 120 meses (10 años), igual que el back: una fecha corrupta no puede
 * pedir diez mil filas ni colgar el navegador dibujándolas.
 */
export function rangoDeMeses(desde: string, hasta: string): string[] {
  if (!esMesValido(desde) || !esMesValido(hasta) || desde > hasta) return [];
  const salida: string[] = [];
  let mes = desde;
  while (salida.length < 120) {
    salida.push(mes);
    if (mes >= hasta) break;
    mes = mesSiguiente(mes);
  }
  return salida;
}

/** `hasta` menos `n` meses; sirve para el rango por defecto (los últimos 24). */
export function mesesAtras(hasta: string, n: number): string {
  const [a, m] = hasta.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Los meses del rango que NO tienen tasa: esos son los que salen sin topear.
 *
 * Se prefiere lo que diga el back (`mesesSinTasa`): sabe de qué meses hay
 * cartera viva. Esto es el respaldo.
 */
export function mesesQueFaltan(
  desde: string,
  hasta: string,
  tasas: readonly { mes: string }[],
): string[] {
  const cargados = new Set(tasas.map((t) => t.mes));
  return rangoDeMeses(desde, hasta).filter((m) => !cargados.has(m));
}

/**
 * El aviso de los meses sin tope, en una frase. `null` cuando no falta ninguno.
 *
 * Se nombran los meses (hasta seis) en vez de decir sólo «faltan 14»: con el
 * número a secas nadie sabe cuáles cargar.
 */
export function avisoDeMesesQueFaltan(meses: readonly string[]): string | null {
  if (meses.length === 0) return null;
  const nombrados = meses.slice(0, 6).join(', ');
  const resto = meses.length > 6 ? ` y ${meses.length - 6} más` : '';
  return (
    `${meses.length} ${meses.length === 1 ? 'mes' : 'meses'} sin tasa de usura cargada ` +
    `(${nombrados}${resto}). El interés de mora de esos meses se liquida SIN topear: ` +
    'puede quedar por encima de lo que permite el art. 884 del Código de Comercio. ' +
    'Cárgalas acá con la certificación de la Superfinanciera.'
  );
}
