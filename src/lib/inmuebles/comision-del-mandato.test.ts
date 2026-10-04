import { describe, expect, it } from 'vitest';

import { COMISION_NO_VENIA, COMISION_SIN_DEFINIR, textoCortoDeLaComision, textoDeLaComision } from './comision-del-mandato';

describe('textoDeLaComision (QA 22-09)', () => {
  const base = {
    listingType: 'rent' as const,
    commissionPercent: 8,
    saleCommissionPercent: null,
  };

  it('la conocida, con su % separado y una sola vez: «8 %» (IN-03)', () => {
    expect(textoDeLaComision(base)).toBe('8 %');
    expect(textoDeLaComision({ ...base, commissionPercent: 2.5 })).toBe('2,5 %');
  });

  it('sin número (una respuesta incompleta) dice «—», no revienta', () => {
    expect(textoDeLaComision({ ...base, commissionPercent: undefined as unknown as number })).toBe('—');
  });

  it('🔴 la que no venía en el archivo no se pinta como «0%»', () => {
    expect(
      textoDeLaComision({ ...base, commissionPercent: 0, comisionDesconocida: true }),
    ).toBe(COMISION_NO_VENIA);
  });

  it('una venta muestra la comisión de venta', () => {
    expect(
      textoDeLaComision({ ...base, listingType: 'sale', saleCommissionPercent: 3 }),
    ).toBe('3 %');
    expect(textoDeLaComision({ ...base, listingType: 'sale' })).toBe('—');
  });
});

describe('textoCortoDeLaComision (la celda de la lista, QA 04-10)', () => {
  it('la que no venía dice «Sin definir» y guarda la frase larga para el title', () => {
    expect(
      textoCortoDeLaComision({ listingType: 'rent', commissionPercent: 0, saleCommissionPercent: null, comisionDesconocida: true }),
    ).toEqual({ texto: COMISION_SIN_DEFINIR, explicacion: COMISION_NO_VENIA });
  });

  it('la conocida es la misma de siempre, sin title', () => {
    expect(
      textoCortoDeLaComision({ listingType: 'rent', commissionPercent: 10, saleCommissionPercent: null }),
    ).toEqual({ texto: '10 %', explicacion: undefined });
  });
});
