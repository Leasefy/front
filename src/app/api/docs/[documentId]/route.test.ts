/**
 * `/api/docs/:documentId?app=…` — el proxy de documentos de una postulación.
 *
 * Auditoría de seguridad 23-09. Tres puertas que estaban abiertas:
 *  1. Los ids iban tal cual dentro de la ruta del back: `app=../../x` llevaba
 *     la petición a OTRA ruta.
 *  2. La URL que devolvía el back se bajaba desde el servidor sin mirar a
 *     dónde apuntaba (proxy abierto desde nuestro dominio).
 *  3. El `Content-Type` del archivo se servía tal cual desde nuestro origen, y
 *     `CandidateDrawer` lo abre como `blob:` — un HTML o un SVG correría como
 *     leasefy.co.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const APP = '11111111-1111-4111-8111-111111111111';
const DOC = '22222222-2222-4222-8222-222222222222';
const FIRMADA = 'https://proyecto.supabase.co/storage/v1/object/sign/docs/a.pdf?token=x';

function pedir(documentId: string, app: string | null, { auth = true } = {}) {
  const q = app === null ? '' : `?app=${encodeURIComponent(app)}`;
  const req = new NextRequest(`http://localhost/api/docs/${documentId}${q}`, {
    headers: auth ? { authorization: 'Bearer jwt' } : {},
  });
  return GET(req, { params: Promise.resolve({ documentId }) });
}

function backYArchivo(url: string, contentType: string) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ url }) })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': contentType }),
      arrayBuffer: async () => new TextEncoder().encode('<script>alert(1)</script>').buffer,
    });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/api/docs/:documentId', () => {
  it('sirve un PDF de Supabase inline, como antes', async () => {
    const f = backYArchivo(FIRMADA, 'application/pdf');
    const res = await pedir(DOC, APP);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('inline');
    expect(String(f.mock.calls[0][0])).toContain(`/applications/${APP}/documents/${DOC}/download`);
  });

  it.each([
    ['app con ../', DOC, '../../leases/x/payment-info?'],
    ['documentId con ../', '..%2F..%2Fusers', APP],
    ['app con ?', DOC, `${APP}?x=1`],
  ])('rechaza %s sin llamar al back', async (_caso, doc, app) => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = await pedir(doc, app);
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('sin token no le pide nada al back', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = await pedir(DOC, APP, { auth: false });
    expect(res.status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    ['otro dominio', 'https://evil.example/a.html'],
    ['http sin cifrar', 'http://proyecto.supabase.co/storage/v1/object/sign/a'],
    ['la red interna', 'https://169.254.169.254/latest/meta-data/'],
  ])('no baja una URL firmada que apunta a %s', async (_caso, url) => {
    const f = backYArchivo(url, 'application/pdf');
    const res = await pedir(DOC, APP);
    expect(res.status).toBe(502);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each([['text/html'], ['image/svg+xml'], ['text/html; charset=utf-8'], ['']])(
    'un archivo %s no se sirve como algo que el navegador ejecute',
    async (tipo) => {
      backYArchivo(FIRMADA, tipo);
      const res = await pedir(DOC, APP);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/octet-stream');
      expect(res.headers.get('content-disposition')).toBe('attachment');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    },
  );
});
