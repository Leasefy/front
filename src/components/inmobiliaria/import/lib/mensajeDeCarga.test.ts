/**
 * mensajeDeCarga — los códigos del lote con su frase, y TODO lo demás por el
 * traductor de la plataforma (02-10-2026): «conexión» sólo sin respuesta, un
 * 5xx dice «de nuestro lado» con la referencia, un 400 dice qué está mal.
 */
import { describe, it, expect } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { mensajeDeCarga, MENSAJE_SESION_TERMINADA, codigoDeLote } from './mensajeDeCarga';

describe('mensajeDeCarga', () => {
  it('un código del lote dice qué botón tocar, no el texto crudo del back', () => {
    const e = new ApiError(409, 'Lote abc en proceso (job 123)', 'LOTE_EN_PROCESO');
    expect(mensajeDeCarga(e, 'x')).toBe(
      'Esta carga se está procesando en este momento. Espera a que termine y vuelve a intentarlo.',
    );
  });

  it('la sesión muerta dice que lo subido está guardado', () => {
    expect(mensajeDeCarga(new ApiError(401, 'jwt', 'SESSION_TERMINATED'), 'x')).toBe(
      MENSAJE_SESION_TERMINADA,
    );
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, nunca el volcado ni la conexión', () => {
    const e = new ApiError(500, 'Invalid `prisma.property.create()` invocation', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'Invalid `prisma.property.create()` invocation',
      referencia: 'ab12cd34',
    });
    const texto = mensajeDeCarga(e, 'No pudimos subir el archivo.', 'subir el archivo');
    expect(texto).toMatch(/^No pudimos subir el archivo: algo falló de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/prisma|conexi[oó]n/i);
  });

  it('sin respuesta (status 0) — ahí sí se habla de la conexión', () => {
    const e = new ApiError(0, 'No pudimos conectarnos al servidor. (Failed to fetch)');
    expect(mensajeDeCarga(e, 'x')).toMatch(/conexión/);
  });

  it('un 400 con varios motivos los dice todos', () => {
    const e = new ApiError(400, ['El canon debe ser mayor que cero.', 'Falta la dirección.'], 'DATOS_INVALIDOS');
    expect(mensajeDeCarga(e, 'x')).toBe('El canon debe ser mayor que cero. · Falta la dirección.');
  });

  it('un error de JavaScript no llega a la pantalla: el mensaje por defecto', () => {
    expect(mensajeDeCarga(new TypeError('x is not a function'), 'No pudimos subir el archivo.')).toBe(
      'No pudimos subir el archivo.',
    );
  });

  it('un código que no es del lote (ni del prototipo de un objeto) no se confunde con uno', () => {
    expect(codigoDeLote(new ApiError(409, 'x', 'constructor'))).toBeNull();
    expect(codigoDeLote(new ApiError(409, 'x', 'NADA_PARA_CREAR'))).toBe('NADA_PARA_CREAR');
  });
});
