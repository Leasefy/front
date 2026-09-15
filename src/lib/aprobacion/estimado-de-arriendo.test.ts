import { describe, it, expect } from 'vitest';
import { enlaceAlEstudio, estimarArriendo, tipoParaElEstudio } from './estimado-de-arriendo';

describe('estimarArriendo — ingreso ≥ 1,5 × canon', () => {
  it('justo en el límite alcanza', () => {
    expect(estimarArriendo({ canon: 2_000_000, ingreso: 3_000_000 })).toEqual({
      alcanza: true,
      ingresoTotal: 3_000_000,
      canonMaximo: 2_000_000,
      faltante: 0,
    });
  });

  it('un peso menos no alcanza y dice cuánto falta', () => {
    const e = estimarArriendo({ canon: 2_000_000, ingreso: 2_999_999 });
    expect(e?.alcanza).toBe(false);
    expect(e?.faltante).toBe(1);
  });

  it('el ingreso del codeudor se suma', () => {
    const e = estimarArriendo({ canon: 2_000_000, ingreso: 2_000_000, ingresoCodeudor: 1_000_000 });
    expect(e?.alcanza).toBe(true);
    expect(e?.ingresoTotal).toBe(3_000_000);
  });

  it('sin ingreso o sin canon no afirma nada', () => {
    expect(estimarArriendo({ canon: 2_000_000, ingreso: 0 })).toBeNull();
    expect(estimarArriendo({ canon: 0, ingreso: 5_000_000 })).toBeNull();
  });
});

describe('enlaceAlEstudio', () => {
  it('lleva canon, ciudad y tipo del inmueble', () => {
    expect(enlaceAlEstudio({ canon: 1_800_000, ciudad: 'Medellín', tipo: 'apartment' })).toBe(
      '/aprobacion?canon=1800000&ciudad=Medell%C3%ADn&tipo=apartamento',
    );
  });

  it('un tipo que el estudio no conoce no se manda', () => {
    expect(tipoParaElEstudio('parking')).toBeNull();
    expect(enlaceAlEstudio({ canon: 500_000, tipo: 'land' })).toBe('/aprobacion?canon=500000');
  });
});
