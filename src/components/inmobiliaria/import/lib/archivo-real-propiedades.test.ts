/**
 * El archivo REAL de inmuebles de la inmobiliaria entra sin una sola columna
 * «SIN MAPEAR», y sus valores se leen bien.
 *
 * ── Por qué este test y no otro ─────────────────────────────────────────────
 *
 * El mapeo automático se prueba encabezado por encabezado en
 * `columnMapping.test.ts`. Eso no alcanza: los encabezados compiten entre sí.
 * «Barrio» y «Urbanización» apuntaban al mismo campo y una de las dos se
 * perdía en el dedup; «Teléfonos Propietario» (en plural) caía en el NOMBRE
 * del dueño. Ninguno de los dos casos se ve mirando una columna sola.
 *
 * Por eso acá va el encabezado COMPLETO, en su orden, tal cual lo exporta el
 * sistema del que se migra.
 *
 * 🔴 Los ENCABEZADOS son los reales (son públicos: nombran columnas, no
 * personas). Las FILAS son inventadas con la misma forma — los archivos con
 * datos de gente viva no entran al repo ni a los fixtures.
 */

import { describe, expect, it } from 'vitest';
import { autoMapColumns } from './columnMapping';
import { analyzeProperties, mapRowsToProperties } from './gapFiller';
import { toImportarInmuebleDto } from './toImportarInmuebleDto';
import type { ParsedRow } from './importTypes';

/** El encabezado de Propiedades.csv, en su orden. */
export const ENCABEZADO_PROPIEDADES = [
  'Código',
  'Clase',
  'Servicio',
  'Estrato',
  'Propietario',
  'Teléfonos Propietario',
  'Dirección',
  'Valor Arriendo',
  'Valor Venta',
  'Estado Propiedad',
  'Departamento',
  'Municipio',
  'Barrio',
  'Urbanización',
  'Llaves en',
  'Creada Por',
  'Fecha Creación',
];

/** Una fila con la MISMA forma que las reales. Persona y dirección inventadas. */
const FILA_INVENTADA: ParsedRow = {
  _rowIndex: 1,
  'Código': '2945',
  'Clase': 'Apartamento',
  'Servicio': 'Arriendo',
  'Estrato': 'Tres',
  'Propietario': '901111111 - INVERSIONES DEL SUR S.A.S',
  'Teléfonos Propietario': '3205234056',
  'Dirección': ' CRA. 51 #96 SUR 50',
  'Valor Arriendo': '$1,900,000.00',
  'Valor Venta': '',
  'Estado Propiedad': 'Activa',
  'Departamento': 'Antioquia',
  'Municipio': 'La Estrella',
  'Barrio': 'CENTRO',
  'Urbanización': 'ARAGUA',
  'Llaves en': 'oficina',
  'Creada Por': 'ANA MARIA ECHAVARRIA MORALES',
  'Fecha Creación': '2026-09-08 10:10:08',
};

describe('Propiedades.csv: el encabezado real', () => {
  const mapeo = autoMapColumns(ENCABEZADO_PROPIEDADES);
  const porColumna = Object.fromEntries(mapeo.map((m) => [m.sourceColumn, m.targetField]));

  it('no deja NINGUNA de las 17 columnas sin mapear', () => {
    const sinMapear = mapeo.filter((m) => m.targetField === null).map((m) => m.sourceColumn);
    expect(sinMapear).toEqual([]);
    expect(mapeo).toHaveLength(17);
  });

  it('cada columna cae en su campo, no en el de al lado', () => {
    expect(porColumna).toEqual({
      'Código': 'externalId',
      'Clase': 'propertyType',
      'Servicio': 'listingType',
      'Estrato': 'stratum',
      'Propietario': 'ownerName',
      'Teléfonos Propietario': 'ownerPhone',
      'Dirección': 'propertyAddress',
      'Valor Arriendo': 'monthlyRent',
      'Valor Venta': 'salePrice',
      'Estado Propiedad': 'status',
      'Departamento': 'propertyDepartment',
      'Municipio': 'propertyCity',
      'Barrio': 'propertyZone',
      'Urbanización': 'urbanizacion',
      'Llaves en': 'llavesEn',
      'Creada Por': 'creadaPor',
      'Fecha Creación': 'consignedAt',
    });
  });

  it('ningún campo se lo reparten dos columnas', () => {
    const usados = mapeo.map((m) => m.targetField).filter(Boolean);
    expect(new Set(usados).size).toBe(usados.length);
  });
});

