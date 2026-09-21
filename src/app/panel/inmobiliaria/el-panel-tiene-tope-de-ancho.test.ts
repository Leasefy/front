/**
 * 🔴 EL PANEL NO CRECE PARA SIEMPRE.
 *
 * Nico pidió que funcionara en 1024, 1140, 1440, 1920, 2560 y 3840. En los
 * anchos chicos el defecto es desbordar; en los grandes es el contrario, y está
 * medido: en la tabla de Contratos a 3840 px el `main` llegaba a **3.600 px** y
 * la tabla a **3.534**, con la columna «Vigencia» en **949 px** y «Inquilino»
 * en **830**. Una fila obligaba a barrer tres metros y medio de pantalla y
 * ningún dato quedaba cerca del siguiente.
 *
 * El tope está en 1.920 y no en 1.280 a propósito: esto es un ERP con tablas de
 * siete columnas y recortarlo como si fuera un blog desperdicia el monitor de
 * quien lo tiene. Medido después del arreglo: a 1920 no cambia nada (el `main`
 * mide 1.680, por debajo del tope); a 2560 y 3840 el contenido se queda en
 * 1.920 y se centra, y la columna más ancha bajó de 949 a 498 px.
 *
 * Esta prueba existe para que nadie lo quite sin saber qué se midió.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LAYOUT = join(process.cwd(), 'src/app/panel/inmobiliaria/layout.tsx');

describe('el layout del panel', () => {
  it('🔴 le pone tope al ancho del contenido y lo centra', () => {
    const texto = readFileSync(LAYOUT, 'utf8');
    const main = /<main[\s\S]{0,400}?>/.exec(texto)?.[0] ?? '';
    expect(main).toContain('max-w-[1920px]');
    expect(main).toContain('mx-auto');
  });
});
