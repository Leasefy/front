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
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';

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

    agentFetchMock.mockResolvedValueOnce(respuesta(429, { success: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }));
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

  /*
   * 02-10-2026 (tanda 2 del sistema de errores): el cuerpo ENTERO viaja en
   * `detalle`, así el traductor ve los `campos` de un 400 y la `referencia` de
   * un 5xx. Y se lee el `message` del sobre, no sólo el `error` de antes.
   */
  it('el sobre de error del micro llega entero al ApiError (campos, referencia y code)', async () => {
    const body = { vendorId: 'v1', invoiceNumber: 'FE-1', amountCop: 1, costCenterCode: 'x', issuedAt: 'a', dueDate: 'b' };
    const campos = [{ campo: 'amountCop', regla: 'minimo', mensaje: 'El total debe ser mayor que cero.' }];
    agentFetchMock.mockResolvedValueOnce(
      respuesta(400, { statusCode: 400, code: 'DATOS_INVALIDOS', message: ['El total debe ser mayor que cero.'], campos }),
    );
    const de400 = await apApi.createBill(AGENCY, body).catch((e: unknown) => e);
    expect(de400).toBeInstanceOf(ApiError);
    expect((de400 as ApiError).code).toBe('DATOS_INVALIDOS');
    expect((de400 as ApiError).message).toBe('El total debe ser mayor que cero.');
    expect((de400 as ApiError).detalle?.campos).toEqual(campos);

    agentFetchMock.mockResolvedValueOnce(
      respuesta(500, { statusCode: 500, code: 'LECTURA_DE_FACTURA_FALLIDA', message: 'No se pudo leer la factura.', referencia: 'abcd1234' }),
    );
    const de500 = await apApi.extractBill(AGENCY, [archivo('f.jpg', 'image/jpeg')]).catch((e: unknown) => e);
    expect((de500 as ApiError).status).toBe(500);
    expect((de500 as ApiError).detalle?.referencia).toBe('abcd1234');
  });
});

/*
 * 🔴 02-10-2026 (Nico, ola «seguimiento 4»): con el sobre de error del micro
 * (`{ statusCode, code, message }`) se muestra SU `message`, no la frase fija
 * por status. Sin sobre, la frase de siempre.
 */
describe('apApi — la frase del sobre del micro gana a la frase fija', () => {
  const body = { vendorId: 'v1', invoiceNumber: 'FE-1', amountCop: 1, costCenterCode: 'x', issuedAt: 'a', dueDate: 'b' };

  it.each([
    [401, 'SESION_NO_VERIFICADA', 'No pudimos verificar tu sesión. Vuelve a entrar e intenta de nuevo.'],
    [403, 'SIN_PERMISO', 'Tu rol no puede ver los proveedores. Pídele a un administrador de tu inmobiliaria que te dé acceso.'],
    [409, 'FACTURA_REPETIDA', 'Ya registraste la factura FE-1 de este proveedor el 1 de septiembre.'],
    [413, 'ARCHIVOS_MUY_GRANDES', 'Los archivos pesan 31 MB y el máximo es 20 MB entre todos.'],
    [503, 'SIN_BASE', 'No pudimos guardar la factura: algo falló de nuestro lado. Prueba de nuevo en un momento.'],
  ])('%i con sobre (%s): el `message` del micro, tal cual, y mensajeParaLaPersona lo muestra', async (status, code, message) => {
    agentFetchMock.mockResolvedValueOnce(respuesta(status, { statusCode: status, code, message, error: 'Old english text' }));
    const err = (await apApi.createBill(AGENCY, body).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
    expect(mensajeParaLaPersona(err)).toContain(message);
  });

  it('un `message` en lista (varias frases) llega como lista', async () => {
    agentFetchMock.mockResolvedValueOnce(
      respuesta(400, { statusCode: 400, code: 'DATOS_INVALIDOS', message: ['Falta el proveedor.', 'Falta el número.'], campos: [] }),
    );
    const err = (await apApi.createBill(AGENCY, body).catch((e: unknown) => e)) as ApiError;
    expect(err.messages).toEqual(['Falta el proveedor.', 'Falta el número.']);
    expect(mensajeParaLaPersona(err)).toBe('Falta el proveedor. · Falta el número.');
  });

  it('sin sobre (el cuerpo viejo en inglés, o ninguno): la frase de siempre', async () => {
    agentFetchMock.mockResolvedValueOnce(respuesta(401, { error: 'Unauthorized' }));
    await expect(apApi.listVendors(AGENCY)).rejects.toThrow('Tu sesión expiró. Vuelve a iniciar sesión.');
    agentFetchMock.mockResolvedValueOnce(respuesta(403, { success: false, error: 'Forbidden' }));
    await expect(apApi.createBill(AGENCY, body)).rejects.toThrow('No tienes permiso para registrar facturas en esta agencia.');
    agentFetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await expect(apApi.createBill(AGENCY, body)).rejects.toThrow('El servicio no está disponible en este momento. Intenta más tarde.');
    // Un `code` sin frase tampoco es un sobre.
    agentFetchMock.mockResolvedValueOnce(respuesta(403, { code: 'SIN_PERMISO', message: '' }));
    await expect(apApi.createBill(AGENCY, body)).rejects.toThrow('No tienes permiso para registrar facturas en esta agencia.');
  });
});

