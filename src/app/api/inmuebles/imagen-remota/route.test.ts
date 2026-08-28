/**
 * route.test.ts — T-0036: la ruta debía aceptar por Content-Type y ahora
 * decide por los bytes reales. El caso disparador: portofinopr.arrendasoft.co
 * sirve JPEGs genuinos rotulados `application/octet-stream`; antes del fix
 * esos 200 se rechazaban con `tipo_inesperado`. La red no se toca: se mockea
 * `node:dns/promises` (usado por la guardia SSRF de `traer-url.ts`) y
 * `globalThis.fetch`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('node:dns/promises', () => {
  // TEST-NET-3, pública para esDireccionPrivada. `default` va porque Vite
  // interopera el built-in de Node como CJS y algunos import paths lo piden.
  const lookup = vi.fn().mockResolvedValue([{ address: '203.0.113.10' }]);
  return { lookup, default: { lookup } };
});

import { lookup } from 'node:dns/promises';
import { GET } from './route';

function streamDe(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function respuestaDe(bytes: Uint8Array, contentType: string): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': contentType }),
    body: streamDe(bytes),
  } as unknown as Response;
}

function requestPara(url: string) {
  return new NextRequest(`http://localhost:3001/api/inmuebles/imagen-remota?url=${encodeURIComponent(url)}`);
}

// Los 12 bytes reales de la foto de portofinopr.arrendasoft.co que el
// Orchestrator midió contra el origen vivo.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const HTML = new TextEncoder().encode('<!DOCTYPE html><html><body>No soy una foto</body></html>');

beforeEach(() => {
  vi.mocked(lookup).mockResolvedValue([{ address: '203.0.113.10' }] as never);
});

describe('GET /api/inmuebles/imagen-remota', () => {
  it('acepta un JPEG real aunque el origen lo etiquete application/octet-stream', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(respuestaDe(JPEG, 'application/octet-stream')) as unknown as typeof fetch;

    const res = await GET(requestPara('https://portofinopr.arrendasoft.co/img/fotos/foto.jpeg'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
  });

  it('acepta un PNG real etiquetado application/octet-stream', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(respuestaDe(PNG, 'application/octet-stream')) as unknown as typeof fetch;

    const res = await GET(requestPara('https://cdn.example.com/foto.png'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('acepta un WebP real etiquetado application/octet-stream', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(respuestaDe(WEBP, 'application/octet-stream')) as unknown as typeof fetch;

    const res = await GET(requestPara('https://cdn.example.com/foto.webp'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
  });

  it('rechaza HTML aunque el origen lo etiquete image/jpeg — gana el byte, no el header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(respuestaDe(HTML, 'image/jpeg')) as unknown as typeof fetch;

    const res = await GET(requestPara('https://cdn.example.com/pagina-disfrazada-de-foto'));

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toBe('formato_no_soportado');
  });

  it('rechaza un cuerpo vacío sin explotar', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      respuestaDe(new Uint8Array(0), 'application/octet-stream'),
    ) as unknown as typeof fetch;

    const res = await GET(requestPara('https://cdn.example.com/vacio'));

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toBe('formato_no_soportado');
  });

  it('sigue rechazando un Content-Type totalmente ajeno antes de sniffear (guarda de header intacta)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaDe(HTML, 'text/html'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await GET(requestPara('https://cdn.example.com/pagina.html'));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('tipo_inesperado');
  });

  it('sigue rechazando un destino que resuelve a una red privada (guarda SSRF intacta)', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: '10.0.0.5' }] as never);
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    const res = await GET(requestPara('https://interno.example.com/foto.jpg'));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('destino_privado');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('devuelve falta_url cuando no llega el parámetro', async () => {
    const res = await GET(new NextRequest('http://localhost:3001/api/inmuebles/imagen-remota'));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('falta_url');
  });
});
