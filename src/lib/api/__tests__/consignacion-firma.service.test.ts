/**
 * consignacion-firma.service.test.ts — T-0109 contract.md §3.1.C/D.
 *
 * Coverage:
 *   (1) firmaDeConsignacionApi.iniciar posts multipart to the C1 route with the session token
 *   (2) firmaDeConsignacionApi.obtener GETs C2
 *   (3) firmaDeConsignacionApi.otpVerify/firmar POST the exact bodies contract.md fixes
 *   (4) firmaPublicaApi.* never send an Authorization header (PUBLIC-LINK — token in the URL, not the session)
 *   (5) a non-2xx response throws ApiError with the back's code (contract.md §3.3)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { firmaDeConsignacionApi, firmaPublicaDeConsignacionApi } from '../consignacion-firma.service';
import { setAccessToken } from '../client';

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  const fn = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('sesion-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe('firmaDeConsignacionApi.iniciar (C1)', () => {
  it('POSTs multipart with Authorization and the file field', async () => {
    const fetchMock = mockFetchOnce({ id: 'proceso-1', estado: 'PENDIENTE' });
    const file = new File(['%PDF-1.4'], 'consignacion.pdf', { type: 'application/pdf' });

    await firmaDeConsignacionApi.iniciar('con-1', { file, mensaje: 'Por favor firma' });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/consignaciones/con-1/firma-electronica')).toBe(true);
    expect(opts.method).toBe('POST');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer sesion-token');
    expect(opts.body).toBeInstanceOf(FormData);
    const fd = opts.body as FormData;
    expect(fd.get('file')).toBe(file);
    expect(fd.get('mensaje')).toBe('Por favor firma');
    expect(fd.get('representanteUserId')).toBeNull();
  });

  it('throws ApiError with the back code on a 409 FIRMA_ELECTRONICA_EN_CURSO', async () => {
    mockFetchOnce({ message: 'Ya hay un proceso en curso', code: 'FIRMA_ELECTRONICA_EN_CURSO', details: { procesoId: 'p-1' } }, { ok: false, status: 409 });
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    await expect(firmaDeConsignacionApi.iniciar('con-1', { file })).rejects.toMatchObject({
      status: 409,
      code: 'FIRMA_ELECTRONICA_EN_CURSO',
    });
  });
});

describe('firmaDeConsignacionApi.obtener (C2)', () => {
  it('GETs the firma-electronica route', async () => {
    const fetchMock = mockFetchOnce({ proceso: null });
    await firmaDeConsignacionApi.obtener('con-1');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/consignaciones/con-1/firma-electronica')).toBe(true);
    expect(opts.method).toBe('GET');
  });
});

describe('firmaDeConsignacionApi.otpVerify / firmar (C6/C7)', () => {
  it('sends { code } to otp/verify', async () => {
    const fetchMock = mockFetchOnce({ verificationToken: 'tok-1', expiresAt: '2026-01-01T00:00:00Z' });
    await firmaDeConsignacionApi.otpVerify('con-1', '123456');
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string)).toEqual({ code: '123456' });
  });

  it('sends the SignContractDto shape to firmar', async () => {
    const fetchMock = mockFetchOnce({ id: 'proceso-1', estado: 'FIRMADO' });
    await firmaDeConsignacionApi.firmar('con-1', {
      acceptedTerms: true,
      consentText: 'Acepto',
      signatureData: 'data:image/png;base64,abc',
      otpVerificationToken: 'tok-1',
    });
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/inmobiliaria/consignaciones/con-1/firma-electronica/firmar')).toBe(true);
    expect(JSON.parse(opts.body as string)).toEqual({
      acceptedTerms: true,
      consentText: 'Acepto',
      signatureData: 'data:image/png;base64,abc',
      otpVerificationToken: 'tok-1',
    });
  });
});

describe('firmaPublicaDeConsignacionApi (D1–D4)', () => {
  it('D1 never sends an Authorization header, even with a session token set', async () => {
    const fetchMock = mockFetchOnce({ firmante: { nombre: 'Ana', firmado: false, firmadoAt: null } });
    await firmaPublicaDeConsignacionApi.obtener('tok-abc');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/publico/firma-de-consignacion/tok-abc')).toBe(true);
    expect((opts.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it('D3 posts { code } without Authorization', async () => {
    const fetchMock = mockFetchOnce({ verificationToken: 'tok-1', expiresAt: '2026-01-01T00:00:00Z' });
    await firmaPublicaDeConsignacionApi.otpVerify('tok-abc', '654321');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/publico/firma-de-consignacion/tok-abc/otp/verify')).toBe(true);
    expect(JSON.parse(opts.body as string)).toEqual({ code: '654321' });
    expect((opts.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
  });

  it('maps a 404 to ApiError(404, ENLACE_DE_FIRMA_INVALIDO)', async () => {
    mockFetchOnce({ message: 'Enlace no válido', code: 'ENLACE_DE_FIRMA_INVALIDO' }, { ok: false, status: 404 });
    await expect(firmaPublicaDeConsignacionApi.obtener('tok-malo')).rejects.toMatchObject({
      status: 404,
      code: 'ENLACE_DE_FIRMA_INVALIDO',
    });
  });

  it('maps a 410 to ApiError(410, ENLACE_DE_FIRMA_VENCIDO)', async () => {
    mockFetchOnce({ message: 'Enlace vencido', code: 'ENLACE_DE_FIRMA_VENCIDO' }, { ok: false, status: 410 });
    await expect(firmaPublicaDeConsignacionApi.obtener('tok-viejo')).rejects.toMatchObject({
      status: 410,
      code: 'ENLACE_DE_FIRMA_VENCIDO',
    });
  });
});
