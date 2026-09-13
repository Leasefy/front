/**
 * columnaCompuesta.test.ts — una columna que trae dos datos en cada celda.
 *
 * El caso real (Nico, 2026-09-11): «Propiedad» del archivo de contratos trae
 * «3 - CR 50 127 SUR 61 OF 502». Mapeada a «Dirección» a secas, el código se
 * perdía y la dirección quedaba con el «3 - » pegado.
 */

import { describe, it, expect } from 'vitest';
import type { ColumnMapping, ParsedRow } from './importTypes';
import {
  cambiarDestinoDeParte,
  destinosDe,
  detectarColumnaCompuesta,
  dividirColumna,
  dividirLasCompuestas,
  normalizarParte,
  pareceArchivoDeContratos,
  partirCelda,
  sugerirDestinos,
  unirColumna,
} from './columnaCompuesta';

describe('partirCelda — qué es «dos datos» y qué no', () => {
  it('«3 - CR 50 127 SUR 61 OF 502» es código + dirección', () => {
    expect(partirCelda('3 - CR 50 127 SUR 61 OF 502')).toEqual({ izquierda: '3', derecha: 'CR 50 127 SUR 61 OF 502' });
  });

  it('se parte por el PRIMER guion: la dirección conserva los suyos', () => {
    expect(partirCelda('22 - CARRERA 50 N. 127 SUR - 61 OFICINA 602')).toEqual({
      izquierda: '22',
      derecha: 'CARRERA 50 N. 127 SUR - 61 OFICINA 602',
    });
  });

  it('«[1] 901272830 - CONSTRUCTORA X» es documento + nombre, sin el [1]', () => {
    expect(partirCelda('[1] 901272830 - CONSTRUCTORA X')).toEqual({ izquierda: '901272830', derecha: 'CONSTRUCTORA X' });
  });

  it('un documento con puntos de miles también es un dato corto', () => {
    expect(partirCelda('1.026.148.652 - YISED CARDONA')).toEqual({ izquierda: '1.026.148.652', derecha: 'YISED CARDONA' });
  });

  it('una dirección con guion adentro NO se parte: «CALLE 130 SUR 52 - 03» es una sola cosa', () => {
    expect(partirCelda('CALLE 130 SUR 52 - 03')).toBeNull();
  });

  it('«55-51 CALLE 129» (guion pegado, y sigue un número) tampoco: es nomenclatura', () => {
    expect(partirCelda('55-51 CALLE 129')).toBeNull();
  });

  it('con el guion pegado y una letra después sí: «3-CR 50 127»', () => {
    expect(partirCelda('3-CR 50 127')).toEqual({ izquierda: '3', derecha: 'CR 50 127' });
  });

  it('el guion medio de un Excel autocorregido es el mismo separador', () => {
    expect(partirCelda('7 – CL 129 SUR 56')).toEqual({ izquierda: '7', derecha: 'CL 129 SUR 56' });
  });

  it('vacío, sin guion o sin nada a la derecha: no hay dos datos', () => {
    expect(partirCelda('')).toBeNull();
    expect(partirCelda('CR 50 127 SUR 61')).toBeNull();
    expect(partirCelda('3 - ')).toBeNull();
  });
});

describe('detectarColumnaCompuesta — la columna, no la celda', () => {
  it('3 de 4 celdas partibles NO alcanza: la columna no es compuesta', () => {
    const d = detectarColumnaCompuesta(['3 - CR 50 127', '1 - CR 50 100 B', '2 - CL 129 SUR 56', 'CALLE 130 SUR 52 - 03']);
    expect(d).toBeNull();
  });

  it('con el 80 % o más sí, y trae un ejemplo para mostrar', () => {
    const d = detectarColumnaCompuesta(['3 - CR 50 127', '1 - CR 50 100 B', '2 - CL 129 SUR 56', '5 - CL 129 SUR 46', 'CALLE 130 SUR 52 - 03']);
    expect(d?.proporcion).toBe(0.8);
    expect(d?.ejemplo).toEqual({ izquierda: '3', derecha: 'CR 50 127' });
  });

  it('una columna de direcciones puras (las 2.895 reales) no es compuesta', () => {
    expect(detectarColumnaCompuesta(['CR 50 127 SUR 61', 'CALLE 130 SUR 52 - 03', 'CRA 51B #79-20'])).toBeNull();
  });

  it('vacía no es nada', () => {
    expect(detectarColumnaCompuesta(['', null, undefined])).toBeNull();
  });
});

