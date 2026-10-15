/**
 * 🔴 QA de Portofino (14-10-2026): el aviso del canon por confirmar en la
 * revisión de inmuebles contaba como «se crean» también las filas que todavía
 * están por revisar. Ahora las listas para crear van aparte.
 */
import { describe, it, expect } from 'vitest';
import { fraseDelCanonPorConfirmar } from './StepConfirmImport';

describe('fraseDelCanonPorConfirmar', () => {
  it('separa las listas para crear de las que faltan por revisar', () => {
    expect(fraseDelCanonPorConfirmar(11, 4)).toBe(
      '4 inmuebles listos para crear no traen canon: se crean con el canon por confirmar. Otros 7 inmuebles sin canon están entre los que faltan por revisar.',
    );
  });

  it('en singular', () => {
    expect(fraseDelCanonPorConfirmar(2, 1)).toBe(
      '1 inmueble listo para crear no trae canon: se crea con el canon por confirmar. Otro sin canon está entre los que faltan por revisar.',
    );
  });

  it('todas por revisar, o todas listas', () => {
    expect(fraseDelCanonPorConfirmar(3, 0)).toBe('3 inmuebles sin canon están entre los que faltan por revisar.');
    expect(fraseDelCanonPorConfirmar(3, 3)).toBe(
      '3 inmuebles listos para crear no traen canon: se crean con el canon por confirmar.',
    );
  });

  it('sin el conteo de las listas (un back anterior), la frase de siempre', () => {
    expect(fraseDelCanonPorConfirmar(11, null)).toBe(
      '11 inmuebles no traen canon: se crean con el canon por confirmar.',
    );
  });
});
