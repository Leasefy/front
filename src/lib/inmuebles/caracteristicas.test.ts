import { describe, expect, it } from 'vitest';

import {
  CARACTERISTICAS,
  CARACTERISTICAS_MAXIMAS,
  caracteristicasDelTexto,
  caracteristicasPorGrupo,
  esCaracteristica,
  nombreDeLaCaracteristica,
} from './caracteristicas';
import { AMENITIES_OPTIONS } from '@/lib/types/publish';
import { PROPERTY_AMENITIES } from '@/lib/types/property';
import { COMODIDADES } from '@/lib/marketplace/busqueda';

/**
 * 🔴 Espejo de `AMENIDADES_VALIDAS` del back
 * (`back/src/properties/dto/limites-del-inmueble.ts`, 21-10-2026). Si una se
 * agrega acá y no allá, el back rechaza el inmueble entero con «Hay una
 * característica que no está en la lista»: este arreglo se cambia en los dos
 * repos a la vez.
 */
const LAS_DEL_BACK = [
  'pool', 'gym', 'security', 'parking', 'elevator', 'terrace', 'bbq', 'playground', 'laundry', 'pets',
  'furnished', 'balcony', 'storage', 'ac', 'heating',
  'patio', 'garden', 'study', 'integral_kitchen', 'closets', 'walk_in_closet', 'water_heater', 'natural_gas',
  'fireplace', 'exterior_view', 'visitor_parking', 'gated', 'intercom', 'power_plant', 'social_room',
  'sports_court', 'green_areas', 'sauna', 'jacuzzi', 'coworking', 'bike_parking', 'accessible',
  'near_transport', 'near_shopping', 'near_schools', 'near_parks',
];

describe('la única lista de características', () => {
  it('🔴 tiene exactamente las del back, sin repetidas', () => {
    const ids = CARACTERISTICAS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...LAS_DEL_BACK].sort());
  });

  it('las 15 de siempre siguen (hay inmuebles guardados con ellas)', () => {
    for (const id of ['pool', 'gym', 'security', 'parking', 'elevator', 'terrace', 'bbq', 'playground', 'laundry', 'pets', 'furnished', 'balcony', 'storage', 'ac', 'heating']) {
      expect(esCaracteristica(id), id).toBe(true);
    }
  });

  it('cada nombre es único y cada grupo tiene las suyas', () => {
    const nombres = CARACTERISTICAS.map((c) => c.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    const grupos = caracteristicasPorGrupo();
    expect(grupos.map((g) => g.nombre)).toEqual(['Del inmueble', 'Del edificio o conjunto', 'Del sector']);
    for (const g of grupos) expect(g.items.length).toBeGreaterThan(0);
    expect(grupos.reduce((n, g) => n + g.items.length, 0)).toBe(CARACTERISTICAS.length);
  });

  it('🔴 las listas viejas (ficha, formularios y buscador) salen de ésta: ninguna se queda corta', () => {
    expect(PROPERTY_AMENITIES.map((a) => a.id)).toEqual(CARACTERISTICAS.map((c) => c.id));
    expect(AMENITIES_OPTIONS.map((a) => a.value)).toEqual(CARACTERISTICAS.map((c) => c.id));
    expect(COMODIDADES.map((a) => a.api)).toEqual(CARACTERISTICAS.map((c) => c.id));
    // La ficha antes no mostraba «Zona infantil», «Aire acondicionado» ni «Calefacción».
    expect(PROPERTY_AMENITIES.find((a) => a.id === 'playground')?.name).toBe('Zona infantil');
  });

  it('el nombre de cada una; un id desconocido no tiene nombre', () => {
    expect(nombreDeLaCaracteristica('pool')).toBe('Piscina');
    expect(nombreDeLaCaracteristica('walk_in_closet')).toBe('Vestier');
    expect(nombreDeLaCaracteristica('Piscina')).toBeNull();
    expect(nombreDeLaCaracteristica('helipuerto')).toBeNull();
  });
});

describe('caracteristicasDelTexto: la celda de un archivo a ids', () => {
  it('separa por coma, punto y coma, barra, viñeta o salto de línea, sin tildes ni mayúsculas', () => {
    expect(caracteristicasDelTexto('Piscina, GIMNASIO; Parqueadero de visitantes / Balcón\nCitofono • Porteria 24 horas')).toEqual({
      ids: ['pool', 'gym', 'visitor_parking', 'balcony', 'intercom', 'security'],
      sinReconocer: [],
    });
  });

  it('🔴 «Parqueadero de visitantes» no suma también «Parqueadero»: nada se reconoce por un pedazo', () => {
    expect(caracteristicasDelTexto('Parqueadero de visitantes').ids).toEqual(['visitor_parking']);
    expect(caracteristicasDelTexto('Piscina climatizada')).toEqual({ ids: [], sinReconocer: ['Piscina climatizada'] });
  });

  it('«A/C» es aire acondicionado y «N/A» no es nada (la barra es parte de la palabra)', () => {
    expect(caracteristicasDelTexto('A/C, N/A, Balcón')).toEqual({ ids: ['ac', 'balcony'], sinReconocer: [] });
  });

  it('lo que no reconoce lo devuelve tal cual, para decirlo; «Sí», «No» y vacíos no cuentan', () => {
    expect(caracteristicasDelTexto('Helipuerto; Sí; ; No; Ascensor')).toEqual({ ids: ['elevator'], sinReconocer: ['Helipuerto'] });
  });

  it('una repetida cuenta una vez; vacío o nada da listas vacías', () => {
    expect(caracteristicasDelTexto('Piscina, piscina, PISCINA').ids).toEqual(['pool']);
    expect(caracteristicasDelTexto('')).toEqual({ ids: [], sinReconocer: [] });
    expect(caracteristicasDelTexto(undefined)).toEqual({ ids: [], sinReconocer: [] });
  });

  it(`nunca más de ${CARACTERISTICAS_MAXIMAS} (el tope del back)`, () => {
    const todas = CARACTERISTICAS.map((c) => c.nombre).join(', ');
    expect(caracteristicasDelTexto(todas).ids).toHaveLength(CARACTERISTICAS_MAXIMAS);
  });
});
