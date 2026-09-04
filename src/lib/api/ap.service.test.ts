/**
 * Cliente AP del agente (2026-09-02): validación de archivos antes de leer un
 * byte, el body exacto que viaja a `POST /ap/bills/extract` y a `POST
 * /ap/bills`, y los errores de la API traducidos al español.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const agentFetchMock = vi.fn();
vi.mock('./agent-fetch', () => ({ agentFetch: (...a: unknown[]) => agentFetchMock(...a) }));

import { apApi, ApUnavailableError, mediaTypeDeFactura, validarArchivosFactura } from './ap.service';
import { ApiError } from './client';

const AGENCY = '00000000-0000-0000-0000-000000000001';

function respuesta(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function archivo(nombre: string, tipo: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

beforeEach(() => {
  agentFetchMock.mockReset();
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://agent.test';
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AGENT_URL;
});

describe('mediaTypeDeFactura / validarArchivosFactura', () => {
  it('un tipo conocido gana; sin tipo decide la extensión; HEIC queda como vino', () => {
    expect(mediaTypeDeFactura({ name: 'a.jpg', type: 'image/jpeg' })).toBe('image/jpeg');
    expect(mediaTypeDeFactura({ name: 'a.PDF', type: '' })).toBe('application/pdf');
    expect(mediaTypeDeFactura({ name: 'a.png', type: 'application/octet-stream' })).toBe('image/png');
    expect(mediaTypeDeFactura({ name: 'a.heic', type: 'image/heic' })).toBe('image/heic');
  });

  it('devuelve la clave i18n de lo que está mal, o null', () => {
    expect(validarArchivosFactura([])).toBe('errorSinArchivos');
    expect(validarArchivosFactura([archivo('a.jpg', 'image/jpeg')])).toBeNull();
    expect(validarArchivosFactura([archivo('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')])).toBe('errorUnsupported');
    expect(validarArchivosFactura([{ name: 'a.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 }])).toBe('errorTooLarge');
    expect(
      validarArchivosFactura(Array.from({ length: 3 }, () => ({ name: 'a.jpg', type: 'image/jpeg', size: 7 * 1024 * 1024 }))),
    ).toBe('errorTotalTooLarge');
    expect(validarArchivosFactura(Array.from({ length: 11 }, () => archivo('a.jpg', 'image/jpeg')))).toBe('errorDemasiados');
  });
});

describe('apApi.extractBill', () => {
  it('manda los archivos en base64 con su tipo real a POST /ap/bills/extract y normaliza la respuesta', async () => {
    agentFetchMock.mockResolvedValue(
      respuesta(200, {
        success: true,
        factura: { proveedorNombre: 'X' },
        confidence: 0.8,
        sugerencia: { vendorId: null, invoiceNumber: '', amountCop: null },
        tokensUsed: 1,
        estimatedCostUsd: 0,
      }),
    );
    const res = await apApi.extractBill(AGENCY, [archivo('factura.jpg', 'image/jpeg', 4), archivo('p2.pdf', '', 4)]);

    expect(agentFetchMock).toHaveBeenCalledOnce();
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://agent.test/api/agency/${AGENCY}/ap/bills/extract`);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.credentials).toBeUndefined();
    const body = JSON.parse(init.body as string) as { documentos: Array<{ nombre: string; mediaType: string; base64: string }> };
    expect(body.documentos.map((d) => [d.nombre, d.mediaType])).toEqual([
      ['factura.jpg', 'image/jpeg'],
      ['p2.pdf', 'application/pdf'],
    ]);
    expect(body.documentos[0].base64).toBe('AAAAAA==');
    expect(body.documentos[0].base64).not.toContain('data:');

    // Listas nunca undefined para el componente.
    expect(res.items).toEqual([]);
    expect(res.conflictos).toEqual([]);
    expect(res.documentos).toEqual([]);
    expect(res.proveedor).toEqual({ match: null, candidatos: [] });
    expect(res.adjuntoUrl).toBeNull();
  });

  it('valida los archivos ANTES de leerlos (clave i18n como mensaje) y no llama a la red', async () => {
    await expect(apApi.extractBill(AGENCY, [archivo('a.heic', 'image/heic')])).rejects.toThrow('errorUnsupported');
    expect(agentFetchMock).not.toHaveBeenCalled();
  });

  it('sin NEXT_PUBLIC_AGENT_URL → ApUnavailableError', async () => {
    delete process.env.NEXT_PUBLIC_AGENT_URL;
    await expect(apApi.extractBill(AGENCY, [archivo('a.jpg', 'image/jpeg')])).rejects.toBeInstanceOf(ApUnavailableError);
  });

  it('un 400 del agente llega con SU mensaje en español; 413/429/403 se traducen', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(400, { success: false, error: '«a.pdf»: no es un PDF válido.' }));
    await expect(apApi.extractBill(AGENCY, [archivo('a.pdf', 'application/pdf')])).rejects.toThrow('«a.pdf»: no es un PDF válido.');

    agentFetchMock.mockResolvedValueOnce(new Response('too big', { status: 413 }));
    await expect(apApi.extractBill(AGENCY, [archivo('a.pdf', 'application/pdf')])).rejects.toThrow(/20 MB/);

    agentFetchMock.mockResolvedValueOnce(respuesta(429, { success: false, error: 'Demasiadas solicitudes. Intentá de nuevo en un momento.' }));
    await expect(apApi.extractBill(AGENCY, [archivo('a.pdf', 'application/pdf')])).rejects.toThrow(/Demasiadas/);

    agentFetchMock.mockResolvedValueOnce(respuesta(403, { success: false, error: 'Forbidden' }));
    const err = await apApi.extractBill(AGENCY, [archivo('a.pdf', 'application/pdf')]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).message).toMatch(/permiso/);
  });
});

describe('apApi.createBill / createVendor / listados', () => {
  it('createBill manda el body tal cual y devuelve la factura', async () => {
    agentFetchMock.mockResolvedValue(respuesta(201, { id: 'b1', status: 'pending_approval' }));
    const body = {
      vendorId: 'v1',
      invoiceNumber: 'FE-1',
      amountCop: 100,
      costCenterCode: '519500',
      issuedAt: '2026-09-01T12:00:00.000Z',
      dueDate: '2026-10-01T12:00:00.000Z',
      adjuntoUrl: 'https://s/x.pdf',
      concepto: 'algo',
    };
    const bill = await apApi.createBill(AGENCY, body);
    expect(bill.id).toBe('b1');
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://agent.test/api/agency/${AGENCY}/ap/bills`);
    expect(JSON.parse(init.body as string)).toEqual(body);
  });

  it('409 del alta y 400 por centro de costo se explican en español', async () => {
    const body = { vendorId: 'v1', invoiceNumber: 'FE-1', amountCop: 1, costCenterCode: 'x', issuedAt: 'a', dueDate: 'b' };
    agentFetchMock.mockResolvedValueOnce(respuesta(409, { error: 'Bill with this invoiceNumber already exists' }));
    await expect(apApi.createBill(AGENCY, body)).rejects.toThrow(/Ya hay una factura/);
    agentFetchMock.mockResolvedValueOnce(respuesta(400, { error: 'Invalid costCenterCode', validCodes: [] }));
    await expect(apApi.createBill(AGENCY, body)).rejects.toThrow(/centro de costo/);
  });

  it('createVendor: 409 = NIT repetido; listVendors/listCostCenters desenvuelven la lista', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(409, { error: 'Vendor already exists' }));
    await expect(apApi.createVendor(AGENCY, { name: 'X', documentNumber: '12345' })).rejects.toThrow(/NIT o cédula/);

    agentFetchMock.mockResolvedValueOnce(respuesta(200, { vendors: [{ id: 'v1' }] }));
    expect(await apApi.listVendors(AGENCY)).toEqual([{ id: 'v1' }]);
    agentFetchMock.mockResolvedValueOnce(respuesta(200, { costCenters: [{ code: '519500', name: 'G' }] }));
    expect(await apApi.listCostCenters(AGENCY)).toEqual([{ code: '519500', name: 'G' }]);
    expect(agentFetchMock.mock.calls[1][0]).toBe(`http://agent.test/api/agency/${AGENCY}/ap/vendors`);
    expect(agentFetchMock.mock.calls[2][0]).toBe(`http://agent.test/api/agency/${AGENCY}/ap/cost-centers`);
  });
});
