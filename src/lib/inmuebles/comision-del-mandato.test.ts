import { describe, expect, it } from 'vitest';

import { COMISION_NO_VENIA, textoDeLaComision } from './comision-del-mandato';

describe('textoDeLaComision (QA 22-09)', () => {
  const base = {
    listingType: 'rent' as const,
    commissionPercent: 8,
    saleCommissionPercent: null,
  };

  it('la conocida, con su %', () => {
    expect(textoDeLaComision(base)).toBe('8%');
  });

  it('🔴 la que no venía en el archivo no se pinta como «0%»', () => {
    expect(
      textoDeLaComision({ ...base, commissionPercent: 0, comisionDesconocida: true }),
    ).toBe(COMISION_NO_VENIA);
  });

  it('una venta muestra la comisión de venta', () => {
    expect(
      textoDeLaComision({ ...base, listingType: 'sale', saleCommissionPercent: 3 }),
    ).toBe('3%');
    expect(textoDeLaComision({ ...base, listingType: 'sale' })).toBe('—');
  });
});