describe('sugerirDestinos — qué es cada parte', () => {
  it('en una columna de dirección: código + dirección', () => {
    expect(sugerirDestinos('propertyAddress', { izquierda: '3', derecha: 'CR 50 127' })).toEqual(['externalId', 'propertyAddress']);
  });

  it('en una columna de propietario: documento + nombre', () => {
    expect(sugerirDestinos('ownerName', { izquierda: '901272830', derecha: 'CONSTRUCTORA X' })).toEqual(['ownerDocument', 'ownerName']);
  });

  it('sin encabezado que ayude: por la forma (documento largo + nombre / código corto + vía)', () => {
    expect(sugerirDestinos(null, { izquierda: '901272830', derecha: 'CONSTRUCTORA X' })).toEqual(['ownerDocument', 'ownerName']);
    expect(sugerirDestinos(null, { izquierda: '3', derecha: 'CR 50 127 SUR' })).toEqual(['externalId', 'propertyAddress']);
  });
});

const col = (sourceColumn: string, targetField: string | null, extra: Partial<ColumnMapping> = {}): ColumnMapping => ({
  sourceColumn,
  targetField,
  confidence: targetField ? 0.92 : 0,
  isManual: false,
  ...extra,
});

describe('dividir, unir y cambiar una parte', () => {
  it('partir una columna la deja sin campo propio y con sus dos destinos', () => {
    const r = dividirColumna([col('Propiedad', 'propertyAddress')], 'Propiedad', { izquierda: '3', derecha: 'CR 50' });
    expect(r[0].targetField).toBeNull();
    expect(r[0].partes).toEqual({ destinos: ['externalId', 'propertyAddress'] });
    expect(destinosDe(r[0])).toEqual(['externalId', 'propertyAddress']);
  });

  it('no le quita el campo a otra columna: si «Código» ya viene aparte, la izquierda queda sin destino', () => {
    const r = dividirColumna([col('Código', 'externalId'), col('Propiedad', 'propertyAddress')], 'Propiedad', { izquierda: '3', derecha: 'CR 50' });
    expect(r[1].partes).toEqual({ destinos: [null, 'propertyAddress'] });
    expect(r[0].targetField).toBe('externalId');
  });

  it('unir vuelve al campo de la derecha (el texto)', () => {
    const partida = dividirColumna([col('Propiedad', 'propertyAddress')], 'Propiedad', { izquierda: '3', derecha: 'CR 50' });
    const r = unirColumna(partida, 'Propiedad');
    expect(r[0].partes).toBeUndefined();
    expect(r[0].targetField).toBe('propertyAddress');
  });

  it('cambiar una parte a un campo que otra columna tenía se lo quita a la otra', () => {
    const base = dividirColumna([col('Propiedad', 'propertyAddress'), col('Ref', 'externalId')], 'Propiedad', { izquierda: '3', derecha: 'CR 50' });
    expect(base[0].partes?.destinos).toEqual([null, 'propertyAddress']);
    const r = cambiarDestinoDeParte(base, 'Propiedad', 0, 'externalId');
    expect(r[0].partes?.destinos).toEqual(['externalId', 'propertyAddress']);
    expect(r[1].targetField).toBeNull();
  });

  it('las dos partes no pueden ir al mismo campo', () => {
    const base = dividirColumna([col('Propiedad', 'propertyAddress')], 'Propiedad', { izquierda: '3', derecha: 'CR 50' });
    const r = cambiarDestinoDeParte(base, 'Propiedad', 0, 'propertyAddress');
    expect(r[0].partes?.destinos).toEqual(['propertyAddress', null]);
  });
});

