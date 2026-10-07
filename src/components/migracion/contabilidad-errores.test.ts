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

/*
 * Sistema de errores (02-10-2026): el traductor del módulo se queda con SUS
 * códigos y delega lo demás en `mensajeParaLaPersona`, con la regla de oro.
 * Antes devolvía `e.message` crudo: un 500 decía «Error interno del servidor»
 * y un `TypeError: Failed to fetch` llegaba tal cual a la pantalla.
 */
describe('mensajeDeContabilidad · la regla de oro', () => {
  it('🔴 un 5xx dice «de nuestro lado», con lo que se estaba haciendo y la referencia', () => {
    const e = new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Error interno del servidor',
      referencia: 'a1b2c3d4',
    });
    const texto = mensajeDeContabilidad(e, 'No se pudo cerrar el período.');
    expect(texto).toMatch(/^No pudimos cerrar el período: algo falló de nuestro lado/);
    expect(texto).toContain('a1b2c3d4');
    expect(texto).not.toContain('Error interno del servidor');
  });

  it('una acción explícita gana sobre la que sale del respaldo', () => {
    const e = new ApiError(502, 'Bad Gateway', undefined, { statusCode: 502 });
    expect(mensajeDeContabilidad(e, 'No se pudo.', 'armar el lote de egresos')).toMatch(
      /^No pudimos armar el lote de egresos: algo falló de nuestro lado/,
    );
  });

  it('🔴 sin respuesta (status 0) habla de la conexión, y sólo ahí', () => {
    const texto = mensajeDeContabilidad(new ApiError(0, 'Failed to fetch'), RESPALDO);
    expect(texto).toMatch(/conexión/);
    expect(texto).not.toContain('Failed to fetch');
  });

  it('un `TypeError` de red del navegador también es «sin respuesta»', () => {
    expect(mensajeDeContabilidad(new TypeError('Failed to fetch'), RESPALDO)).toMatch(/conexión/);
  });

  it('un 400 de validación dice lo que mandó el back, con todos sus motivos', () => {
    const e = new ApiError(400, ['La fecha no es un día real.', 'Falta la descripción.'], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: ['La fecha no es un día real.', 'Falta la descripción.'],
      campos: [],
    });
    expect(mensajeDeContabilidad(e, RESPALDO)).toBe('La fecha no es un día real. · Falta la descripción.');
  });

  it('los códigos de la contabilidad siguen con su frase', () => {
    const e = new ApiError(400, 'descuadrado', 'ASIENTO_DESCUADRADO', { code: 'ASIENTO_DESCUADRADO' });
    expect(mensajeDeContabilidad(e, RESPALDO)).toBe(
      'El asiento no cuadra: los débitos tienen que ser iguales a los créditos.',
    );
  });

  it('el 403 sin código (el guard de escritura) dice quién puede mover la contabilidad', () => {
    const e = new ApiError(403, 'Forbidden');
    expect(mensajeDeContabilidad(e, RESPALDO)).toMatch(/administrador o el contador/);
  });

  it('un 403 CON código propio dice su mensaje (no el del guard de escritura)', () => {
    const e = new ApiError(
      403,
      'Tu rol no ve la contabilidad. Si la necesitas, pídele a un administrador el permiso de ver reportes.',
      'SIN_ACCESO_A_CONTABILIDAD',
      { statusCode: 403, code: 'SIN_ACCESO_A_CONTABILIDAD' },
    );
    expect(mensajeDeContabilidad(e, RESPALDO)).toMatch(/Tu rol no ve la contabilidad/);
  });

  it('un error vacío cae al respaldo, no a un texto en blanco', () => {
    expect(mensajeDeContabilidad(new ApiError(409, ''), RESPALDO)).toBe(RESPALDO);
  });
});
