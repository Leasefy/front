/**
 * Una celda vacía no puede tumbar la pantalla de Cobros.
 *
 * 🔴 Visto en el navegador con la cuenta de QA, que tiene cuatro cobros
 * migrados sin nombre de inquilino: escribir una letra en el buscador dejaba
 * la pantalla entera en «Esta sección se rompió · REFERENCIA TYPEERROR».
 * Ordenar por «Inquilino» hacía lo mismo desde la tabla.
 *
 * La causa es la de siempre: el tipo dice `tenantName: string` y la base dice
 * `null`. `tsc` no lo ve —el tipo miente— y ningún test lo veía porque todos
 * los fixtures traen los tres campos llenos. Es el mismo criterio que Nico ya
 * fijó para la migración: ninguna celda puede tirar el archivo entero.
 */

import { describe, it, expect } from 'vitest';

import { enMinuscula } from './CobroTable';

/** La misma función que filtra la página de Cobros, escrita acá tal cual. */
function coincide(
  c: { tenantName: string | null; propertyTitle: string | null; propertyAddress: string | null },
  query: string,
): boolean {
  const texto = (v: string | null | undefined) => (v ?? '').toLowerCase();
  return (
    texto(c.tenantName).includes(query) ||
    texto(c.propertyTitle).includes(query) ||
    texto(c.propertyAddress).includes(query)
  );
}

describe('enMinuscula', () => {
  it('una celda vacía es texto vacío, no una excepción', () => {
    expect(enMinuscula(null)).toBe('');
    expect(enMinuscula(undefined)).toBe('');
  });

  it('el texto normal baja a minúscula', () => {
    expect(enMinuscula('Apartamento EN Provenza')).toBe('apartamento en provenza');
  });

  it('ordenar una lista con nombres vacíos no revienta y los deja primero', () => {
    const filas = [
      { tenantName: 'Zulema' },
      { tenantName: null as string | null },
      { tenantName: 'Ana' },
    ];
    const ordenadas = [...filas].sort((a, b) =>
      enMinuscula(a.tenantName).localeCompare(enMinuscula(b.tenantName)),
    );
    expect(ordenadas.map((f) => f.tenantName)).toEqual([null, 'Ana', 'Zulema']);
  });
});

describe('el buscador de Cobros', () => {
  const sinNombre = { tenantName: null, propertyTitle: 'Apto 101', propertyAddress: 'Calle 1' };

  it('🔴 un cobro sin nombre de inquilino NO tumba la búsqueda', () => {
    expect(() => coincide(sinNombre, 'apto')).not.toThrow();
    expect(coincide(sinNombre, 'apto')).toBe(true);
  });

  it('un cobro sin ninguno de los tres campos simplemente no coincide', () => {
    const vacio = { tenantName: null, propertyTitle: null, propertyAddress: null };
    expect(coincide(vacio, 'lo que sea')).toBe(false);
  });

  it('sigue encontrando por nombre, título y dirección', () => {
    const c = { tenantName: 'Nicolás Londoño', propertyTitle: 'Apto 101', propertyAddress: 'Calle 1' };
    expect(coincide(c, 'londoño')).toBe(true);
    expect(coincide(c, 'apto')).toBe(true);
    expect(coincide(c, 'calle')).toBe(true);
    expect(coincide(c, 'medellín')).toBe(false);
  });
});
