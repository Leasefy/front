import { describe, it, expect } from 'vitest';
import { diaCortoDelEmbudo, esUnaVisita, rotuloDeLaVencida } from './proxima-accion';

describe('Prospección — la fecha y la vencida, iguales en «Para hoy» y en la tarjeta (ronda 20)', () => {
  it('«lun 19 oct», sin «de» ni puntos', () => {
    expect(diaCortoDelEmbudo('2026-10-19')).toBe('lun 19 oct');
  });

  it('«Visita vencida» cuando la acción es una visita; si no, «Acción vencida»', () => {
    expect(rotuloDeLaVencida('Visita el 19 de oct a las 10:00')).toBe('Visita vencida');
    expect(rotuloDeLaVencida('Llamar para confirmar')).toBe('Acción vencida');
    expect(rotuloDeLaVencida(null)).toBe('Acción vencida');
    expect(esUnaVisita('  visitar el inmueble')).toBe(true);
  });
});
