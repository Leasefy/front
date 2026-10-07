/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026): el descuadre del asiento de
 * apertura con centavos escribe los centavos enteros.
 *
 * Visto en el navegador: débitos $1.234.567,89 y créditos $1.234.567,80 →
 * «No cuadra: faltan $0,09 en créditos… (débitos $1.234.567,89, créditos
 * $1.234.567,8)». La cifra se cortaba en un decimal.
 */
import { describe, expect, it } from 'vitest';

import { fraseDelDescuadre } from './asiento-de-apertura';

describe('fraseDelDescuadre con centavos (QA-MIGRACION-95)', () => {
  it('80 centavos se escriben «,80», nunca «,8»', () => {
    expect(fraseDelDescuadre({ debitos: 1234567.89, creditos: 1234567.8, diferencia: 0.09 })).toBe(
      'No cuadra: faltan $0,09 en créditos para que los dos totales sean iguales (débitos $1.234.567,89, créditos $1.234.567,80).',
    );
  });
  it('sin centavos, como siempre', () => {
    expect(fraseDelDescuadre({ debitos: 1_606_000, creditos: 695_000, diferencia: 911_000 })).toContain('créditos $695.000).');
  });
});
