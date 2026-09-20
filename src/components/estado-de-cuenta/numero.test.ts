import { describe, it, expect } from 'vitest';
import { numeroDelContratoDelEstado } from './numero';

describe('numeroDelContratoDelEstado — de quién es cada número', () => {
  it('migrado: el de Nui grande y el nuestro al lado', () => {
    expect(numeroDelContratoDelEstado({ numero: '1686', numeroDeLeasefy: 1839 })).toEqual({
      principal: '1686',
    });
  });

  it('nativo: «#14», y sin segundo número (sería el mismo dos veces)', () => {
    expect(numeroDelContratoDelEstado({ numero: '14', numeroDeLeasefy: 14 })).toEqual({
      principal: '#14',
    });
  });

  it('back anterior (sin numeroDeLeasefy): el número tal cual, sin inventar «#»', () => {
    expect(numeroDelContratoDelEstado({ numero: '1298' })).toEqual({
      principal: '1298',
    });
    expect(numeroDelContratoDelEstado({ numero: '14', numeroDeLeasefy: null })).toEqual({
      principal: '14',
    });
  });
});
