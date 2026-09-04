/**
 * recibos-de-caja.service.test.ts — el contrato del back, no el nuestro.
 *
 * 🔴 Por qué cada test compara contra una lista de claves ESCRITA A MANO y no
 * contra el objeto que le pasamos al servicio: el back valida con
 * `forbidNonWhitelisted: true`, así que una clave que su DTO no declara no se
 * ignora — devuelve 400. Un test que hace
 * `expect(JSON.parse(body)).toEqual(loQueLePase)` se compara contra sí mismo y
 * pasa en verde mientras producción responde 400. Eso ya pasó en este repo con
 * `paymentDate` vs `paidDate` (ver la nota en `cobrosApi.registerPayment`).
 *
 * Lo que se fija acá, por endpoint: método, ruta y el juego EXACTO de claves.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { recibosDeCajaApi } from '../recibos-de-caja.service';
import { cobrosApi } from '../inmobiliaria.service';
import { setAccessToken } from '../client';

// ── Contratos del back, copiados de la especificación ────────────────────────

/** `POST /inmobiliaria/recibos-de-caja` */
const CLAVES_NUEVO_RECIBO = ['cobroId', 'valorCop', 'fecha', 'medio', 'referencia', 'notas'];
/** `PUT /inmobiliaria/recibos-de-caja/:id/anular` */
const CLAVES_ANULAR = ['motivo'];
/** `POST /inmobiliaria/recibos-de-caja/conciliar/:cobroId` */
const CLAVES_CONCILIAR = ['origen', 'medio', 'referencia', 'notas'];

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

const RECIBO = {
  id: 'rc-1',
  numero: 'RC-0001',
  valorCop: 500_000,
  fecha: '2026-08-31',
  medio: 'transferencia',
  referencia: 'TRF-9',
  notas: null,
  registradoPorUserId: 'u-1',
  anuladoAt: null,
};

const COBRO = { id: 'cobro-1', status: 'PARTIAL', pendingAmount: 600_000 };

function cuerpoDe(fetchMock: ReturnType<typeof mockFetchOnce>): Record<string, unknown> {
  const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
  return JSON.parse(opts.body as string) as Record<string, unknown>;
}

function urlDe(fetchMock: ReturnType<typeof mockFetchOnce>): string {
  return (fetchMock.mock.calls[0] as [string, RequestInit])[0];
}

function metodoDe(fetchMock: ReturnType<typeof mockFetchOnce>): string | undefined {
  return (fetchMock.mock.calls[0] as [string, RequestInit])[1].method;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

// ── crear ────────────────────────────────────────────────────────────────────

describe('recibosDeCajaApi.crear', () => {
  it('POSTea a /inmobiliaria/recibos-de-caja', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.crear({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      fecha: '2026-08-31',
      medio: 'transferencia',
    });

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/recibos-de-caja')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('POST');
  });

  it('no manda NINGUNA clave fuera del DTO del back (si no, 400)', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.crear({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      fecha: '2026-08-31',
      medio: 'transferencia',
      referencia: 'TRF-9',
      notas: 'abono parcial',
    });

    const cuerpo = cuerpoDe(fetchMock);
    const sobrantes = Object.keys(cuerpo).filter((k) => !CLAVES_NUEVO_RECIBO.includes(k));
    expect(sobrantes).toEqual([]);
    expect(cuerpo).toEqual({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      fecha: '2026-08-31',
      medio: 'transferencia',
      referencia: 'TRF-9',
      notas: 'abono parcial',
    });
  });

  it('omite los opcionales vacíos en vez de mandarlos en blanco', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.crear({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      medio: 'efectivo',
    });

    // Sin `fecha` el back pone hoy; mandar '' o null es pedirle que valide basura.
    expect(cuerpoDe(fetchMock)).toEqual({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      medio: 'efectivo',
    });
  });

  it('devuelve el cobro recompuesto con el estado ya normalizado a minúscula', async () => {
    mockFetchOnce({ recibo: RECIBO, cobro: { ...COBRO, status: 'PARTIAL' } });

    const res = await recibosDeCajaApi.crear({
      cobroId: 'cobro-1',
      valorCop: 500_000,
      medio: 'efectivo',
    });

    // El front tipa `status` en minúscula; sin normalizar, el badge se cae al
    // default y el estado se ve mal sin que nada falle.
    expect(res.cobro.status).toBe('partial');
    expect(res.recibo.numero).toBe('RC-0001');
  });

  it('deja pasar el 409 con su status, que es lo que dispara la conciliación', async () => {
    mockFetchOnce(
      { message: 'El cobro registra 900.000 pagados y sólo 400.000 tienen recibo.' },
      { ok: false, status: 409 },
    );

    await expect(
      recibosDeCajaApi.crear({ cobroId: 'cobro-1', valorCop: 100, medio: 'efectivo' }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'El cobro registra 900.000 pagados y sólo 400.000 tienen recibo.',
    });
  });

  it('deja pasar el mensaje del 400 del sobrepago intacto', async () => {
    mockFetchOnce({ message: 'El máximo abonable es $600.000' }, { ok: false, status: 400 });

    await expect(
      recibosDeCajaApi.crear({ cobroId: 'cobro-1', valorCop: 9_000_000, medio: 'efectivo' }),
    ).rejects.toMatchObject({ status: 400, message: 'El máximo abonable es $600.000' });
  });
});

