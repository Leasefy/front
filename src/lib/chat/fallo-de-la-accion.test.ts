/**
 * Lo que dice una acción del chat cuando falla (02-10-2026): siempre el
 * traductor, nunca «403», «approve 500», «execute action 409» ni el inglés
 * del cuerpo viejo del micro.
 */
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { falloDelMicro } from '@/lib/api/fallo-del-micro';
import { mensajeDelFalloDeLaAccion, SESION_VENCIDA } from './fallo-de-la-accion';

const TEXTOS = {
  accion: 'confirmar la acción',
  porDefecto: 'No se pudo confirmar. Prueba de nuevo en un momento.',
  sinPermiso: 'Tu rol no puede confirmar esta acción.',
};

/** Lo que nunca puede llegar a la persona. */
const CRUDO = /\b[1-5]\d\d\b|ai-hub|approve|execute action|certify|Forbidden|Internal Server Error|Unauthorized/i;

const respuesta = (status: number, cuerpo?: unknown) =>
  cuerpo === undefined ? new Response(null, { status }) : new Response(JSON.stringify(cuerpo), { status });

describe('mensajeDelFalloDeLaAccion', () => {
  it('un 4xx con el sobre dice lo que escribió el back', async () => {
    const e = await falloDelMicro(
      respuesta(409, { statusCode: 409, code: 'YA_RESUELTA', message: 'Esa propuesta ya se resolvió.' }),
    );
    expect(mensajeDelFalloDeLaAccion(e, TEXTOS)).toBe('Esa propuesta ya se resolvió.');
  });

  it('un 403 del cuerpo viejo (`error` en inglés) dice quién puede, nunca «Forbidden»', async () => {
    const e = await falloDelMicro(
      respuesta(403, { error: 'Forbidden — tu rol sólo puede consultar, no ejecutar acciones', code: 'ROL_SOLO_CONSULTA' }),
    );
    const texto = mensajeDelFalloDeLaAccion(e, TEXTOS);
    expect(texto).toBe(TEXTOS.sinPermiso);
    expect(texto).not.toMatch(CRUDO);
  });

  it('un 403 sin texto propio y sin `sinPermiso`: lo de por defecto', async () => {
    const e = await falloDelMicro(respuesta(403));
    expect(mensajeDelFalloDeLaAccion(e, { accion: TEXTOS.accion, porDefecto: TEXTOS.porDefecto })).toBe(
      TEXTOS.porDefecto,
    );
  });

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    const e = await falloDelMicro(
      respuesta(500, {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    );
    const texto = mensajeDelFalloDeLaAccion(e, TEXTOS);
    expect(texto).toContain('No pudimos confirmar la acción: algo falló de nuestro lado');
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(CRUDO);
  });

  it('un 5xx sin cuerpo también es «de nuestro lado», sin inventar referencia', async () => {
    const e = await falloDelMicro(respuesta(500));
    const texto = mensajeDelFalloDeLaAccion(e, TEXTOS);
    expect(texto).toContain('algo falló de nuestro lado');
    expect(texto).not.toMatch(CRUDO);
  });

  it('«la conexión» sólo cuando el pedido no salió', () => {
    expect(mensajeDelFalloDeLaAccion(new TypeError('Failed to fetch'), TEXTOS)).toMatch(/conexi[oó]n/);
    expect(mensajeDelFalloDeLaAccion(new ApiError(500, ''), TEXTOS)).not.toMatch(/conexi[oó]n/);
  });

  it('un error del front (sin respuesta HTTP) nunca muestra su texto técnico', () => {
    for (const e of [new Error('Proposal not found'), new Error('NEXT_PUBLIC_AGENT_URL not configured'), new Error('ai-hub approval 403')]) {
      expect(mensajeDelFalloDeLaAccion(e, TEXTOS)).toBe(TEXTOS.porDefecto);
    }
  });

  it('un 401 sin texto: la sesión', async () => {
    const e = await falloDelMicro(respuesta(401, { error: 'Unauthorized — invalid token' }));
    expect(mensajeDelFalloDeLaAccion(e, TEXTOS)).toBe(SESION_VENCIDA);
  });

  it('el 403 del segundo factor no es «no tienes permiso»', async () => {
    const e = await falloDelMicro(
      respuesta(403, {
        error: 'Tu rol exige segundo factor. Actívalo en Configuración → Seguridad y vuelve a entrar.',
        code: 'SEGUNDO_FACTOR_REQUERIDO',
      }),
    );
    const texto = mensajeDelFalloDeLaAccion(e, TEXTOS);
    expect(texto).toContain('segundo factor');
    expect(texto).not.toBe(TEXTOS.sinPermiso);
  });
});
