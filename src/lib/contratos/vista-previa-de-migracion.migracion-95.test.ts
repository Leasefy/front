/**
 * QA-MIGRACION-95 (fork corpus, 06-10-2026): un archivo con su propia
 * columna «Código inmueble» (C03, C09, C10, C13, C14 del corpus).
 *
 * La lectura sí mandaba el código al back (`fila.codigoInmueble`), pero el
 * resumen de lectura y la vista previa miraban sólo el código empaquetado en
 * «Propiedad» («3 - CR 50…»): la pantalla decía «Inmueble identificable: 0 de
 * 8 · 8 filas no traen ni código ni dirección del inmueble (0 traen código de
 * origen)» de un archivo que trae el código en TODAS las filas.
 */
import { describe, it, expect } from 'vitest';
import { mapearColumnas } from './columnas-de-contrato';
import { resumenDeLectura, vistaPreviaDeFilas } from './vista-previa-de-migracion';

const ENCABEZADOS = ['Inquilino', 'Cédula inquilino', 'Código inmueble', 'Valor arriendo', 'Fecha inicio', 'Fecha fin', 'Día pago'];
const FILAS = [
  { Inquilino: 'Valentina Arango Ríos', 'Cédula inquilino': '1036111222', 'Código inmueble': '9001', 'Valor arriendo': '$2.500.000', 'Fecha inicio': '01/02/2026', 'Fecha fin': '31/01/2027', 'Día pago': '5' },
  { Inquilino: 'Santiago Mejía Toro', 'Cédula inquilino': '1152333444', 'Código inmueble': '9002', 'Valor arriendo': '3200000', 'Fecha inicio': '2025-11-15', 'Fecha fin': '2026-11-14', 'Día pago': '' },
];

describe('el código del inmueble en su propia columna (QA-MIGRACION-95)', () => {
  const mapeo = mapearColumnas(ENCABEZADOS);

  it('el resumen de lectura cuenta el código de la columna propia', () => {
    const r = resumenDeLectura(FILAS, mapeo);
    const inmueble = r.renglones.find((x) => x.que === 'Inmueble identificable')!;
    expect(inmueble.con).toBe(2);
    expect(inmueble.porque).toBe('');
  });

  it('la vista previa muestra ese código del inmueble', () => {
    const v = JSON.stringify(vistaPreviaDeFilas(FILAS, mapeo));
    expect(v).toContain('9001');
    expect(v).toContain('9002');
  });
});