// ── listar ───────────────────────────────────────────────────────────────────

describe('recibosDeCajaApi.listar', () => {
  it('GETea sin query cuando no hay filtros', async () => {
    const fetchMock = mockFetchOnce([RECIBO]);

    await recibosDeCajaApi.listar();

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/recibos-de-caja')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('GET');
  });

  it('manda cada filtro con el nombre del contrato', async () => {
    const fetchMock = mockFetchOnce([RECIBO]);

    await recibosDeCajaApi.listar({
      desde: '2026-08-01',
      hasta: '2026-08-31',
      medio: 'pse',
      referencia: 'TRF-9',
      incluirAnulados: true,
    });

    const query = new URL(urlDe(fetchMock)).searchParams;
    expect(Object.fromEntries(query.entries())).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-31',
      medio: 'pse',
      referencia: 'TRF-9',
      incluirAnulados: 'true',
    });
  });

  it('manda incluirAnulados=false explícito, que NO es lo mismo que no mandarlo', async () => {
    const fetchMock = mockFetchOnce([]);

    await recibosDeCajaApi.listar({ incluirAnulados: false });

    expect(new URL(urlDe(fetchMock)).searchParams.get('incluirAnulados')).toBe('false');
  });

  it('acepta tanto el arreglo pelado como { data: [...] }', async () => {
    mockFetchOnce([RECIBO]);
    expect(await recibosDeCajaApi.listar()).toHaveLength(1);

    mockFetchOnce({ data: [RECIBO, { ...RECIBO, id: 'rc-2' }] });
    expect(await recibosDeCajaApi.listar({ medio: 'pse' })).toHaveLength(2);
  });
});

// ── porCobro ─────────────────────────────────────────────────────────────────

describe('recibosDeCajaApi.porCobro', () => {
  it('GETea a /inmobiliaria/recibos-de-caja/por-cobro/:cobroId', async () => {
    const fetchMock = mockFetchOnce([RECIBO]);

    await recibosDeCajaApi.porCobro('cobro-1');

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/recibos-de-caja/por-cobro/cobro-1')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('GET');
  });
});

// ── anular ───────────────────────────────────────────────────────────────────

