/**
 * fechas-con-mes-primero — el archivo que viene con las fechas al revés.
 *
 * En Colombia «03/04/2026» es 3 de abril y así se lee siempre
 * (`comoFecha`). Pero un archivo exportado de un Google Sheets o un Excel en
 * inglés trae mes/día/año, y leído día/mes «02/01/2026» (1 de febrero) queda
 * en el 2 de ENERO: el contrato se corre un mes entero sin un solo error
 * (QA-MIG-A, MG-08). Las que no existen como día/mes («11/15/2025») quedaban
 * como faltante; las que sí existen se corrían en silencio.
 *
 * La regla es por COLUMNA, nunca por celda: una columna es «mes primero»
 * cuando al menos una fecha SÓLO existe leída mes/día (el segundo número
 * pasa de 12) y ninguna SÓLO existe leída día/mes. Entonces la columna
 * entera se reescribe a ISO (`aaaa-mm-dd`) leyendo mes/día, y la pantalla lo
 * dice. Si la columna mezcla las dos formas, no se toca (se lee día/mes, lo
 * imposible queda como faltante visible) y también se dice: adivinar fila
 * por fila sería inventar.
 */

const FECHA_CON_BARRAS = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/;

export interface ColumnaDeFechas {
  columna: string;
  /** Una fecha de la columna que sólo existe leída mes/día (la prueba). */
  ejemplo: string;
}

export interface FechasConMesPrimero<F> {
  filas: F[];
  /** Columnas reescritas: venían mes/día/año. */
  reescritas: ColumnaDeFechas[];
  /** Columnas con las dos formas mezcladas: se dejaron como venían. */
  mezcladas: ColumnaDeFechas[];
}

function existe(a: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(a, m, 0)).getUTCDate();
}

const dos = (n: number) => String(n).padStart(2, '0');

export function fechasConMesPrimero<F extends Record<string, unknown>>(
  filas: F[],
): FechasConMesPrimero<F> {
  const columnas = new Set<string>();
  for (const f of filas) for (const k of Object.keys(f)) if (!k.startsWith('_')) columnas.add(k);

  const reescritas: ColumnaDeFechas[] = [];
  const mezcladas: ColumnaDeFechas[] = [];
  const aReescribir = new Set<string>();

  for (const columna of columnas) {
    let soloMesPrimero: string | null = null;
    let soloDiaPrimero: string | null = null;
    for (const f of filas) {
      const m = String(f[columna] ?? '').trim().match(FECHA_CON_BARRAS);
      if (!m) continue;
      const [, x, y, a] = m;
      const primero = Number(x);
      const segundo = Number(y);
      const anio = Number(a);
      const comoDiaMes = existe(anio, segundo, primero);
      const comoMesDia = existe(anio, primero, segundo);
      if (comoMesDia && !comoDiaMes) soloMesPrimero ??= m[0];
      if (comoDiaMes && !comoMesDia) soloDiaPrimero ??= m[0];
    }
    if (soloMesPrimero && !soloDiaPrimero) {
      aReescribir.add(columna);
      reescritas.push({ columna, ejemplo: soloMesPrimero });
    } else if (soloMesPrimero && soloDiaPrimero) {
      mezcladas.push({ columna, ejemplo: soloMesPrimero });
    }
  }

  if (aReescribir.size === 0) return { filas, reescritas, mezcladas };

  const nuevas = filas.map((f) => {
    const copia: Record<string, unknown> = { ...f };
    for (const columna of aReescribir) {
      const m = String(f[columna] ?? '').trim().match(FECHA_CON_BARRAS);
      if (!m) continue;
      const mes = Number(m[1]);
      const dia = Number(m[2]);
      const anio = Number(m[3]);
      // Una celda imposible también como mes/día se deja tal cual: `comoFecha`
      // la volverá faltante visible, nunca otra fecha.
      if (existe(anio, mes, dia)) copia[columna] = `${anio}-${dos(mes)}-${dos(dia)}`;
    }
    return copia as F;
  });
  return { filas: nuevas, reescritas, mezcladas };
}

/** La frase para la pantalla, o `null` si no hubo nada que decir. */
export function fraseDeFechasConMesPrimero(r: Pick<FechasConMesPrimero<unknown>, 'reescritas' | 'mezcladas'>): string | null {
  const partes: string[] = [];
  if (r.reescritas.length > 0) {
    const cols = r.reescritas.map((c) => `«${c.columna}»`).join(', ');
    const ej = r.reescritas[0].ejemplo;
    partes.push(
      `Las fechas de ${cols} vienen con el mes primero (como ${ej}): las leímos así, mes/día/año.`,
    );
  }
  if (r.mezcladas.length > 0) {
    const cols = r.mezcladas.map((c) => `«${c.columna}»`).join(', ');
    partes.push(
      `En ${cols} hay fechas con el día primero y otras con el mes primero: las leímos día/mes/año y las que no existen así quedan por completar. Revisa esa columna en tu archivo.`,
    );
  }
  return partes.length > 0 ? partes.join(' ') : null;
}
