/**
 * Reabrir un mes cerrado: lo puro.
 *
 * 🔴 El caso que este archivo existe para clavar: con la contabilidad cerrada
 * al 31-dic, «reabrir diciembre» es `2025-12-01` y la frontera queda en el
 * 30-nov. Si `fronteraQueQueda` devolviera el mismo día que entró, el diálogo
 * diría «quedará cerrada hasta el 1 de diciembre» y diciembre seguiría
 * cerrado después de que alguien acaba de reabrirlo.
 */

import { describe, expect, it } from 'vitest';

import { diaLegible } from './fechas';
import {
  fronteraQueQueda,
  frasesDeLaReapertura,
  movimientoDeLaFrontera,
  primerDiaDelMesDe,
  problemaDeReapertura,
} from './reapertura';

describe('fronteraQueQueda', () => {
  it('🔴 «reabrir diciembre» (2025-12-01) deja la frontera en el 30 de noviembre', () => {
    expect(fronteraQueQueda('2025-12-01')).toBe('2025-11-30');
  });

  it('cruza el año hacia atrás sin inventar un 0 de enero', () => {
    expect(fronteraQueQueda('2026-01-01')).toBe('2025-12-31');
  });

  it('un día cualquiera del mes retrocede uno solo', () => {
    expect(fronteraQueQueda('2026-03-15')).toBe('2026-03-14');
  });

  it('marzo 1 en año bisiesto vuelve al 29 de febrero', () => {
    expect(fronteraQueQueda('2024-03-01')).toBe('2024-02-29');
  });

  it('sin fecha es reabrir todo: no hay frontera', () => {
    expect(fronteraQueQueda(null)).toBeNull();
    expect(fronteraQueQueda('')).toBeNull();
    expect(fronteraQueQueda('no es un día')).toBeNull();
  });
});

describe('primerDiaDelMesDe', () => {
  it('propone el primero del mes que está cerrado', () => {
    expect(primerDiaDelMesDe('2025-12-31')).toBe('2025-12-01');
  });

  it('sirve igual con el serializado del back', () => {
    expect(primerDiaDelMesDe('2025-12-31T00:00:00.000Z')).toBe('2025-12-01');
  });

  it('sin fecha cerrada no propone nada', () => {
    expect(primerDiaDelMesDe(null)).toBe('');
  });
});

describe('problemaDeReapertura', () => {
  const base = { cerradaHasta: '2025-12-31', hasta: '2025-12-01', motivo: 'Faltó causar una factura' };

  it('con motivo y una fecha hacia atrás no hay problema', () => {
    expect(problemaDeReapertura(base)).toBeNull();
  });

  it('sin fecha (reabrir todo) tampoco: el DTO acepta `hasta` ausente', () => {
    expect(problemaDeReapertura({ ...base, hasta: '' })).toBeNull();
  });

  it('sin nada cerrado lo dice antes de que el back conteste 409', () => {
    expect(problemaDeReapertura({ ...base, cerradaHasta: null })).toContain(
      'no hay nada que reabrir',
    );
  });

  it('el motivo es obligatorio y dos letras no alcanzan (MinLength(3))', () => {
    expect(problemaDeReapertura({ ...base, motivo: '  ab  ' })).toContain('bitácora');
    expect(problemaDeReapertura({ ...base, motivo: '' })).toContain('motivo');
  });

  it('🔴 una fecha POSTERIOR a la frontera no es una reapertura: es un cierre', () => {
    const problema = problemaDeReapertura({ ...base, hasta: '2026-02-01' });
    expect(problema).toContain('no mueve nada hacia atrás');
    expect(problema).toContain(diaLegible('2025-12-31'));
    expect(problema).toContain('Para cerrar más se usa el cierre');
  });

  it('el mismo día de la frontera SÍ mueve algo (la frontera retrocede uno)', () => {
    expect(problemaDeReapertura({ ...base, hasta: '2025-12-31' })).toBeNull();
  });
});

describe('frasesDeLaReapertura', () => {
  it('🔴 dice qué queda cerrado DESPUÉS, no lo que se escribió', () => {
    const frases = frasesDeLaReapertura('2025-12-01', '2025-12-31');
    expect(frases.resultado).toContain(`quedará cerrada hasta el ${diaLegible('2025-11-30')}`);
    // Y de paso desarma la confusión nombrando la fecha que NO es.
    expect(frases.resultado).toContain(`no hasta el ${diaLegible('2025-12-01')}`);
    expect(frases.desde).toContain(`volver a escribir desde el ${diaLegible('2025-12-01')}`);
    expect(frases.reabreTodo).toBe(false);
  });

  it('sin fecha avisa que no va a quedar ninguna fecha cerrada', () => {
    const frases = frasesDeLaReapertura('', '2025-12-31');
    expect(frases.reabreTodo).toBe(true);
    expect(frases.resultado).toContain('TODO');
    expect(frases.desde).toContain(diaLegible('2025-12-31'));
  });
});

describe('movimientoDeLaFrontera', () => {
  it('nombra las dos fechas', () => {
    expect(movimientoDeLaFrontera('2025-12-31T00:00:00.000Z', '2025-11-30T00:00:00.000Z')).toBe(
      `de ${diaLegible('2025-12-31')} a ${diaLegible('2025-11-30')}`,
    );
  });

  it('🔴 `null` no se pinta como un guion: se dice que no quedó nada cerrado', () => {
    expect(movimientoDeLaFrontera('2025-12-31', null)).toBe(
      `de ${diaLegible('2025-12-31')} a sin ninguna fecha cerrada`,
    );
  });
});
