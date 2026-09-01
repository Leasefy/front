import { describe, it, expect } from 'vitest';
import {
  describirDisparador,
  describirFormula,
  describirRegla,
  describirTope,
  formatearPorcentaje,
} from './legible';

describe('formatearPorcentaje', () => {
  it('usa coma decimal, hasta cuatro decimales y sin ceros de relleno', () => {
    expect(formatearPorcentaje(0.0667)).toBe('0,0667 %');
    expect(formatearPorcentaje(10)).toBe('10 %');
    expect(formatearPorcentaje(2.5)).toBe('2,5 %');
  });

  it('no inventa precisión: cinco decimales se redondean a cuatro', () => {
    expect(formatearPorcentaje(0.06667)).toBe('0,0667 %');
  });
});

describe('describirDisparador', () => {
  it('días de mora: 0, 1 y N se leen distinto', () => {
    expect(describirDisparador({ disparador: 'DIAS_DE_MORA', disparadorDia: 0 })).toBe(
      'apenas vence el plazo',
    );
    expect(describirDisparador({ disparador: 'DIAS_DE_MORA', disparadorDia: 1 })).toBe(
      'desde el primer día de mora',
    );
    expect(describirDisparador({ disparador: 'DIAS_DE_MORA', disparadorDia: 5 })).toBe(
      'a los 5 días de mora',
    );
  });

  it('día del mes', () => {
    expect(describirDisparador({ disparador: 'DIA_DEL_MES', disparadorDia: 15 })).toBe(
      'el día 15 de cada mes',
    );
  });
});

describe('describirFormula', () => {
  it('interés diario sobre la base', () => {
    expect(describirFormula({ formula: 'INTERES_DIARIO', valor: 0.0667, base: 'CANON' })).toBe(
      '0,0667 % diario sobre el canon',
    );
    expect(
      describirFormula({
        formula: 'INTERES_DIARIO',
        valor: 0.05,
        base: 'CANON_MAS_ADMINISTRACION',
      }),
    ).toBe('0,05 % diario sobre el canon más administración');
  });

  it('porcentaje de la base', () => {
    expect(describirFormula({ formula: 'PORCENTAJE_DE_LA_BASE', valor: 10, base: 'CANON' })).toBe(
      '10 % del canon',
    );
    expect(
      describirFormula({ formula: 'PORCENTAJE_DE_LA_BASE', valor: 10, base: 'TOTAL_ADEUDADO' }),
    ).toBe('10 % del total adeudado');
  });

  it('monto fijo en pesos, con el formato de plata del producto', () => {
    expect(describirFormula({ formula: 'MONTO_FIJO', valor: 50000, base: 'CANON' })).toBe(
      '$ 50.000 fijo',
    );
  });
});

describe('describirTope', () => {
  it('sin tope cuando es null o undefined', () => {
    expect(describirTope(null)).toBe('sin tope');
    expect(describirTope(undefined)).toBe('sin tope');
  });
  it('con tope', () => {
    expect(describirTope(500000)).toBe('hasta $ 500.000');
  });
});

describe('describirRegla', () => {
  it('arma la frase entera', () => {
    expect(
      describirRegla({
        disparador: 'DIAS_DE_MORA',
        disparadorDia: 5,
        formula: 'INTERES_DIARIO',
        valor: 0.0667,
        base: 'CANON',
        topeCop: 500000,
      }),
    ).toBe('Se dispara a los 5 días de mora y cobra 0,0667 % diario sobre el canon, hasta $ 500.000.');

    expect(
      describirRegla({
        disparador: 'DIA_DEL_MES',
        disparadorDia: 15,
        formula: 'PORCENTAJE_DE_LA_BASE',
        valor: 10,
        base: 'CANON',
        topeCop: null,
      }),
    ).toBe('Se dispara el día 15 de cada mes y cobra 10 % del canon, sin tope.');
  });
});
