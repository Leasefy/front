import { describe, expect, it } from 'vitest';
import { afinarCon, mezclar } from './afinar';

describe('afinar: lo último que se dice gana', () => {
  const antes = { operacion: 'arriendo' as const, tipo: 'APARTMENT' as const, barrio: 'Laureles', comodidades: ['pets'] };

  it('«casa» cambia el tipo', () => {
    expect(mezclar(antes, { propertyType: 'HOUSE' })).toMatchObject({ tipo: 'HOUSE', barrio: 'Laureles' });
  });

  it('«en Belén» cambia el barrio', () => {
    expect(mezclar(antes, { neighborhood: 'Belén' })).toMatchObject({ barrio: 'Belén', tipo: 'APARTMENT' });
  });

  it('las comodidades se suman', () => {
    expect(mezclar(antes, { amenities: ['balcony'] }).comodidades).toEqual(['pets', 'balcony']);
  });

  it('pregunta al back qué entiende del texto nuevo solo', async () => {
    const r = await afinarCon(antes, null, 'casa', async (f) => {
      expect(f).toEqual({ naturalQuery: 'casa', limit: 1 });
      return { meta: { filtrosEntendidos: { propertyType: 'HOUSE' } } };
    });
    expect(r.tipo).toBe('HOUSE');
    expect(r.q).toBeUndefined();
  });

  it('si no entiende nada o falla, va como texto', async () => {
    expect((await afinarCon(antes, null, 'cerca a mi trabajo', async () => ({ meta: {} }))).q).toBe('cerca a mi trabajo');
    expect(
      (
        await afinarCon(antes, null, 'x', async () => {
          throw new Error('caído');
        })
      ).q,
    ).toBe('x');
  });
});
