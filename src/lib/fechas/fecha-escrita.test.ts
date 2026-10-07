import { describe, it, expect } from 'vitest';
import {
  fechaEscritaComoIso,
  leerFechaEscrita,
  type MotivoDeLaFecha,
} from './fecha-escrita';

/**
 * 🔴 El banco del lector de fechas que escribe una persona (02-10-2026, Nico:
 * «¿no tenemos parsers que solucionan eso? si no lo tenemos, constrúyelos»).
 *
 * 🔁 Los MISMOS casos están en el back (`src/common/fechas/fecha-escrita.spec.ts`):
 * los dos lectores son espejo y tienen que contestar igual.
 */

/** 10:00 de Bogotá del 2 de octubre de 2026: decide el año de dos dígitos. */
const HOY = new Date('2026-10-02T15:00:00.000Z');
const lee = (v: unknown, etiqueta?: string) =>
  leerFechaEscrita(v, { hoy: HOY, ...(etiqueta ? { etiqueta } : {}) });

describe('leerFechaEscrita — lo que entiende', () => {
  it.each([
    // El año primero (ISO), con o sin hora.
    ['2026-12-01', '2026-12-01'],
    ['2026/12/01', '2026-12-01'],
    ['2026.12.01', '2026-12-01'],
    ['2026-12-01T10:00:00.000Z', '2026-12-01'],
    ['2026-12-01 10:00', '2026-12-01'],
    // El día primero, con números (convención colombiana).
    ['01/12/2026', '2026-12-01'],
    ['1/12/2026', '2026-12-01'],
    ['1-12-2026', '2026-12-01'],
    ['1.12.2026', '2026-12-01'],
    ['1 12 2026', '2026-12-01'],
    ['01/12/2026 08:30', '2026-12-01'],
    ['  01/12/2026  ', '2026-12-01'],
    ['03/04/2026', '2026-04-03'],
    ['29/02/2028', '2028-02-29'],
    // El año de dos dígitos: ventana [hoy − 79, hoy + 20].
    ['1/12/26', '2026-12-01'],
    ['15/03/85', '1985-03-15'],
    ['1/1/46', '2046-01-01'],
    ['1/1/47', '1947-01-01'],
    // El mes en letras, en español o en inglés, en cualquier orden con el día.
    ['1 de diciembre de 2026', '2026-12-01'],
    ['1 diciembre 2026', '2026-12-01'],
    ['01-dic-2026', '2026-12-01'],
    ['1 dic. 2026', '2026-12-01'],
    ['dic 1 2026', '2026-12-01'],
    ['Dic. 1, 2026', '2026-12-01'],
    ['diciembre 1, 2026', '2026-12-01'],
    ['2026 diciembre 1', '2026-12-01'],
    ['1 DE DICIEMBRE DE 2026', '2026-12-01'],
    ['Martes 1 de diciembre del 2026', '2026-12-01'],
    ['miércoles 2 de diciembre de 2026', '2026-12-02'],
    ['1º de diciembre de 2026', '2026-12-01'],
    ['1° de Diciembre de 2026', '2026-12-01'],
    ['1 dic 26', '2026-12-01'],
    ['5 de setiembre de 2026', '2026-09-05'],
    ['5 sept 2026', '2026-09-05'],
    ['5 de agosto de 2026', '2026-08-05'],
    ['Dec 1, 2026', '2026-12-01'],
    ['December 1 2026', '2026-12-01'],
    ['3 ene 2027', '2027-01-03'],
  ])('«%s» → %s', (escrita, esperada) => {
    expect(lee(escrita)).toEqual({ ok: true, iso: esperada });
    expect(fechaEscritaComoIso(escrita, { hoy: HOY })).toBe(esperada);
  });

  it('un Date válido es su día; uno inválido no se entiende', () => {
    expect(lee(new Date('2026-12-01T00:00:00.000Z'))).toEqual({
      ok: true,
      iso: '2026-12-01',
    });
    expect(lee(new Date('basura'))).toMatchObject({
      ok: false,
      motivo: 'NO_ENTENDIDA',
    });
  });
});

