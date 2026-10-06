/**
 * Aceptar el acuerdo con firma + código de un solo uso (Nico, 02-10-2026,
 * «seguimiento 4»): el transporte del código del panel.
 *
 *   - pide y verifica el código por el back (`/cartera/payment-plans/:planId/otp/*`);
 *   - dice por dónde salió (`channels`);
 *   - «estará disponible pronto» SÓLO con el `code` del back
 *     (`ACEPTAR_ACUERDO_NO_DISPONIBLE`, un back sin la migración); un 404 «no es
 *     tuyo», un código incorrecto o la red caída suben con su frase. Nunca un
 *     token inventado.
 *
 * `fetch` es un doble: ningún correo ni WhatsApp real.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAccessToken } from '@/lib/api/client';
import { adaptadorDelCodigoDelAcuerdo } from './AcuerdoAcceptPanel';

const PRONTO = 'La verificación para aceptar acuerdos estará disponible pronto.';
const realFetch = globalThis.fetch;

function respuesta(status: number, cuerpo: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(cuerpo),
    json: async () => cuerpo,
  } as unknown as Response);
}

beforeEach(() => {
  setAccessToken(null);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('adaptadorDelCodigoDelAcuerdo', () => {
  it('send: POST …/plan-1/otp/send y devuelve a dónde y por qué canales salió', async () => {
    const canales = [
      { channel: 'EMAIL', status: 'SENT', destination: 'an***@example.com', reason: null },
      { channel: 'WHATSAPP', status: 'SKIPPED', destination: null, reason: 'CHANNEL_DISABLED' },
    ];
    const f = respuesta(200, { sentTo: 'an***@example.com', cooldownSeconds: 60, channels: canales });
    globalThis.fetch = f;
    const r = await adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).send();
    expect(r).toEqual({ sentTo: 'an***@example.com', cooldownSeconds: 60, channels: canales });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/cartera/payment-plans/plan-1/otp/send');
    expect(String(url)).not.toContain('/api/agency/');
    expect(init.method).toBe('POST');
  });

  it('verify: manda el código y devuelve el token del back', async () => {
    const f = respuesta(200, { verificationToken: 'tok-1', expiresAt: '2026-10-02T20:05:00.000Z' });
    globalThis.fetch = f;
    expect(await adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).verify('123456')).toEqual({
      verificationToken: 'tok-1',
    });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain('/cartera/payment-plans/plan-1/otp/verify');
    expect(JSON.parse(String(init.body))).toEqual({ code: '123456' });
  });

  it('503 ACEPTAR_ACUERDO_NO_DISPONIBLE (back sin la migración): el «pronto» honesto', async () => {
    globalThis.fetch = respuesta(503, {
      statusCode: 503,
      code: 'ACEPTAR_ACUERDO_NO_DISPONIBLE',
      message: 'Todavía no puedes aceptar acuerdos de pago desde el portal.',
    });
    await expect(adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).send()).rejects.toThrow(PRONTO);
  });

  it('un 404 ACUERDO_NO_ENCONTRADO NO es «pronto»: sube con su frase', async () => {
    globalThis.fetch = respuesta(404, {
      statusCode: 404,
      code: 'ACUERDO_NO_ENCONTRADO',
      message: 'No encontramos este acuerdo de pago a tu nombre.',
    });
    const err = await adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).send().catch((e: unknown) => e);
    expect((err as Error).message).toBe('No encontramos este acuerdo de pago a tu nombre.');
    expect((err as { code?: string }).code).toBe('ACUERDO_NO_ENCONTRADO');
  });

  it('un código incorrecto sube con su `code` (el modal suma los intentos)', async () => {
    globalThis.fetch = respuesta(400, {
      statusCode: 400,
      code: 'CODIGO_INCORRECTO',
      message: 'Código incorrecto. Te quedan 4 intentos.',
      details: { intentosRestantes: 4 },
    });
    const err = await adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).verify('000000').catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('CODIGO_INCORRECTO');
  });

  it('la red caída NO es «pronto» (y nunca hay un token inventado)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await adaptadorDelCodigoDelAcuerdo('plan-1', PRONTO).verify('123456').catch((e: unknown) => e);
    expect((err as Error).message).not.toBe(PRONTO);
    expect((err as { status?: number }).status).toBe(0);
  });
});