describe('dividirLasCompuestas — al leer el archivo', () => {
  const filas: ParsedRow[] = [
    { _rowIndex: 1, Propiedad: '3 - CR 50 127 SUR 61', Propietario: '[1] 901272830 - CONSTRUCTORA X', Obs: '2022 - algo' },
    { _rowIndex: 2, Propiedad: '1 - CR 50 100 B SUR 810', Propietario: '[1] 900515021 - MASTERPARK', Obs: '2023 - otro' },
  ];

  it('parte de una las columnas de dirección y propietario que traen dos datos, y NO otras', () => {
    const r = dividirLasCompuestas([col('Propiedad', 'propertyAddress'), col('Propietario', 'ownerName'), col('Obs', 'notes')], filas);
    expect(r[0].partes).toEqual({ destinos: ['externalId', 'propertyAddress'] });
    expect(r[0].isManual).toBe(false);
    expect(r[1].partes).toEqual({ destinos: ['ownerDocument', 'ownerName'] });
    expect(r[2].partes).toBeUndefined();
    expect(r[2].targetField).toBe('notes');
  });

  it('«Propiedad» con una dirección a la derecha se parte sola aunque el encabezado la hubiera mandado a «Tipo»: las celdas mandan', () => {
    const r = dividirLasCompuestas([col('Propiedad', 'propertyType')], filas);
    expect(r[0].partes).toEqual({ destinos: ['externalId', 'propertyAddress'] });
    expect(r[0].targetField).toBeNull();
    expect(r[0].isManual).toBe(false);
  });

  it('el «Consecutivo» (número de fila del archivo) suelta el código: el código del inmueble viene en la celda', () => {
    const r = dividirLasCompuestas([col('Consecutivo', 'externalId'), col('Propiedad', null)], filas);
    expect(r[0].targetField).toBeNull();
    expect(r[1].partes).toEqual({ destinos: ['externalId', 'propertyAddress'] });
  });

  it('pero una columna «Código» explícita se queda con el código: la parte izquierda queda sin destino', () => {
    const r = dividirLasCompuestas([col('Código', 'externalId'), col('Propiedad', null)], filas);
    expect(r[0].targetField).toBe('externalId');
    expect(r[1].partes).toEqual({ destinos: [null, 'propertyAddress'] });
  });

  it('una columna sin campo con «[1] documento - nombre» NO se parte sola: puede ser el inquilino', () => {
    const conInquilino: ParsedRow[] = [
      { _rowIndex: 1, Inquilino: '[1] 71211270 - FRAN EDWARD' },
      { _rowIndex: 2, Inquilino: '[1] 1036599828 - CRISTIAN' },
    ];
    const r = dividirLasCompuestas([col('Inquilino', null)], conInquilino);
    expect(r[0].partes).toBeUndefined();
  });

  it('una columna de direcciones puras se queda como estaba', () => {
    const puras: ParsedRow[] = [{ _rowIndex: 1, Dirección: 'CR 50 127 SUR 61' }, { _rowIndex: 2, Dirección: 'CALLE 130 SUR 52 - 03' }];
    const r = dividirLasCompuestas([col('Dirección', 'propertyAddress')], puras);
    expect(r[0].partes).toBeUndefined();
    expect(r[0].targetField).toBe('propertyAddress');
  });
});

describe('normalizarParte', () => {
  it('el documento entra sin puntos ni espacios; lo demás sólo recortado', () => {
    expect(normalizarParte('ownerDocument', '1.026.148.652')).toBe('1026148652');
    expect(normalizarParte('externalId', ' 0007 ')).toBe('0007');
  });
});

describe('pareceArchivoDeContratos', () => {
  it('con «Inquilino», «Fecha Inicio», «Día de pago»… es el archivo de contratos', () => {
    expect(pareceArchivoDeContratos(['Consecutivo', 'Propiedad', 'Inquilino', 'Fecha Inicio', 'Fecha Fin', 'Día de pago'])).toEqual([
      'Inquilino',
      'Fecha Inicio',
      'Fecha Fin',
      'Día de pago',
    ]);
  });

  it('el archivo de inmuebles no lo parece', () => {
    expect(pareceArchivoDeContratos(['Código', 'Clase', 'Servicio', 'Estrato', 'Propietario', 'Dirección', 'Valor Arriendo'])).toEqual([]);
  });
});
