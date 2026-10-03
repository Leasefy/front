import { afterEach, describe, expect, it } from 'vitest';

import { formatCurrency, formatCurrencyEnDocumento } from '@/lib/format';
import { formatCurrency as formatCurrencyDeInmobiliaria } from '@/lib/types/inmobiliaria';
import { traeCentavosGuardados } from './centavos-guardados';
import { fijarConfigDePlataParaPruebas } from './con-centavos';

afterEach(() => fijarConfigDePlataParaPruebas(null));

describe('traeCentavosGuardados (C4)', () => {
  it('sólo un número con hasta dos decimales que no es entero', () => {
    expect(traeCentavosGuardados(1_500_000.29)).toBe(true);
    expect(traeCentavosGuardados(2_500_000)).toBe(false);
    expect(traeCentavosGuardados(2_350_000.29 * 0.19)).toBe(false);
    expect(traeCentavosGuardados('1500000.29')).toBe(false);
  });
});

describe('documentos del front con TODAS las llaves apagadas (C4, Q3 a)', () => {
  it('un entero sale EXACTAMENTE como hoy', () => {
    expect(formatCurrencyEnDocumento(2_500_000, false)).toBe(formatCurrency(2_500_000));
  });

  it('un valor con centavos guardados se escribe con sus dos decimales, sin redondear', () => {
    expect(formatCurrencyEnDocumento(1_500_000.29, false)).toBe('$ 1.500.000,29');
  });

  it('una cuenta a medias (más de dos decimales) sigue al peso, como hoy', () => {
    expect(formatCurrencyEnDocumento(446_500.0551, false)).toBe(formatCurrency(446_500.0551));
  });
});

describe('UNA sola formatCurrency (C4: «$ 1.234.567» con espacio)', () => {
  it('la de lib/types/inmobiliaria escribe lo mismo que la de lib/format', () => {
    for (const v of [0, 1, 2_500_000, -2_500, 1_234_567]) {
      expect(formatCurrencyDeInmobiliaria(v)).toBe(formatCurrency(v));
    }
    expect(formatCurrencyDeInmobiliaria(2_500_000)).toBe('$ 2.500.000');
  });
});
