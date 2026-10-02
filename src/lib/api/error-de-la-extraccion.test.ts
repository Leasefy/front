import { describe, it, expect, vi, afterEach } from 'vitest';
import { errorDeLaExtraccion } from './error-de-la-extraccion';
import { ApiError } from './client';
import { extractTerceroFromFiles } from './terceros-extract.service';
import { extractPropertyFromCapture } from './property-capture.service';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

function respuesta(status: number, cuerpo: unknown): Response {
  return new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('errorDeLaExtraccion — el sobre del micro llega entero al traductor', () => {
  it('un 400 DATOS_INVALIDOS conserva los `campos`, que van a su campo', async () => {
    const e = await errorDeLaExtraccion(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Elige un formato de audio válido.'],
        campos: [{ campo: 'audioMediaType', regla: 'opcion', mensaje: 'Elige un formato de audio válido.' }],
        success: false,
        error: 'Elige un formato de audio válido.',
      }),
    );
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(400);
    expect(e.code).toBe('DATOS_INVALIDOS');
    expect(camposDelError(e)).toEqual([
      { campo: 'audioMediaType', regla: 'opcion', mensaje: 'Elige un formato de audio válido.' },
    ]);
  });

  it('🔴 un 500 dice «de nuestro lado» con la referencia, no «conexión»', async () => {
    const e = await errorDeLaExtraccion(
      respuesta(500, {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'No pudimos leer el documento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
        referencia: 'ab12cd34',
        success: false,
      }),
    );
    const texto = mensajeParaLaPersona(e, { accion: 'leer el documento' });
    expect(texto).toMatch(/de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('un micro anterior al sobre (sólo `error` en texto) sigue diciendo su frase', async () => {
    const e = await errorDeLaExtraccion(respuesta(400, { success: false, error: '«x.heic»: formato no soportado.' }));
    expect(mensajeParaLaPersona(e)).toBe('«x.heic»: formato no soportado.');
  });

  it('un cuerpo que no es JSON no revienta: queda el status', async () => {
    const e = await errorDeLaExtraccion(respuesta(502, '<html>Bad gateway</html>'));
    expect(e.status).toBe(502);
    expect(mensajeParaLaPersona(e)).not.toMatch(/<html>/);
  });
});

/**
 * Los dos servicios que llaman al micro con `fetch` directo. Antes hacían
 * `new ApiError(status, body.error)`: el `code`, los `campos` y la
 * `referencia` del sobre se perdían, y un 5xx no podía decir con qué
 * referencia escribirnos.
 */
describe('los servicios de extracción con IA dejan pasar el sobre entero', () => {
  const urlAntes = process.env.NEXT_PUBLIC_AGENT_URL;
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_AGENT_URL = urlAntes;
  });

  function micro(status: number, cuerpo: unknown) {
    process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.prueba';
    const fetchMock = vi.fn().mockResolvedValue(respuesta(status, cuerpo));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('terceros: un 500 del micro llega con su referencia', async () => {
    micro(500, {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      message: 'No pudimos leer el documento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
      referencia: 'cafe1234',
      success: false,
      error: 'No pudimos leer el documento: algo falló de nuestro lado.',
    });
    const archivo = new File(['hola'], 'cedula.png', { type: 'image/png' });
    const e = await extractTerceroFromFiles([archivo]).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).code).toBe('ERROR_INTERNO');
    expect(mensajeParaLaPersona(e)).toContain('cafe1234');
  });

  it('captura del inmueble: un 400 con `campos` los conserva', async () => {
    micro(400, {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      message: ['Elige un formato de audio válido.'],
      campos: [{ campo: 'audioMediaType', regla: 'opcion', mensaje: 'Elige un formato de audio válido.' }],
      success: false,
      error: 'Elige un formato de audio válido.',
    });
    const audio = new Blob(['x'], { type: 'audio/webm' });
    const e = await extractPropertyFromCapture(audio, []).catch((x: unknown) => x);
    expect((e as ApiError).code).toBe('DATOS_INVALIDOS');
    expect(camposDelError(e).map((c) => c.campo)).toEqual(['audioMediaType']);
  });
});
