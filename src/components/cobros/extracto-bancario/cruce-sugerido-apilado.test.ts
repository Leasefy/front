/**
 * 🔴 03-10-2026 (PRUEBAS-CONCILIACION, capturas del laboratorio a 1440 px): la
 * columna «Cruce sugerido» del extracto mide ~300 px aun en un escritorio ancho.
 * Las tarjetas de los candidatos, de la pasarela, del giro de Leasefy y de las
 * salidas usaban `sm:flex-row`, que mira la VENTANA y no la celda: el botón se
 * comía el ancho y el texto quedaba de una palabra por línea (filas de 977 a
 * 1.562 px de alto). Ahí las tarjetas van APILADAS: texto arriba, botón abajo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const AQUI = join(process.cwd(), 'src/components/cobros/extracto-bancario');
const EN_LA_CELDA = [
  'MovimientoFila.tsx',
  'PropuestaDeLaPasarela.tsx',
  'PropuestaDeLaPasarelaGiro.tsx',
  'SalidaDelExtracto.tsx',
];

describe('las tarjetas de «Cruce sugerido» no se ponen en fila por el ancho de la ventana', () => {
  it.each(EN_LA_CELDA)('%s no usa `sm:flex-row` (la celda es angosta en cualquier pantalla)', (archivo) => {
    const fuente = readFileSync(join(AQUI, archivo), 'utf8');
    expect(fuente).not.toMatch(/sm:flex-row/);
  });
});
