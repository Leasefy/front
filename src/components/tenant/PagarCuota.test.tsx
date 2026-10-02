/**
 * «Pagar cuota» (ACUE-03) conectado por la sesión de pago (Nico, 02-10-2026, noche).
 *
 * El botón ya no espera a `getCuotaPaymentUrl` (una ruta que no existe): pide
 * la sesión a `/api/inquilino/acuerdos/wompi-session` con `{ planId,
 * cuotaNumber }` y el token del inquilino, y redirige a Wompi. Los errores
 * llegan con el sobre y se dicen bajo el botón con el traductor. Nada de Wompi
 * real: `fetch` es un doble y `window.location` un objeto.
 */

import * as React from 'react';
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AcuerdoDetail, AcuerdoInstallment } from '@/lib/api/tenant-acuerdos.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getCuotaPaymentUrl, acuerdosDelInquilino } = vi.hoisted(() => ({
  getCuotaPaymentUrl: vi.fn(),
  acuerdosDelInquilino: vi.fn(),
}));

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

// El `ApiError` de verdad: el botón lee el sobre de la ruta con él.
vi.mock('@/lib/api/client', async (original) => ({
  ...(await original<typeof import('@/lib/api/client')>()),
  getAccessToken: () => 'tenant-jwt',
}));

vi.mock('@/lib/api/tenant-acuerdos.service', async (original) => {
  const real = await original<typeof import('@/lib/api/tenant-acuerdos.service')>();
  return { ...real, acuerdosApi: { ...real.acuerdosApi, getCuotaPaymentUrl } };
});

vi.mock('@/lib/hooks/use-tenant-acuerdos', () => ({
  useTenantAcuerdos: () => acuerdosDelInquilino(),
}));

import { PagarCuota, RUTA_DE_LA_SESION_DE_LA_CUOTA } from './PagarCuota';
import AcuerdoDetailPage from '@/app/inquilino/acuerdos/[id]/page';

const CUOTA: AcuerdoInstallment = {
  number: 2,
  dueDate: '2026-11-05T00:00:00.000Z',
  amountCop: 450_000,
  status: 'pending',
  paidAt: null,
};

const SESION = {
  reference: 'acuerdo-plan-1-c2',
  amountInCents: 45_000_000,
  currency: 'COP',
  integrity: 'abc123',
  publicKey: 'pub_test',
};

function respuesta(status: number, cuerpo: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => cuerpo } as unknown as Response;
}

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
const locationOriginal = window.location;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  Object.defineProperty(window, 'location', {
    value: { href: '', origin: 'https://app.leasefy.co' } as Location,
    writable: true,
    configurable: true,
  });
  // Lo que da hoy el servicio: la ruta no existe (404) → `null`.
  getCuotaPaymentUrl.mockReset().mockResolvedValue(null);
  acuerdosDelInquilino.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  Object.defineProperty(window, 'location', { value: locationOriginal, writable: true, configurable: true });
  vi.restoreAllMocks();
});

async function montar() {
  await act(async () => {
    root.render(<PagarCuota planId="plan-1" cuota={CUOTA} locale="es" />);
  });
}

function boton(): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll('button')).find((x) => /cuota|pago/i.test(x.textContent ?? ''));
  if (!b) throw new Error('no está el botón de pagar');
  return b;
}

async function pagar() {
  await act(async () => {
    boton().click();
  });
  // La respuesta y su `json()` resuelven en microtareas.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function motivo(): HTMLElement | null {
  return container.querySelector<HTMLElement>('[data-testid="pagar-cuota-motivo"]');
}

