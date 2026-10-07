/**
 * QA-MIGRACION-95 (fork de hallazgos, 06-10-2026) — BN-39, «MIG-C sin tocar»
 * del 04-10: el resumen de inmuebles decía «6 filas traen un estrato que no es
 * un número del 1 al 6 («No Estratificada», por ejemplo)» con un archivo SIN
 * columna de estrato (I04 del corpus, visto en el navegador:
 * capturas/b-I04-d-tras-mapeo.png). El archivo no trae ningún estrato raro:
 * no trae estrato. La frase inventaba un dato del archivo.
 */
import { describe, expect, it } from 'vitest';
import { resumenDeLecturaDeInmuebles } from './resumenDeLectura';
import type { ImportProperty } from './importTypes';

const inmueble = (p: Partial<ImportProperty>): ImportProperty => ({
  _rowIndex: 1,
  suggestions: [],
  selected: true,
  hasErrors: false,
  errorMessages: [],
  propertyAddress: 'CR 43A 1 50 AP 801',
  ...p,
});

const estrato = (r: ReturnType<typeof resumenDeLecturaDeInmuebles>) =>
  r.renglones.find((x) => x.que === 'Estrato');

describe('el estrato en el resumen de lo que se leyó (BN-39)', () => {
  it('sin ningún estrato en el archivo no habla de estratos «que no son un número»', () => {
    const r = resumenDeLecturaDeInmuebles([inmueble({}), inmueble({}), inmueble({})]);
    const e = estrato(r);
    expect(e?.con).toBe(0);
    expect(e?.porque).not.toMatch(/no es un número|No Estratificada/);
    expect(e?.porque).toMatch(/Ninguna fila trae el estrato/);
  });

  it('con algunos estratos, dice cuántas no traen uno del 1 al 6 sin afirmar por qué', () => {
    const r = resumenDeLecturaDeInmuebles([inmueble({ stratum: 3 }), inmueble({}), inmueble({})]);
    const e = estrato(r);
    expect(e?.con).toBe(1);
    expect(e?.porque).toMatch(/^2 filas no traen un estrato del 1 al 6/);
  });

  it('con todos, no inventa un motivo', () => {
    const r = resumenDeLecturaDeInmuebles([inmueble({ stratum: 3 }), inmueble({ stratum: 6 })]);
    expect(estrato(r)?.porque).toBe('');
  });
});

/**
 * QA-MIGRACION-95 (MP-07, 06-10-2026): con UNA fila sin el dato, el resumen
 * decía «1 filas no traen un estrato…» (visto en el navegador con
 * b-MP02-inmuebles-tipo-inmueble.csv). «Dicho en palabras» incluye el número.
 */
describe('una sola fila sin el dato se dice en singular (MP-07)', () => {
  const porque = (r: ReturnType<typeof resumenDeLecturaDeInmuebles>, que: string) =>
    r.renglones.find((x) => x.que === que)?.porque;

  it('cada renglón dice «1 fila … trae», no «1 filas … traen»', () => {
    const completo = inmueble({
      externalId: '8101',
      propertyCity: 'Medellín',
      ownerDocument: '52119131',
      monthlyRent: 1_850_000,
      stratum: 4,
    });
    const r = resumenDeLecturaDeInmuebles([
      completo,
      inmueble({ propertyAddress: '', ownerName: 'Propietaria Siete' }),
    ]);
    expect(porque(r, 'Código del sistema anterior')).toMatch(/^1 fila no trae código\./);
    expect(porque(r, 'Dirección')).toMatch(/^1 fila no trae dirección/);
    expect(porque(r, 'Ciudad')).toMatch(/^1 fila no trae municipio ni ciudad\./);
    expect(porque(r, 'Propietario con documento')).toMatch(
      /^1 fila queda sin cédula ni NIT del dueño \(1 trae sólo el nombre:/,
    );
    expect(porque(r, 'Precio (canon o venta)')).toMatch(/^1 fila trae el precio en 0 o vacío\./);
    expect(porque(r, 'Estrato')).toMatch(/^1 fila no trae un estrato del 1 al 6/);
  });
});
