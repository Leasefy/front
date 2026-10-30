import { describe, expect, it } from 'vitest';

import { ordenarFilas } from '@/lib/hooks/use-orden-de-la-tabla';
import { codigoDelPucParaOrdenar } from './codigo-del-puc-para-ordenar';

describe('codigoDelPucParaOrdenar', () => {
  it('ordena como el plan de cuentas, dígito a dígito (no como número)', () => {
    const codigos = ['4135', '110505', '28', '1', '41', '2', '1105', '11', '4'];
    const ordenados = ordenarFilas(codigos, { campo: 'codigo', sentido: 'asc' }, { codigo: codigoDelPucParaOrdenar });
    expect(ordenados).toEqual(['1', '11', '1105', '110505', '2', '28', '4', '41', '4135']);
  });

  it('sin código queda vacío (va al final de la tabla)', () => {
    expect(codigoDelPucParaOrdenar(null)).toBeNull();
    expect(codigoDelPucParaOrdenar('  ')).toBeNull();
  });
});
