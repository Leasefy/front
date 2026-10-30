import { describe, expect, it } from 'vitest';

import { avisoDeRepetidos, erroresDelLlamado, hoyEnColombia, nombreDeQuien, nombreDelMotivo } from './convivencia';

describe('Llamados de atención por convivencia (Nico 29-10)', () => {
  it('nombra cada motivo y a quien lo reportó como el back los guarda', () => {
    expect(nombreDelMotivo('areas_comunes')).toBe('Áreas comunes');
    expect(nombreDelMotivo('visitas')).toBe('Visitas o número de personas');
    expect(nombreDelMotivo('algo-raro')).toBe('Otro');
    expect(nombreDeQuien('administracion')).toBe('La administración');
    expect(nombreDeQuien(null)).toBeNull();
  });

  it('pide motivo, una fecha que no sea futura y qué pasó (las frases del back)', () => {
    const hoy = '2026-10-29';
    expect(erroresDelLlamado({ motivo: null, fecha: '2026-10-30', quePaso: 'corto', loReporto: null }, hoy)).toEqual({
      motivo: 'Elige por qué fue el llamado.',
      fecha: 'La fecha del llamado no puede ser después de hoy.',
      quePaso: 'Cuenta qué pasó en al menos 10 letras (y hasta 2.000).',
    });
    expect(
      erroresDelLlamado({ motivo: 'ruido', fecha: '2026-10-29', quePaso: '  Música alta hasta las 3 a. m.  ', loReporto: null }, hoy),
    ).toEqual({});
  });

  it('avisa cuando un motivo llega a 3, y no antes', () => {
    expect(avisoDeRepetidos([{ motivo: 'ruido', cuantos: 2 }])).toBeNull();
    expect(avisoDeRepetidos([{ motivo: 'ruido', cuantos: 3 }, { motivo: 'mascotas', cuantos: 1 }])).toBe(
      'Ya van 3 por ruido. Vinci lo tiene en cuenta al proponer la renovación.',
    );
    expect(avisoDeRepetidos([{ motivo: 'ruido', cuantos: 4 }, { motivo: 'basuras', cuantos: 3 }])).toBe(
      'Ya van 4 por ruido y 3 por basuras. Vinci lo tiene en cuenta al proponer la renovación.',
    );
  });

  it('hoy es el día de Colombia, no el de UTC', () => {
    // 29-10 a las 02:00 UTC todavía es 28-10 en Bogotá.
    expect(hoyEnColombia(new Date('2026-10-29T02:00:00Z'))).toBe('2026-10-28');
  });
});
