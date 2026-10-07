/**
 * donde-esta-la-tabla — en qué hoja y en qué fila empiezan los datos de verdad.
 *
 * Un archivo exportado o hecho a mano no siempre empieza en A1 de la primera
 * hoja: arriba viene el nombre de la inmobiliaria, el rango de fechas o una
 * fila en blanco, y el libro puede traer «Instrucciones» o «Portada» antes de
 * la hoja buena. Leído desde A1 de la primera hoja, eso no da un error: da
 * columnas que no mapean, o peor, columnas que mapean MAL (QA-MIG-A, 04-10):
 *
 *  - propietarios: la hoja «Instrucciones» entraba como un propietario
 *    llamado «No modificar.» (MG-02);
 *  - inmuebles: con el título «REPORTE DE INMUEBLES EN ARRIENDO» arriba, esa
 *    celda se mapeaba como «Canon» y el CÓDIGO de cada inmueble entraba como
 *    su canon: $9.001 (MG-15);
 *  - inquilinos: el encabezado en la fila 4 dejaba las 6 filas vacías (MG-01).
 *
 * Cada paso puntúa una fila candidata con SU diccionario de columnas
 * (`puntuar` = cuántas celdas reconoce con certeza). Se queda en la primera
 * hoja y la primera fila salvo que otra candidata reconozca CLARAMENTE más
 * (3 columnas o más, y más que la de arriba): mover la tabla por un empate
 * flojo sería peor que no moverla.
 */

export interface DondeEstaLaTabla {
  /** La hoja elegida (`undefined` = la primera, como siempre). */
  hoja?: string;
  /** Fila (0-based) de los encabezados dentro de esa hoja. */
  fila: number;
  /** Todas las hojas del libro, en orden. */
  hojas: string[];
}

/** Lo mínimo que tiene que reconocer otra candidata para mover la tabla. */
const MINIMO_PARA_MOVER = 3;

/**
 * Elige hoja y fila. `porHoja` son las primeras filas de cada hoja (en el
 * orden del libro); `puntuar` recibe las celdas NO vacías de una fila.
 */
export function elegirDondeEstaLaTabla(
  porHoja: Array<{ hoja: string; filas: string[][] }>,
  puntuar: (celdas: string[]) => number,
): DondeEstaLaTabla {
  const hojas = porHoja.map((h) => h.hoja);
  const puntaje = (fila: string[] | undefined): number => {
    if (!fila) return 0;
    const celdas = fila.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (celdas.length < 2) return 0;
    return puntuar(celdas);
  };

  const base = puntaje(porHoja[0]?.filas[0]);
  let mejor = { indiceDeHoja: 0, fila: 0, puntaje: base };
  porHoja.forEach((h, indiceDeHoja) => {
    h.filas.forEach((fila, i) => {
      const p = puntaje(fila);
      if (p > mejor.puntaje) mejor = { indiceDeHoja, fila: i, puntaje: p };
    });
  });

  if (mejor.puntaje < MINIMO_PARA_MOVER || mejor.puntaje <= base) {
    return { hoja: undefined, fila: 0, hojas };
  }
  return {
    hoja: mejor.indiceDeHoja === 0 ? undefined : porHoja[mejor.indiceDeHoja].hoja,
    fila: mejor.fila,
    hojas,
  };
}

/**
 * Lo mismo, dentro de UNA hoja ya elegida por la persona (el selector de
 * hoja del importador de inmuebles): sólo se busca la fila.
 */
export function elegirFilaDeEncabezado(
  filas: string[][],
  puntuar: (celdas: string[]) => number,
): number {
  return elegirDondeEstaLaTabla([{ hoja: '', filas }], puntuar).fila;
}

/** La frase que dice dónde se leyó, o `null` si fue lo de siempre (A1 de la primera hoja). */
export function fraseDeDondeSeLeyo(donde: Pick<DondeEstaLaTabla, 'hoja' | 'fila'>): string | null {
  const partes: string[] = [];
  if (donde.hoja) partes.push(`la hoja «${donde.hoja}»`);
  if (donde.fila > 0) partes.push(`los encabezados de la fila ${donde.fila + 1}`);
  if (partes.length === 0) return null;
  return `Leímos ${partes.join(' y ')} de tu archivo: ahí empieza la tabla. Si no es así, revisa el mapeo de abajo.`;
}