describe('recibosDeCajaApi.anular', () => {
  it('PUTea a /:id/anular con { motivo } y nada más', async () => {
    const fetchMock = mockFetchOnce({
      recibo: { ...RECIBO, anuladoAt: '2026-08-31T10:00:00Z' },
      cobro: COBRO,
    });

    await recibosDeCajaApi.anular('rc-1', 'se devolvió el cheque');

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/recibos-de-caja/rc-1/anular')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('PUT');

    const cuerpo = cuerpoDe(fetchMock);
    expect(Object.keys(cuerpo).filter((k) => !CLAVES_ANULAR.includes(k))).toEqual([]);
    expect(cuerpo).toEqual({ motivo: 'se devolvió el cheque' });
  });

  it('devuelve el recibo con su anuladoAt: es lo que lo deja marcado y no borrado', async () => {
    mockFetchOnce({
      recibo: { ...RECIBO, anuladoAt: '2026-08-31T10:00:00Z' },
      cobro: { ...COBRO, status: 'LATE' },
    });

    const res = await recibosDeCajaApi.anular('rc-1', 'cheque devuelto');

    expect(res.recibo.anuladoAt).toBe('2026-08-31T10:00:00Z');
    expect(res.cobro.status).toBe('late');
  });
});

// ── conciliar ────────────────────────────────────────────────────────────────

describe('recibosDeCajaApi.conciliar', () => {
  it('POSTea a /conciliar/:cobroId con el juego exacto de claves', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.conciliar('cobro-1', {
      origen: 'Pago por PSE del 3 de agosto',
      medio: 'pse',
      referencia: 'PSE-77',
      notas: 'cartera vieja',
    });

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/recibos-de-caja/conciliar/cobro-1')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('POST');

    const cuerpo = cuerpoDe(fetchMock);
    expect(Object.keys(cuerpo).filter((k) => !CLAVES_CONCILIAR.includes(k))).toEqual([]);
    expect(cuerpo).toEqual({
      origen: 'Pago por PSE del 3 de agosto',
      medio: 'pse',
      referencia: 'PSE-77',
      notas: 'cartera vieja',
    });
  });

  it('con sólo el origen, manda sólo el origen', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.conciliar('cobro-1', { origen: 'Consignación en Bancolombia' });

    expect(cuerpoDe(fetchMock)).toEqual({ origen: 'Consignación en Bancolombia' });
  });

  it('el cobroId va en la RUTA, nunca en el cuerpo', async () => {
    const fetchMock = mockFetchOnce({ recibo: RECIBO, cobro: COBRO });

    await recibosDeCajaApi.conciliar('cobro-42', { origen: 'plata vieja del PSE' });

    expect(urlDe(fetchMock)).toContain('/conciliar/cobro-42');
    expect(cuerpoDe(fetchMock)).not.toHaveProperty('cobroId');
  });
});

// ── el detalle del cobro ─────────────────────────────────────────────────────

describe('cobrosApi.getById — el detalle que trae el desglose', () => {
  it('GETea /inmobiliaria/cobros/:id y devuelve conceptos y recibos', async () => {
    const fetchMock = mockFetchOnce({
      id: 'cobro-1',
      status: 'PARTIAL',
      conceptos: [
        { id: 'c1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_800_000, resta: false, reglaId: null, orden: 1 },
      ],
      recibosDeCaja: [RECIBO],
    });

    const cobro = await cobrosApi.getById('cobro-1');

    expect(urlDe(fetchMock).endsWith('/inmobiliaria/cobros/cobro-1')).toBe(true);
    expect(metodoDe(fetchMock)).toBe('GET');
    expect(cobro.conceptos).toHaveLength(1);
    expect(cobro.recibosDeCaja).toHaveLength(1);
    // Mismo trato que la lista: el estado llega en mayúscula y se normaliza.
    expect(cobro.status).toBe('partial');
  });

  it('no se rompe cuando la agencia no tiene el motor de conceptos', async () => {
    mockFetchOnce({ id: 'cobro-1', status: 'COBRO_PENDING' });

    const cobro = await cobrosApi.getById('cobro-1');

    expect(cobro.conceptos).toBeUndefined();
    expect(cobro.status).toBe('pending');
  });
});
