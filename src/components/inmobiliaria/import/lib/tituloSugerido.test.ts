import { describe, it, expect } from 'vitest';
import {
  tituloSugerido,
  etiquetaDelTipo,
  barrioLegible,
} from './tituloSugerido';

describe('tituloSugerido — el título que se propone cuando el archivo no trae uno', () => {
  it('arma «Clase en Municipio», como los escriben las inmobiliarias', () => {
    expect(tituloSugerido('apartment', 'Sabaneta')).toBe(
      'Apartamento en Sabaneta',
    );
    expect(tituloSugerido('house', 'Envigado')).toBe('Casa en Envigado');
  });

  it('usa la clase del archivo cuando el enum se queda corto', () => {
    expect(tituloSugerido('Casa Finca', 'Sopetrán')).toBe(
      'Casa finca en Sopetrán',
    );
    expect(tituloSugerido('Lote', 'Cisneros')).toBe('Lote en Cisneros');
    expect(tituloSugerido('Celda Parqueadero', 'Caldas')).toBe(
      'Parqueadero en Caldas',
    );
  });

  it('no confunde tildes ni mayúsculas', () => {
    expect(etiquetaDelTipo('CABAÑA')).toBe('Cabaña');
    expect(etiquetaDelTipo('cabana')).toBe('Cabaña');
    expect(etiquetaDelTipo('  Casa   Finca ')).toBe('Casa finca');
  });

  it('no convierte la basura del sistema de origen en un título', () => {
    for (const basura of ['Queja', 'Sugerencia', 'Responsable del IVA', 'Tipo 2']) {
      expect(etiquetaDelTipo(basura)).toBeNull();
      expect(tituloSugerido(basura, 'Medellín')).toBe('Inmueble en Medellín');
    }
  });

  it('nunca arma «Apartamento en undefined»', () => {
    expect(tituloSugerido('apartment', undefined)).toBe('Apartamento');
    expect(tituloSugerido(undefined, 'Bello')).toBe('Inmueble en Bello');
    expect(tituloSugerido(undefined, undefined)).toBe('Inmueble');
  });
});

describe('tituloSugerido — con barrio', () => {
  it('pone barrio y municipio, en ese orden', () => {
    expect(tituloSugerido('apartment', 'Sabaneta', 'Sierra Morena')).toBe(
      'Apartamento en Sierra Morena, Sabaneta',
    );
  });

  it('embellece el barrio gritado y respeta el que ya está bien', () => {
    expect(tituloSugerido('apartment', 'La Estrella', 'UNIDAD SIERRA MORENA')).toBe(
      'Apartamento en Unidad Sierra Morena, La Estrella',
    );
    expect(barrioLegible('VILLA DE LAS FLORES')).toBe('Villa de las Flores');
    expect(barrioLegible('El Poblado')).toBe('El Poblado');
  });

  it('no duplica cuando el barrio repite el municipio', () => {
    expect(tituloSugerido('house', 'Caldas', 'CALDAS')).toBe('Casa en Caldas');
  });

  it('sin barrio queda igual', () => {
    expect(tituloSugerido('apartment', 'Sabaneta', undefined)).toBe(
      'Apartamento en Sabaneta',
    );
  });
});
