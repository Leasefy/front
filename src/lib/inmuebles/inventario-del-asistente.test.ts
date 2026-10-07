import { describe, expect, it } from 'vitest';

import { itemsDelInventarioDelAsistente } from './inventario-del-asistente';

describe('itemsDelInventarioDelAsistente (QA con avatares 04-10)', () => {
  it('un renglón sin nombre no es un ítem: se omite', () => {
    expect(
      itemsDelInventarioDelAsistente([
        { id: 'item-1', name: '  ', quantity: 1, condition: 'good' },
        { id: 'item-2', name: ' Nevera ', quantity: 1, condition: 'good', notes: '  ' },
      ]),
    ).toEqual([{ id: 'item-2', name: 'Nevera', quantity: 1, condition: 'good' }]);
  });

  it('la cantidad queda entre 1 y 999 y el estado es uno conocido (lo que acepta el back)', () => {
    const [a, b] = itemsDelInventarioDelAsistente([
      { id: 'a', name: 'Sillas', quantity: 0, condition: 'excellent', notes: ' rayón ' },
      { id: 'b', name: 'Cama', quantity: 5000, condition: 'raro' as never },
    ]);
    expect(a).toEqual({ id: 'a', name: 'Sillas', quantity: 1, condition: 'excellent', notes: 'rayón' });
    expect(b.quantity).toBe(999);
    expect(b.condition).toBe('good');
  });

  it('sin ítems, nada que guardar', () => {
    expect(itemsDelInventarioDelAsistente(undefined)).toEqual([]);
  });
});
