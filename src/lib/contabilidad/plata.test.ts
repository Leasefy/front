/**
 * CB-17 / CB-09 (QA de Contabilidad, 03-10-2026): la plata de Contabilidad con
 * UN formato — «$ 1.234.567» y «−$ 119.100» —, también la que llega escrita
 * dentro de una frase del back, y sin emojis al lado del ícono del DS.
 */
import { describe, expect, it } from 'vitest';

import { plata, plataEnElTexto, sinEmojis, textoDelBack } from './plata';

describe('plata', () => {
  it('con espacio después del símbolo y el menos tipográfico adelante', () => {
    expect(plata(80330850)).toBe('$\u00a080.330.850');
    expect(plata(-119100)).toBe('−$\u00a0119.100');
    expect(plata(0)).toBe('$\u00a00');
  });
});

describe('plataEnElTexto', () => {
  it('🔴 «$-119.100» y «$8.757.000» del back salen con el formato de la casa', () => {
    expect(
      plataEnElTexto('Comisiones (operación $8.757.000 contra libro $358.000); Costos (operación $0 contra libro $-119.100).'),
    ).toBe('Comisiones (operación $ 8.757.000 contra libro $ 358.000); Costos (operación $ 0 contra libro −$ 119.100).');
  });

  it('el menos antes del símbolo también; lo que ya venía bien queda igual', () => {
    expect(plataEnElTexto('ni de -$2.000.000.000')).toBe('ni de −$ 2.000.000.000');
    expect(plataEnElTexto('2 movimientos por $ 205.830')).toBe('2 movimientos por $ 205.830');
  });

  it('no toca números que no son plata', () => {
    expect(plataEnElTexto('El 1647 tiene 5 filas del 2026')).toBe('El 1647 tiene 5 filas del 2026');
  });
});

describe('sinEmojis', () => {
  it('🔴 quita el 🔴 del principio y el del medio', () => {
    expect(sinEmojis('🔴 2 rubros dicen una cosa')).toBe('2 rubros dicen una cosa');
    expect(sinEmojis('1. 🔴 ¿Los giros van en el 1001?')).toBe('1. ¿Los giros van en el 1001?');
    expect(sinEmojis('⚠️ Ojo')).toBe('Ojo');
  });

  it('textoDelBack hace las dos cosas', () => {
    expect(textoDelBack('🔴 2 movimientos por $205.830 no tienen tercero')).toBe(
      '2 movimientos por $ 205.830 no tienen tercero',
    );
  });
});