describe('Propiedades.csv: los valores', () => {
  const mapeo = autoMapColumns(ENCABEZADO_PROPIEDADES);
  const [inmueble] = mapRowsToProperties([FILA_INVENTADA], mapeo);

  it('parte el propietario en documento y nombre', () => {
    expect(inmueble.ownerDocument).toBe('901111111');
    expect(inmueble.ownerName).toBe('INVERSIONES DEL SUR S.A.S');
  });

  it('lee la plata con el formato del export', () => {
    expect(inmueble.monthlyRent).toBe(1900000);
    expect(inmueble.salePrice).toBeUndefined();
  });

  it('lee el estrato escrito con letras', () => {
    expect(inmueble.stratum).toBe(3);
  });

  it('le quita la hora a la fecha de creación', () => {
    expect(inmueble.consignedAt).toBe('2026-09-08');
  });

  it('guarda el resto de las columnas del archivo', () => {
    expect(inmueble.externalId).toBe('2945');
    // `mapRowsToProperties` guarda la celda tal cual; la normalización a
    // `apartment` la hace `analyzeProperties`, el paso siguiente.
    expect(inmueble.propertyType).toBe('Apartamento');
    expect(inmueble.listingType).toBe('Arriendo');
    expect(inmueble.propertyCity).toBe('La Estrella');
    expect(inmueble.propertyDepartment).toBe('Antioquia');
    expect(inmueble.propertyZone).toBe('CENTRO');
    expect(inmueble.urbanizacion).toBe('ARAGUA');
    expect(inmueble.llavesEn).toBe('oficina');
    expect(inmueble.creadaPor).toBe('ANA MARIA ECHAVARRIA MORALES');
    expect(inmueble.status).toBe('Activa');
    expect(inmueble.ownerPhone).toBe('3205234056');
  });

  it('un Apartaestudio es un studio, no un apartamento', () => {
    const [uno] = analyzeProperties(
      mapRowsToProperties([{ ...FILA_INVENTADA, Clase: 'Apartaestudio' }], mapeo),
    );
    expect(uno.propertyType).toBe('studio');
  });

  it('las clases del archivo real caen donde deben', () => {
    const clases = ['Apartamento', 'Apartaestudio', 'Local', 'Casa', 'Casa Finca', 'Finca'];
    const tipos = analyzeProperties(
      mapRowsToProperties(
        clases.map((Clase, i) => ({ ...FILA_INVENTADA, _rowIndex: i + 1, Clase })),
        mapeo,
      ),
    ).map((p) => p.propertyType);
    expect(tipos).toEqual(['apartment', 'studio', 'commercial', 'house', 'house', 'house']);
  });

  it('«Celda Parqueadero» es un parqueadero y «Lote» un lote (tipos desde el 2026-09-11); «Edificio» sigue crudo y la revisión lo pide', () => {
    const [celda, lote, edificio] = analyzeProperties(
      mapRowsToProperties(
        [
          { ...FILA_INVENTADA, Clase: 'Celda Parqueadero' },
          { ...FILA_INVENTADA, Clase: 'Lote' },
          { ...FILA_INVENTADA, Clase: 'Edificio' },
        ],
        mapeo,
      ),
    );
    expect(celda.propertyType).toBe('parking');
    expect(lote.propertyType).toBe('land');
    expect(edificio.propertyType).toBe('Edificio');
  });

  it('un estrato que no es un número queda vacío, no en 1', () => {
    const [sinEstrato] = mapRowsToProperties(
      [{ ...FILA_INVENTADA, Estrato: 'No Estratificada' }],
      mapeo,
    );
    expect(sinEstrato.stratum).toBeUndefined();
  });

  it('«Venta y Arriendo» llega crudo: lo resuelve la revisión, no se adivina acá', () => {
    const [ambos] = mapRowsToProperties(
      [{ ...FILA_INVENTADA, Servicio: 'Venta y Arriendo', 'Valor Venta': '$240,000,000.00' }],
      mapeo,
    );
    expect(ambos.listingType).toBe('Venta y Arriendo');
    expect(ambos.salePrice).toBe(240000000);
    expect(ambos.monthlyRent).toBe(1900000);
  });
});

describe('Propiedades.csv: lo que viaja al back', () => {
  const mapeo = autoMapColumns(ENCABEZADO_PROPIEDADES);
  const [inmueble] = mapRowsToProperties([FILA_INVENTADA], mapeo);
  const dto = toImportarInmuebleDto(inmueble);

  it('manda el código como externalId', () => {
    expect(dto.externalId).toBe('2945');
  });

  it('manda el propietario ya partido', () => {
    expect(dto.propietarioDocumento).toBe('901111111');
    expect(dto.propietarioNombre).toBe('INVERSIONES DEL SUR S.A.S');
  });

  it('manda el estrato y la fecha', () => {
    expect(dto.stratum).toBe(3);
    expect(dto.consignedAt).toBe('2026-09-08');
  });

  /*
   * 🔴 Los NOMBRES son lo que se está fijando acá, no que el dato exista.
   * `ImportarInmuebleDto` del back declara exactamente `propietarioTelefono`,
   * `estadoOrigen`, `urbanizacion`, `llavesEn` y `creadaPor`; el
   * `ValidationPipe` corre con `forbidNonWhitelisted: true`, así que una sola
   * letra de diferencia es un 400 para el lote entero — no un campo que se
   * ignora.
   */
  it('manda las cinco columnas nuevas con el nombre exacto del DTO', () => {
    expect(dto.urbanizacion).toBe('ARAGUA');
    expect(dto.llavesEn).toBe('oficina');
    expect(dto.creadaPor).toBe('ANA MARIA ECHAVARRIA MORALES');
    expect(dto.propietarioTelefono).toBe('3205234056');
    expect(dto.estadoOrigen).toBe('Activa');
  });

  /*
   * `status` es el nombre del campo en el modelo del FRONT (`ImportProperty`);
   * en el cable se llama `estadoOrigen`. Mandar el de adentro sería un 400.
   */
  it('no manda ninguna clave que el DTO no declare', () => {
    const DECLARADAS = new Set([
      'externalId',
      'title',
      'description',
      'type',
      'listingType',
      'city',
      'department',
      'neighborhood',
      'address',
      'monthlyRent',
      'salePrice',
      'adminFee',
      'deposit',
      'consignedAt',
      'bedrooms',
      'bathrooms',
      'area',
      'floor',
      'parkingSpaces',
      'stratum',
      'yearBuilt',
      'amenities',
      'latitude',
      'longitude',
      'propietarioDocumento',
      'propietarioNombre',
      'propietarioTelefono',
      'estadoOrigen',
      'urbanizacion',
      'llavesEn',
      'creadaPor',
      'comisionPorcentaje',
    ]);
    const intrusas = Object.keys(dto).filter((k) => !DECLARADAS.has(k));
    expect(intrusas).toEqual([]);
    expect(dto).not.toHaveProperty('status');
  });
});
