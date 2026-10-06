/**
 * QA-FACT-CONTA-95 r2 · CB-B-19 (= CB-02): la reversa de la causación de un
 * cobro anulado se lee «Cobro anulado» en el libro (no «Manual» ni «Reversa»);
 * la de un recibo anulado, «Recibo anulado». Una reversa a secas sigue «Reversa».
 */
import { describe, expect, it } from 'vitest';

import { nombreDelOrigen } from './asientos';

describe('CB-B-19 · el origen de la reversa de un cobro anulado', () => {
  it('«Cobro anulado» cuando el back dice que la reversa la hizo la anulación del cobro', () => {
    expect(
      nombreDelOrigen({
        origen: 'MANUAL',
        origenLegible: { tipo: 'REVERSA', rotulo: 'Cobro anulado · reversa del asiento N.º 132', id: 'as-132', anula: 'COBRO' },
      }),
    ).toBe('Cobro anulado');
  });

  it('«Recibo anulado» para la reversa de un recibo anulado', () => {
    expect(
      nombreDelOrigen({
        origen: 'MANUAL',
        origenLegible: { tipo: 'REVERSA', rotulo: 'Recibo anulado · reversa del asiento N.º 41', id: 'as-41', anula: 'RECIBO_DE_CAJA' },
      }),
    ).toBe('Recibo anulado');
  });

  it('una reversa sin anulación detrás sigue siendo «Reversa», nunca «Manual»', () => {
    expect(
      nombreDelOrigen({ origen: 'MANUAL', origenLegible: { tipo: 'REVERSA', rotulo: 'Reversa del asiento N.º 140', id: 'as-140' } }),
    ).toBe('Reversa');
  });
});