describe('«Pagar cuota» por la sesión de pago', () => {
  it('🔴 el botón está habilitado de una y no pregunta nada al montarse', async () => {
    await montar();
    expect(boton().textContent).toContain('Pagar cuota 2');
    expect(boton().disabled).toBe(false);
    expect(container.textContent).not.toMatch(/Próximamente|disponible pronto/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('🔴 pide la sesión SÓLO con { planId, cuotaNumber } y el token, y redirige a Wompi', async () => {
    fetchMock.mockResolvedValue(respuesta(200, SESION));
    await montar();
    await pagar();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(RUTA_DE_LA_SESION_DE_LA_CUOTA);
    expect(url).toBe('/api/inquilino/acuerdos/wompi-session');
    expect(init.method).toBe('POST');
    // Nunca un monto: la ruta lo saca del plan.
    expect(JSON.parse(init.body as string)).toEqual({ planId: 'plan-1', cuotaNumber: 2 });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tenant-jwt');

    const destino = window.location.href;
    expect(destino).toContain('https://checkout.wompi.co/p/?public-key=pub_test');
    expect(destino).toContain('amount-in-cents=45000000');
    expect(destino).toContain('reference=acuerdo-plan-1-c2');
    expect(destino).toContain('signature:integrity=abc123');
    expect(destino).toContain(
      'redirect-url=' + encodeURIComponent('https://app.leasefy.co/inquilino/acuerdos/plan-1'),
    );
    // Mientras la pestaña se va, el botón dice que prepara el pago y no se vuelve a pulsar.
    expect(boton().textContent).toContain('Preparando el pago');
    expect(boton().disabled).toBe(true);
    expect(motivo()).toBeNull();
  });

  it('un doble clic no pide dos sesiones', async () => {
    let soltar: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (soltar = r)));
    await montar();
    await act(async () => {
      boton().click();
      boton().click();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => soltar(respuesta(200, SESION)));
  });

  it('🔴 un 400 del sobre dice SU frase bajo el botón, y el botón vuelve', async () => {
    fetchMock.mockResolvedValue(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['La cuota que vas a pagar no es válida. Recarga la página e intenta de nuevo.'],
        campos: [
          {
            campo: 'cuotaNumber',
            regla: 'formato',
            mensaje: 'La cuota que vas a pagar no es válida. Recarga la página e intenta de nuevo.',
          },
        ],
      }),
    );
    await montar();
    await pagar();

    expect(motivo()!.textContent).toBe('La cuota que vas a pagar no es válida. Recarga la página e intenta de nuevo.');
    expect(motivo()!.getAttribute('role')).toBe('alert');
    expect(motivo()!.className).toContain('text-caption');
    expect(boton().disabled).toBe(false);
    expect(boton().textContent).toContain('Pagar cuota 2');
    expect(window.location.href).toBe('');
  });

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, nunca «conexión»', async () => {
    fetchMock.mockResolvedValue(
      respuesta(500, {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    );
    await montar();
    await pagar();

    const texto = motivo()!.textContent!;
    expect(texto).toMatch(/^No pudimos iniciar el pago: algo falló de nuestro lado/);
    expect(texto).toContain('ab12cd34');
    expect(texto).not.toMatch(/conexi[oó]n/);
  });

  it('la frase del sobre gana: Wompi sin configurar lo dice en español', async () => {
    fetchMock.mockResolvedValue(
      respuesta(500, {
        statusCode: 500,
        code: 'PAGOS_SIN_CONFIGURAR',
        message:
          'Los pagos en línea no están disponibles en este momento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo más tarde.',
      }),
    );
    await montar();
    await pagar();

    expect(motivo()!.textContent).toMatch(/^Los pagos en línea no están disponibles en este momento/);
    expect(motivo()!.textContent).not.toMatch(/conexi[oó]n/);
  });

  it('una respuesta sin el sobre (un `{ error }` en inglés) no muestra el código: decide el status', async () => {
    fetchMock.mockResolvedValue(respuesta(404, { error: 'payment_plan_failed' }));
    await montar();
    await pagar();

    expect(motivo()!.textContent).toBe(
      'No encontramos este acuerdo de pago a tu nombre. Recarga la página e intenta de nuevo.',
    );
  });

  it('un 401 pide volver a iniciar sesión', async () => {
    fetchMock.mockResolvedValue(
      respuesta(401, {
        statusCode: 401,
        code: 'SESION_REQUERIDA',
        message: 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
      }),
    );
    await montar();
    await pagar();

    expect(motivo()!.textContent).toBe('Tu sesión expiró. Vuelve a iniciar sesión para pagar.');
  });

  it('🔴 sin respuesta (el fetch no salió): ahí sí se habla de la conexión', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await montar();
    await pagar();

    expect(motivo()!.textContent).toMatch(/conexión/);
    expect(boton().disabled).toBe(false);
  });

  it('volver a intentar quita el aviso y, si sale, redirige', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'x', referencia: 'ab12cd34' }))
      .mockResolvedValueOnce(respuesta(200, SESION));
    await montar();
    await pagar();
    expect(motivo()).not.toBeNull();

    await pagar();
    // El aviso sale con su animación y después se desmonta.
    await vi.waitFor(() => expect(motivo()).toBeNull());
    expect(window.location.href).toContain('reference=acuerdo-plan-1-c2');
  });
});

describe('la pantalla del acuerdo usa «Pagar cuota» conectado', () => {
  const PLAN: AcuerdoDetail = {
    planId: 'plan-1',
    tenantId: 'agency-1',
    debtorId: 'debtor-1',
    stage: 'S2',
    status: 'active',
    paymentProvider: 'wompi',
    paymentUrl: null,
    totalDueCop: 900_000,
    initialAmountCop: 450_000,
    discountAppliedPct: 0,
    discountKind: 'none',
    offeredAt: '2026-09-20T00:00:00.000Z',
    acceptedAt: '2026-09-21T00:00:00.000Z',
    defaultedAt: null,
    installments: [{ ...CUOTA, number: 1, status: 'paid', paidAt: '2026-10-05T00:00:00.000Z' }, CUOTA],
  } as AcuerdoDetail;

  it('🔴 con el plan aceptado, el botón de la próxima cuota está habilitado y no pregunta a `getCuotaPaymentUrl`', async () => {
    acuerdosDelInquilino.mockReturnValue({ items: [PLAN], isLoading: false, error: null, refetch: vi.fn() });
    const params = Promise.resolve({ id: 'plan-1' });
    await act(async () => {
      root.render(
        <Suspense fallback={null}>
          <AcuerdoDetailPage params={params} />
        </Suspense>,
      );
    });
    await act(async () => {
      await params;
    });

    expect(boton().textContent).toContain('Pagar cuota 2');
    expect(boton().disabled).toBe(false);
    expect(container.textContent).not.toMatch(/Próximamente|disponible pronto/);
    expect(getCuotaPaymentUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