describe('leerFechaEscrita — lo que no adivina, y la frase dice cómo escribirla', () => {
  it.each<[unknown, MotivoDeLaFecha, string]>([
    ['', 'VACIA', 'Falta la fecha.'],
    ['   ', 'VACIA', 'Falta la fecha.'],
    [null, 'VACIA', 'Falta la fecha.'],
    [undefined, 'VACIA', 'Falta la fecha.'],
    [
      46357,
      'NO_ENTENDIDA',
      'No entendimos la fecha «46357». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      'mañana',
      'NO_ENTENDIDA',
      'No entendimos la fecha «mañana». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      '20261201',
      'NO_ENTENDIDA',
      'No entendimos la fecha «20261201». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      '1/12-2026',
      'NO_ENTENDIDA',
      'No entendimos la fecha «1/12-2026». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      '1 de diciembre y enero de 2026',
      'NO_ENTENDIDA',
      'No entendimos la fecha «1 de diciembre y enero de 2026». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      'diciembre 1 2 2026',
      'NO_ENTENDIDA',
      'No entendimos la fecha «diciembre 1 2 2026». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    ],
    [
      '31/02/2026',
      'NO_EXISTE',
      'La fecha no es un día real del calendario: febrero de 2026 tiene 28 días.',
    ],
    [
      '32 de enero de 2026',
      'NO_EXISTE',
      'La fecha no es un día real del calendario: enero de 2026 tiene 31 días.',
    ],
    [
      '2026-02-31',
      'NO_EXISTE',
      'La fecha no es un día real del calendario: febrero de 2026 tiene 28 días.',
    ],
    // Mes y día volteados: no se adivina, se dice con SU fecha bien escrita.
    [
      '12/25/2026',
      'NO_EXISTE',
      'La fecha no tiene un mes válido (25). En Colombia el día va primero: escríbela como 25/12/2026.',
    ],
    [
      '2026-13-01',
      'NO_EXISTE',
      'La fecha no tiene un mes válido (13). Escríbela con el día primero, por ejemplo 01/12/2026.',
    ],
    [
      '1/12',
      'SIN_ANIO',
      'A la fecha le falta el año. Escríbela completa, por ejemplo 01/12/2026.',
    ],
    [
      '1 de diciembre',
      'SIN_ANIO',
      'A la fecha le falta el año. Escríbela completa, por ejemplo 01/12/2026.',
    ],
    [
      '12/2026',
      'SIN_DIA',
      'A la fecha le falta el día. Escríbela completa, por ejemplo 01/12/2026.',
    ],
    [
      '2026-12',
      'SIN_DIA',
      'A la fecha le falta el día. Escríbela completa, por ejemplo 01/12/2026.',
    ],
    [
      'diciembre de 2026',
      'SIN_DIA',
      'A la fecha le falta el día. Escríbela completa, por ejemplo 01/12/2026.',
    ],
  ])('%p → %s', (escrita, motivo, mensaje) => {
    expect(lee(escrita)).toEqual({ ok: false, motivo, mensaje });
    expect(fechaEscritaComoIso(escrita, { hoy: HOY })).toBeNull();
  });

  it('la frase nombra el campo que se le pasa', () => {
    expect(lee('mañana', 'La fecha de vigencia')).toMatchObject({
      mensaje:
        'No entendimos la fecha de vigencia «mañana». Escríbela con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    });
    expect(lee('31/02/2026', 'El inicio del contrato')).toMatchObject({
      mensaje:
        'El inicio del contrato no es un día real del calendario: febrero de 2026 tiene 28 días.',
    });
    // Con su género y la contracción: «al inicio», «escríbelo».
    expect(lee('1/12', 'El inicio del contrato')).toMatchObject({
      mensaje:
        'Al inicio del contrato le falta el año. Escríbelo completo, por ejemplo 01/12/2026.',
    });
    expect(lee('ayer', 'El inicio del contrato')).toMatchObject({
      mensaje:
        'No entendimos el inicio del contrato «ayer». Escríbelo con el día primero, por ejemplo 01/12/2026 o «1 de diciembre de 2026».',
    });
  });
});
