import { describe, expect, it } from 'vitest';
import { explicacionEnLimpio, sinMayusculasDeEnfasis, sinTerminosEnCero } from './cuadre-en-limpio';

describe('las frases del Cuadre, como las dice la casa (revisora r24, Cuadre #4 y #5)', () => {
  it('un término en cero no se nombra en la fórmula', () => {
    expect(
      sinTerminosEnCero('No es plata de terceros: comisión $ 200.000 + IVA de la comisión $ 38.000 − retenciones de la comisión $ 0 + intereses de mora cobrados $0 + gastos de cobranza cobrados $ 0, de los meses que el inquilino ya pagó.'),
    ).toBe('No es plata de terceros: comisión $ 200.000 + IVA de la comisión $ 38.000, de los meses que el inquilino ya pagó.');
  });
  it('no toca un cero con centavos, ni un monto que empieza en otra cifra, ni un total', () => {
    const f = 'comisión $ 200.000 − retenciones $ 0,50 + intereses $ 22.000 = $ 0';
    expect(sinTerminosEnCero(f)).toBe(f);
  });
  it('las mayúsculas de énfasis van en minúscula; las siglas no', () => {
    expect(sinMayusculasDeEnfasis('es plata TUYA, NO de terceros: EXACTAMENTE la comisión del IVA')).toBe(
      'es plata tuya, no de terceros: exactamente la comisión del IVA',
    );
  });
  it('las dos a la vez', () => {
    expect(explicacionEnLimpio('Da MENOS: − retenciones $ 0 falta.')).toBe('Da menos: falta.');
  });
});
