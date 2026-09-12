/**
 * 🔴 Nico, 2026-09-12: «esta tabla ¿por qué no tiene buscador?».
 *
 * Lo que se fija acá es la trampa que ya costó una vez en propietarios: un
 * buscador que mira la PÁGINA en vez de la lista contesta «no se encontró»
 * sobre algo que sí existe. Por eso esto es una función pura sobre la lista
 * completa — la paginación viene después.
 */

import { describe, it, expect } from 'vitest';
import { filtrarContratos } from './filtrar-contratos';

const CONTRATOS = [
  { id: '1', code: 1981, tenantName: 'Juan Esteban Sanchez Vergara', propertyAddress: 'CRA 50 CALLE 134 SUR 4 E', propertyCity: 'Caldas' },
  { id: '2', code: 1980, tenantName: 'Juan Jose Gomez Arango', propertyAddress: 'CALLE 106B SUR # 51 42', propertyCity: 'Sabaneta' },
  { id: '3', code: 1979, tenantName: 'Alberto Felipe Jaramillo Zuluaga', propertyAddress: 'CL 131 SUR CR 51 -30', propertyCity: 'Caldas' },
  { id: '4', tenantName: 'María Martínez', propertyAddress: 'CL 128 SUR CR 42 - 80', propertyCity: 'Caldas' },
] as unknown as {
  id: string; code?: number; tenantName: string;
  propertyAddress: string; propertyCity: string;
}[];

const ids = (q: string) => filtrarContratos(CONTRATOS, q).map((c) => c.id);

describe('filtrarContratos', () => {
  it('sin búsqueda devuelve todo, sin copiar de más', () => {
    expect(filtrarContratos(CONTRATOS, '')).toHaveLength(4);
    expect(filtrarContratos(CONTRATOS, '   ')).toHaveLength(4);
  });

  it('encuentra por nombre del inquilino', () => {
    expect(ids('gomez')).toEqual(['2']);
    expect(ids('Juan')).toEqual(['1', '2']);
  });

  /* 🔴 «Martínez» tiene que encontrar a «MARTINEZ» y al revés. */
  it('ignora acentos y mayúsculas', () => {
    expect(ids('martinez')).toEqual(['4']);
    expect(ids('MARÍA')).toEqual(['4']);
  });

  it('encuentra por dirección y por municipio', () => {
    expect(ids('106B')).toEqual(['2']);
    expect(ids('sabaneta')).toEqual(['2']);
  });

  /*
   * 🔴 El código se LEE como «#1981» en la pantalla, así que alguien lo va a
   * escribir con numeral. Las dos formas encuentran lo mismo.
   */
  it('encuentra por código, con o sin numeral', () => {
    expect(ids('1981')).toEqual(['1']);
    expect(ids('#1981')).toEqual(['1']);
  });

  /* Un contrato sin código no puede aparecer en cualquier búsqueda numérica. */
  /* 1981 y 1980 contienen «198»; 1979 no, y el que no tiene código tampoco. */
  it('un contrato sin código no se cuela por el número de otro', () => {
    expect(ids('198')).toEqual(['1', '2']);
  });

  it('lo que no está devuelve vacío, no todo', () => {
    expect(ids('no existe nadie así')).toEqual([]);
  });
});
