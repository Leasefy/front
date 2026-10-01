/**
 * contabilidad-errores.test.ts — el 409 de la apertura dice qué hacer.
 *
 * T-0125: una segunda apertura con la misma fecha de corte y OTROS saldos ya
 * no se escribe; el back responde 409 `APERTURA_YA_REGISTRADA` con el número y
 * la fecha del asiento que ya está. La pantalla tiene que decir cuál es y qué
 * hacer (reversarlo y registrar el nuevo), no un «Error 409».
 */

import { describe, it, expect } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { mensajeDeContabilidad } from './contabilidad-errores';

const RESPALDO = 'No pudimos registrar el asiento.';

function aperturaYaRegistrada(over: Record<string, unknown> = {}) {
  const cuerpo = {
    statusCode: 409,
    code: 'APERTURA_YA_REGISTRADA',
    message:
      'Ya hay un asiento de apertura con fecha de corte 2026-01-31: el N.º 12, con otros saldos. ' +
      'Los asientos no se editan: si quedó mal, reversa ese asiento y registra el nuevo.',
    details: { asientoId: 'as-12', numero: 12, fecha: '2026-01-31' },
    ...over,
  };
  return new ApiError(409, cuerpo.message as string, 'APERTURA_YA_REGISTRADA', cuerpo);
}

describe('mensajeDeContabilidad · APERTURA_YA_REGISTRADA', () => {
  it('nombra el asiento que ya está (número y fecha) y dice cómo corregirlo', () => {
    const texto = mensajeDeContabilidad(aperturaYaRegistrada(), RESPALDO);
    expect(texto).toContain('N.º 12');
    expect(texto).toContain('2026');
    expect(texto).toMatch(/revers/i);
    expect(texto).not.toBe(RESPALDO);
    expect(texto).not.toContain('409');
  });

  it('sin `details` cae al mensaje del back, que es autosuficiente', () => {
    const e = aperturaYaRegistrada({ details: undefined });
    const texto = mensajeDeContabilidad(e, RESPALDO);
    expect(texto).toContain('reversa ese asiento');
  });

  it('sin `details` ni mensaje, usa un texto propio y no el respaldo genérico', () => {
    const e = new ApiError(409, 'Error 409', 'APERTURA_YA_REGISTRADA', { statusCode: 409 });
    const texto = mensajeDeContabilidad(e, RESPALDO);
    expect(texto).toMatch(/apertura/i);
    expect(texto).toMatch(/revers/i);
  });

  it('un `details` mal formado no rompe: se ignora', () => {
    const e = aperturaYaRegistrada({ details: { numero: 'doce' } });
    expect(() => mensajeDeContabilidad(e, RESPALDO)).not.toThrow();
    expect(mensajeDeContabilidad(e, RESPALDO)).toMatch(/revers/i);
  });
});
