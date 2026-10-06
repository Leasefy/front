/**
 * QA-FACT-CONTA-95 r2 · CU-F-02: arriba de «Por facturar → Propietarios» la
 * pantalla explica que la comisión del mes sale al girar (FA-R13), no sólo cada
 * fila con «Se factura cuando se le gire».
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DESCRIPCION_DE_LAS_COMISIONES } from './NuevaFactura';

describe('CU-F-02 · la comisión sale al girar, dicho arriba', () => {
  it('la descripción de la lista de propietarios lo dice en palabras', () => {
    expect(DESCRIPCION_DE_LAS_COMISIONES).toMatch(/sale al girar/);
    expect(DESCRIPCION_DE_LAS_COMISIONES).toMatch(/Facturar ahora/);
  });
  it('es la descripción que usa la tabla de propietarios', () => {
    const fuente = readFileSync(join(__dirname, 'NuevaFactura.tsx'), 'utf8');
    expect(fuente).toMatch(/: DESCRIPCION_DE_LAS_COMISIONES/);
  });
});
