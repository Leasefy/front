import { describe, it, expect } from 'vitest';
import { rotuloDelTema } from './messages.types';

/**
 * SO-29 (Nico, 04-10; QA-INQ-95 r2): Iván salía dos veces en Mensajes sin decir
 * cuál hilo era cuál. No se funden: se rotulan por su tema.
 */
describe('el rótulo del hilo', () => {
  it('«Postulación · dirección» y «Arriendo · dirección»', () => {
    expect(rotuloDelTema({ tipo: 'POSTULACION', direccion: 'Carrera 35 # 8A-12' })).toBe('Postulación · Carrera 35 # 8A-12');
    expect(rotuloDelTema({ tipo: 'ARRIENDO', direccion: 'Calle 45 # 70-12 Apto 301' })).toBe('Arriendo · Calle 45 # 70-12 Apto 301');
    expect(rotuloDelTema({ tipo: 'CONSULTA', direccion: 'Casa en Envigado' })).toBe('Consulta · Casa en Envigado');
  });
  it('sin tema (back anterior) o un directo sin arriendo: vacío, nada inventado', () => {
    expect(rotuloDelTema(undefined)).toBe('');
    expect(rotuloDelTema({ tipo: 'DIRECTO', direccion: null })).toBe('');
  });
});
