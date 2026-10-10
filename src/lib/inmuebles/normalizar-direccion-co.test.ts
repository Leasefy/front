import { describe, it, expect } from 'vitest';
import { normalizarDireccionCo, consultaNormalizada } from './normalizar-direccion-co';

describe('normalizarDireccionCo', () => {
  // Real Portofino rows that landed on the municipality centroid.
  it.each([
    ['CR 55 N 53 A - 35 TO 1 AP 2201- PQ 3049 RESERVAS D', 'Carrera 55 # 53 A - 35'],
    ['CRA 32 A 77S 73 APTO 9815 PQ 100 UNIDAD MAZZARO', 'Carrera 32 A # 77 Sur - 73'],
    ['CL 69 SUR CR 45 -62 (INTERIOR 801) AMELIA PH', 'Calle 69 Sur # 45 - 62'],
  ])('real row %s', (bruta, esperada) => {
    expect(normalizarDireccionCo(bruta)).toBe(esperada);
  });

  it.each([
    ['CL 132 SUR 51 37 INT. 301', 'Calle 132 Sur # 51 - 37'],
    ['CRA. 51 #98 SUR-237 APTO 1719', 'Carrera 51 # 98 Sur - 237'],
    ['CALLE 37#64A-64', 'Calle 37 # 64 A - 64'],
    ['CALLE 129 SUR # 55-51. APARTAMENTO 304. EDIFICIO SANTA ANA', 'Calle 129 Sur # 55 - 51'],
    ['CR 45 N° 134 SUR - 4', 'Carrera 45 # 134 Sur - 4'],
    ['CARRERA 50 No. 127 SUR - 61', 'Carrera 50 # 127 Sur - 61'],
    ['KR 12 Nº 5-20', 'Carrera 12 # 5 - 20'],
    ['CLL 45 BIS 12 - 3', 'Calle 45 Bis # 12 - 3'],
    ['AC 68 # 10-20', 'Avenida Calle 68 # 10 - 20'],
    ['AK 7 # 100-12', 'Avenida Carrera 7 # 100 - 12'],
    ['DG 10 5 20', 'Diagonal 10 # 5 - 20'],
    ['TV 39 B 70-15', 'Transversal 39 B # 70 - 15'],
    ['CR 80 ESTE 12 4', 'Carrera 80 Este # 12 - 4'],
    ['Cra 43A # 10 sur 50 casa 3', 'Carrera 43 A # 10 Sur - 50'],
  ])('%s', (bruta, esperada) => {
    expect(normalizarDireccionCo(bruta)).toBe(esperada);
  });

  it('drops a leading building/complement name before the street', () => {
    expect(normalizarDireccionCo('EDIFICIO SANTA ANA, CALLE 10 # 20-30')).toBe('Calle 10 # 20 - 30');
    expect(normalizarDireccionCo('CASA 5 CR 10 # 20-30')).toBe('Carrera 10 # 20 - 30');
  });

  it('accepts a street + cross street without plate', () => {
    expect(normalizarDireccionCo('CL 10 20')).toBe('Calle 10 # 20');
  });

  it.each([
    'EDIFICIO LUCIANA',
    'PARQUE PRINCIPAL',
    'DETRAS DE LA ESCUELA 9902',
    'CR 55',
    'AV EL POBLADO',
    '',
    '   ',
  ])('cannot parse %j -> null', (bruta) => {
    expect(normalizarDireccionCo(bruta)).toBeNull();
  });

  it('null/undefined -> null', () => {
    expect(normalizarDireccionCo(null)).toBeNull();
    expect(normalizarDireccionCo(undefined)).toBeNull();
  });
});

describe('consultaNormalizada', () => {
  it('appends municipality, department and country', () => {
    expect(
      consultaNormalizada({
        direccion: 'CR 55 N 53 A - 35 TO 1 AP 2201',
        ciudad: 'Caldas',
        departamento: 'Antioquia',
      }),
    ).toBe('Carrera 55 # 53 A - 35, Caldas, Antioquia, Colombia');
  });

  it('skips missing department', () => {
    expect(consultaNormalizada({ direccion: 'CL 10 # 20-30', ciudad: 'Caldas' })).toBe(
      'Calle 10 # 20 - 30, Caldas, Colombia',
    );
  });

  it('null when the address cannot be parsed', () => {
    expect(consultaNormalizada({ direccion: 'EDIFICIO LUCIANA', ciudad: 'Caldas' })).toBeNull();
  });
});
