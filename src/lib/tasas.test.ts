/**
 * Lo que se prueba acá es la diferencia entre «dio cero» y «no se midió».
 *
 * El bug que motivó el archivo: con una inmobiliaria nueva el denominador era
 * cero, el cálculo caía al `: 0` y la pantalla afirmaba «0.0% · Bajo ↘».
 */
import { describe, it, expect } from 'vitest';

import {
  SIN_MEDIR,
  anchoDeBarra,
  promedioMedido,
  tasaMedida,
  textoDeTasa,
} from './tasas';

describe('tasaMedida', () => {
  it('mide cuando hay denominador', () => {
    expect(tasaMedida(37, 40)).toBeCloseTo(92.5);
    expect(tasaMedida(1, 3)).toBeCloseTo(33.333, 3);
  });

  it('un cero MEDIDO sigue siendo cero, no una raya', () => {
    // 0 cobrados de 10 esperados es un hecho: la inmobiliaria no recaudó nada.
    expect(tasaMedida(0, 10)).toBe(0);
  });

  it('denominador cero ⇒ null, NUNCA 0', () => {
    expect(tasaMedida(0, 0)).toBeNull();
    expect(tasaMedida(5, 0)).toBeNull();
  });

  it('no inventa un número con datos rotos', () => {
    expect(tasaMedida(Number.NaN, 10)).toBeNull();
    expect(tasaMedida(10, Number.NaN)).toBeNull();
    expect(tasaMedida(10, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('promedioMedido', () => {
  it('promedia cuando hay valores', () => {
    expect(promedioMedido([10, 20, 30])).toBe(20);
  });

  it('lista vacía ⇒ null: cero días para cerrar sin haber cerrado nada es mentira', () => {
    expect(promedioMedido([])).toBeNull();
  });

  it('un cero medido promedia como cero', () => {
    expect(promedioMedido([0, 0])).toBe(0);
  });
});

describe('textoDeTasa', () => {
  it('pinta el número medido con los decimales de cada pantalla', () => {
    expect(textoDeTasa(92.54)).toBe('92.5%');
    expect(textoDeTasa(92.54, 0)).toBe('93%');
  });

  it('un cero medido se pinta como cero', () => {
    expect(textoDeTasa(0)).toBe('0.0%');
  });

  it('sin medición pinta la raya, no «0%»', () => {
    expect(textoDeTasa(null)).toBe(SIN_MEDIR);
    expect(textoDeTasa(null)).not.toContain('%');
    expect(textoDeTasa(null, 0)).toBe('—');
  });
});

describe('anchoDeBarra', () => {
  it('la barra topa en 100 y no baja de 0', () => {
    expect(anchoDeBarra(140)).toBe('100%');
    expect(anchoDeBarra(-5)).toBe('0%');
    expect(anchoDeBarra(40)).toBe('40%');
  });

  it('sin medición la barra queda vacía', () => {
    expect(anchoDeBarra(null)).toBe('0%');
  });
});
