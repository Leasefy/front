/**
 * RegistrarPagoModal.test.tsx — el recibo de caja por CLIENTE.
 *
 * Cuatro cosas que se rompieron o se pueden romper en silencio:
 *
 * 1. 🔴 La REGLA. El pago va a la deuda más vieja: si el cliente debe junio,
 *    julio y agosto y entra un millón, la pantalla tiene que decir que va a
 *    JUNIO. Un test que sólo mire que se emitió algo pasa en verde con la
 *    plata en el mes equivocado, que es justo lo que Nico no quiere.
 *
 * 2. 🔴 El monto. El campo viene prellenado con la deuda entera, y el parser
 *    anterior convertía «1.800.000» en **1.8** (`parseFloat` sobre el formato
 *    es-CL, que usa el punto como separador de miles). Nada fallaba: el back
 *    recibía un recibo por un peso con ochenta.
 *
 * 3. 🔴 El 409. Le pasa a TODO cobro anterior al recibo de caja y a los de PSE.
 *    Sin la salida a conciliar, el módulo no sirve sobre la cartera viva.
 *
 * 4. 🔴 El mensaje del back. El 400 del sobrepago trae el máximo; si se cambia
 *    por un «hubo un error», el usuario no sabe cuánto puede recibir.
 *
 * 5. 🔴 (2026-09-15) La DEUDA PARTIDA. «Desde que él comience el contrato ya
 *    debe»: un contrato vigente sin nada vencido tiene que poder recibir plata,
 *    y la pantalla tiene que llamarlo ADELANTO. «No debe nada» quedó reservado
 *    para el caso en que de verdad no queda ninguna cuota. Un test que sólo
 *    mire que el formulario se dibuja pasa en verde con los dos números
 *    sumados en uno, que es exactamente lo que no se puede hacer.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type {
  CarteraDelCliente,
  PeriodoEnDeuda,
  RespuestaDeReciboPorCliente,
} from '@/lib/api/recibos-de-caja.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

let mediosConfigurados: { id: string; nombre: string; tipo: string; activo: boolean }[] = [];
vi.mock('@/lib/hooks/use-medios-de-pago', () => ({
  useMediosDePago: () => ({ medios: mediosConfigurados, cargando: false, error: null, refrescar: vi.fn() }),
}));

/** La cartera llega por HTTP; acá interesa la pantalla, no la petición. */
const carteraPorCobro = vi.fn<(id: string, fecha?: string) => Promise<CarteraDelCliente>>();
const cartera = vi.fn<(id: string, fecha?: string) => Promise<CarteraDelCliente>>();
/*
 * La fecha se reenvía SÓLO cuando viene: sin fecha la llamada sigue siendo
 * `(id)`, que es lo que el back entiende como «hoy».
 */
vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: {
    carteraPorCobro: (...args: [string, string?]) => carteraPorCobro(...args),
    cartera: (...args: [string, string?]) => cartera(...args),
  },
}));

vi.mock('@/lib/api/inquilinos.service', () => ({
  inquilinosApi: { listar: () => Promise.resolve([]) },
}));

import { ApiError } from '@/lib/api/client';
import { RegistrarPagoModal } from './RegistrarPagoModal';
import { ESPERA_DE_LA_FECHA_MS } from './ReciboPorCliente';

const COBRO: Cobro = {
  id: 'c-ago',
  leaseId: 'l1',
  consignacionId: 'cons1',
  propertyId: 'p1',
  propietarioId: 'own1',
  tenantId: 't1',
  agenteId: 'ag1',
  propertyTitle: 'Apto 101',
  propertyAddress: 'Calle 1 #2-3',
  tenantName: 'Jose Lopez',
  tenantEmail: null,
  tenantPhone: null,
  month: '2026-08',
  rentAmount: 1_000_000,
  adminAmount: 0,
  totalAmount: 1_000_000,
  lateFee: 0,
  totalWithFees: 1_000_000,
  status: 'pending',
  dueDate: '2026-08-05',
  paidAmount: 0,
  pendingAmount: 1_000_000,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

function periodo(
  id: string,
  month: string,
  pendingAmount: number,
  extra: Partial<PeriodoEnDeuda> = {},
): PeriodoEnDeuda {
  return {
    id,
    cuotaId: `q-${id}`,
    // Sin cobro emitido: es el caso normal desde que la deuda se lee del
    // contrato, y el de las 30.951 cuotas de la agencia migrada.
    cobroId: null,
    month,
    dueDate: `${month}-05T00:00:00.000Z`,
    createdAt: `${month}-01T00:00:00.000Z`,
    consignacionId: 'cons1',
    contractId: 'ct1',
    leaseId: 'l1',
    propertyTitle: 'Apto 101',
    tenantName: 'Jose Lopez',
    totalWithFees: pendingAmount,
    paidAmount: 0,
    pendingAmount,
    estado: 'PENDIENTE',
    status: null,
    daysLate: 0,
    lateFee: 0,
    vencida: true,
    sinRespaldo: 0,
    conceptos: [],
    ...extra,
  };
}

/** Debe tres meses de un millón, los tres vencidos: junio, julio y agosto. */
function debeTresMeses(extra: Partial<CarteraDelCliente> = {}): CarteraDelCliente {
  return {
    tenantId: 't1',
    nombre: 'Jose Lopez',
    documento: '1020304050',
    email: null,
    inmuebles: 1,
    total: 3_000_000,
    vencidoCop: 3_000_000,
    futuroCop: 0,
    cuotas: [
      periodo('c-jun', '2026-06', 1_000_000),
      periodo('c-jul', '2026-07', 1_000_000),
      periodo('c-ago', '2026-08', 1_000_000),
    ],
    ...extra,
  };
}

/**
 * El caso que originó todo: contrato vigente, NADA vencido, y $2.000.000 de
 * deuda futura contra la cual sólo se puede ADELANTAR.
 */
function soloDeudaFutura(extra: Partial<CarteraDelCliente> = {}): CarteraDelCliente {
  return {
    tenantId: 't1',
    nombre: 'Jose Lopez',
    documento: '1020304050',
    email: null,
    inmuebles: 1,
    total: 2_000_000,
    vencidoCop: 0,
    futuroCop: 2_000_000,
    cuotas: [
      periodo('c-nov', '2026-11', 1_000_000, { vencida: false }),
      periodo('c-dic', '2026-12', 1_000_000, { vencida: false }),
    ],
    ...extra,
  };
}

const RESPUESTA: RespuestaDeReciboPorCliente = {
  recibos: [
    {
      id: 'rc-1',
      numero: 'RC-0001',
      valorCop: 1_000_000,
      fecha: '2026-09-12',
      medio: 'efectivo',
      referencia: null,
      notas: null,
      registradoPorUserId: 'u-1',
      anuladoAt: null,
    },
  ],
  cobros: [],
  imputacion: [
    {
      cuotaId: 'q-c-jun',
      cobroId: 'c-jun',
      month: '2026-06',
      propertyTitle: 'Apto 101',
      vencida: true,
      valorCop: 1_000_000,
      aIntereses: 0,
      aCapital: 1_000_000,
      quedaPendiente: 0,
    },
  ],
  totalCop: 1_000_000,
  deudaRestante: 2_000_000,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  carteraPorCobro.mockResolvedValue(debeTresMeses());
  cartera.mockResolvedValue(debeTresMeses());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  carteraPorCobro.mockReset();
  cartera.mockReset();
});

async function abrir(props: Partial<Parameters<typeof RegistrarPagoModal>[0]> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(RESPUESTA);
  await act(async () => {
    root.render(
      <RegistrarPagoModal
        isOpen
        onClose={vi.fn()}
        cobro={COBRO}
        onSubmit={onSubmit as never}
        {...props}
      />,
    );
  });
  return onSubmit as ReturnType<typeof vi.fn>;
}

/** El modal vive en un portal: se busca en todo el body. */
function porTexto(texto: string): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll('button')).filter((b) =>
    (b.textContent ?? '').includes(texto),
  );
}

function escribir(selector: string, valor: string) {
  const campo = document.body.querySelector<HTMLTextAreaElement | HTMLInputElement>(selector);
  expect(campo).toBeTruthy();
  const proto =
    campo instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!;
  act(() => {
    setter.call(campo, valor);
    campo!.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function elegirMedio(medio: string) {
  act(() => porTexto(`recibos.form.medios.${medio}`)[0].click());
}

function enviar() {
  const form = document.body.querySelector<HTMLFormElement>('#form-recibo-de-caja');
  expect(form).toBeTruthy();
  return act(async () => {
    form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('<RegistrarPagoModal> la cartera del cliente', () => {
  it('🔴 al abrirse desde un cobro muestra TODA la cartera de esa persona', async () => {
    await abrir();

    // Se pide por el cobro: la persona la resuelve el back, no la pantalla.
    expect(carteraPorCobro).toHaveBeenCalledWith('c-ago');
    expect(document.body.querySelector('[data-testid="cartera-del-cliente"]')).toBeTruthy();
    for (const mes of ['2026-06', '2026-07', '2026-08']) {
      expect(document.body.querySelector(`[data-testid="cartera-periodo-${mes}"]`)).toBeTruthy();
    }
    expect(
      document.body.querySelector('[data-testid="cartera-total"]')?.textContent,
    ).toContain('3000000');
  });

  it('marca cuál es la deuda más vieja', async () => {
    await abrir();
    const junio = document.body.querySelector('[data-testid="cartera-periodo-2026-06"]');
    expect(junio?.querySelector('[data-testid="cartera-mas-vieja"]')).toBeTruthy();
    const agosto = document.body.querySelector('[data-testid="cartera-periodo-2026-08"]');
    expect(agosto?.querySelector('[data-testid="cartera-mas-vieja"]')).toBeNull();
  });

  it('con varios inmuebles la cartera se ve JUNTA y dice de cuál es cada deuda', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        inmuebles: 2,
        total: 1_500_000,
        vencidoCop: 1_500_000,
        futuroCop: 0,
        cuotas: [
          periodo('c-loc', '2026-06', 500_000, {
            consignacionId: 'cons2',
            propertyTitle: 'Local 5',
          }),
          periodo('c-ago', '2026-08', 1_000_000),
        ],
      }),
    );
    await abrir();

    expect(document.body.querySelector('[data-testid="cartera-varios-inmuebles"]')).toBeTruthy();
    expect(
      document.body.querySelector('[data-testid="cartera-periodo-2026-06"]')?.textContent,
    ).toContain('Local 5');
    expect(
      document.body.querySelector('[data-testid="cartera-periodo-2026-08"]')?.textContent,
    ).toContain('Apto 101');
  });

  it('un cliente que no debe nada no tiene formulario que llenar', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({ total: 0, vencidoCop: 0, futuroCop: 0, cuotas: [] }),
    );
    await abrir();

    expect(document.body.querySelector('[data-testid="cliente-sin-deuda"]')).toBeTruthy();
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeNull();
  });
});

describe('<RegistrarPagoModal> a dónde va la plata', () => {
  it('🔴 «debe 3 meses y entra 1 millón»: el plan dice JUNIO, no agosto', async () => {
    await abrir();
    escribir('#monto-recibo', '1000000');

    const plan = document.body.querySelector('[data-testid="plan-de-imputacion"]');
    expect(plan).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-parte-2026-06"]')).toBeTruthy();
    // El mes actual NO recibe plata mientras haya deuda vieja.
    expect(document.body.querySelector('[data-testid="plan-parte-2026-08"]')).toBeNull();
    expect(
      document.body.querySelector('[data-testid="plan-deuda-restante"]')?.textContent,
    ).toContain('2000000');
  });

  it('un pago parcial deja el mes más viejo a medias y lo dice', async () => {
    await abrir();
    escribir('#monto-recibo', '400000');

    expect(document.body.querySelector('[data-testid="plan-queda-2026-06"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-parte-2026-07"]')).toBeNull();
  });

  it('un pago que pasa de un mes sigue en el siguiente', async () => {
    await abrir();
    escribir('#monto-recibo', '1500000');

    expect(document.body.querySelector('[data-testid="plan-parte-2026-06"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-parte-2026-07"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-parte-2026-08"]')).toBeNull();
  });

  it('dice a qué conceptos va: primero los intereses de mora (art. 1653)', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        total: 1_120_000,
        vencidoCop: 1_120_000,
        futuroCop: 0,
        cuotas: [
          periodo('c-jun', '2026-06', 1_120_000, {
            lateFee: 120_000,
            conceptos: [
              { id: 'x1', tipo: 'CANON', nombre: 'Canon', valorCop: 1_000_000, resta: false, reglaId: null, orden: 1 },
              { id: 'x2', tipo: 'INTERES_DE_MORA', nombre: 'Interés de mora', valorCop: 120_000, resta: false, reglaId: null, orden: 2 },
            ],
          }),
        ],
      }),
    );
    await abrir();
    escribir('#monto-recibo', '200000');

    const parte = document.body.querySelector('[data-testid="plan-parte-2026-06"]');
    expect(parte?.textContent).toContain('recibos.form.plan.intereses');
    expect(parte?.textContent).toContain('Canon');
  });

  /*
   * 🔴 La prueba del recibo con interés (2026-09-16), con el caso real de QA:
   * contrato #69, enero de 2026, sin cobro emitido. Caja ve capital e interés
   * por separado, el máximo ya los trae, y pagar exacto los dos no deja nada.
   */
  it('🔴 capital + interés de una cuota sin cobro: se ven aparte y pagarlos exacto no deja saldo', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        total: 1_962_429,
        vencidoCop: 1_962_429,
        futuroCop: 0,
        interesCop: 412_429,
        cuotas: [
          periodo('q-ene', '2026-01', 1_962_429, {
            capitalPendienteCop: 1_550_000,
            interesPendienteCop: 412_429,
          }),
        ],
      }),
    );
    const onSubmit = await abrir();

    expect(
      document.body.querySelector('[data-testid="periodo-capital-e-interes-2026-01"]'),
    ).toBeTruthy();
    expect(document.body.querySelector('[data-testid="cartera-intereses"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="maximo-con-intereses"]')).toBeTruthy();

    escribir('#monto-recibo', '1962429');
    const parte = document.body.querySelector('[data-testid="plan-parte-2026-01"]');
    expect(parte?.textContent).toContain('recibos.form.plan.intereses');
    expect(document.body.querySelector('[data-testid="plan-queda-2026-01"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="plan-interes-primero"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-deuda-restante"]')?.textContent).toContain(
      '0',
    );

    elegirMedio('efectivo');
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ valorCop: 1_962_429 });
  });

  it('avisa cuando un período tiene plata que ningún recibo respalda', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        total: 600_000,
        vencidoCop: 600_000,
        futuroCop: 0,
        cuotas: [periodo('c-jun', '2026-06', 600_000, { paidAmount: 400_000, sinRespaldo: 400_000 })],
      }),
    );
    await abrir();

    expect(document.body.querySelector('[data-testid="aviso-sin-conciliar"]')).toBeTruthy();
  });
});

describe('<RegistrarPagoModal> qué día entró', () => {
  /*
   * 🔴 Visto en el navegador a las 19:03 de Colombia: el recibo salió fechado
   * el 13 de septiembre teniendo que ser el 12. `toISOString()` da la fecha
   * UTC, y Colombia va cinco horas atrás — de las 7 de la tarde en adelante el
   * campo venía prellenado con MAÑANA, y su `max` dejaba elegirlo.
   */
  it('prellena HOY en Bogotá, no la fecha UTC', async () => {
    const real = Date;
    // 2026-09-13T00:03Z = 2026-09-12, 19:03 en Bogotá.
    vi.setSystemTime(new real('2026-09-13T00:03:00.000Z'));
    await abrir();

    const campo = document.body.querySelector<HTMLInputElement>('#fecha-recibo');
    expect(campo?.value).toBe('2026-09-12');
    expect(campo?.getAttribute('max')).toBe('2026-09-12');
    vi.useRealTimers();
  });

  it('manda esa fecha, no la de UTC', async () => {
    vi.setSystemTime(new Date('2026-09-13T00:03:00.000Z'));
    const onSubmit = await abrir();
    elegirMedio('efectivo');
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ fecha: '2026-09-12' });
    vi.useRealTimers();
  });
});

describe('<RegistrarPagoModal> el monto', () => {
  it('🔴 manda lo VENCIDO cuando no se toca el campo prellenado', async () => {
    const onSubmit = await abrir();
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cobroId: 'c-ago',
      valorCop: 3_000_000,
      medio: 'efectivo',
    });
    // 🔴 NUNCA manda a qué cobro va la plata: eso lo decide el back.
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('tenantId');
  });

  it('🔴 lee «1.000.000» como 1.000.000, no como 1', async () => {
    const onSubmit = await abrir();
    // Exactamente lo que el formato colombiano pone en el campo. El parser
    // viejo (`parseFloat` tras cambiar la coma por punto) devolvía 1.
    escribir('#monto-recibo', '$ 1.000.000');
    elegirMedio('efectivo');
    await enviar();

    expect((onSubmit.mock.calls[0][0] as { valorCop: number }).valorCop).toBe(1_000_000);
  });

  it('el botón de emitir está enlazado al formulario que vive en el cuerpo', async () => {
    await abrir();
    // El pie del modal es hermano del <form>, no su hijo: sin el atributo
    // `form` el botón de submit no dispara nada y el modal se ve muerto.
    const emitir = porTexto('recibos.form.emitir')[0];
    expect(emitir.getAttribute('type')).toBe('submit');
    expect(emitir.getAttribute('form')).toBe('form-recibo-de-caja');
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });

  it('no deja emitir por encima de la deuda y dice cuál es el máximo', async () => {
    await abrir();
    escribir('#monto-recibo', '9000000');

    expect(document.body.textContent).toContain('recibos.form.montoExcede');
    expect(porTexto('recibos.form.emitir')[0].disabled).toBe(true);
  });

  it('no manda los saludos vacíos', async () => {
    const onSubmit = await abrir();
    elegirMedio('transferencia');
    await enviar();

    const cuerpo = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('notas');
    // La referencia salió del formulario: Nico enumeró los campos y cerró con
    // «y nada más».
    expect(cuerpo).not.toHaveProperty('referencia');
  });

  it('los saludos que se escriben viajan como `notas`', async () => {
    const onSubmit = await abrir();
    escribir('#saludos-recibo', '  Gracias por tu pago.  ');
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ notas: 'Gracias por tu pago.' });
  });

  it('exige elegir el medio antes de emitir', async () => {
    await abrir();
    expect(porTexto('recibos.form.emitir')[0].disabled).toBe(true);
  });

  /*
   * 🔴 El caso que de verdad costaba plata. Con una deuda de SEIS cifras el
   * campo prellenado tenía UN solo separador: `parseFloat('500.000')` da
   * **500**, un entero perfectamente válido que el back aceptaba sin chistar.
   * O sea: el error silencioso vivía justo en el rango de canon más común.
   */
  it.each([[85_000], [500_000], [950_000]])(
    'una deuda de %i se paga COMPLETA, no en su milésima parte',
    async (deuda) => {
      carteraPorCobro.mockResolvedValue(
        debeTresMeses({ total: deuda, vencidoCop: deuda, futuroCop: 0, cuotas: [periodo('c-jun', '2026-06', deuda)] }),
      );
      const onSubmit = await abrir();
      elegirMedio('efectivo');
      await enviar();

      const enviado = (onSubmit.mock.calls[0][0] as { valorCop: number }).valorCop;
      expect(enviado).toBe(deuda);
      expect(enviado).not.toBe(deuda / 1000);
    },
  );
});

describe('<RegistrarPagoModal> los rechazos del back', () => {
  it('🔴 muestra el mensaje del 400 del sobrepago TAL CUAL', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(400, 'El pago excede lo que Jose Lopez debe ($3.000.000)'));
    await abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.textContent).toContain('El pago excede lo que Jose Lopez debe ($3.000.000)');
    // Y NO se pasa a conciliar: un 400 no es un pago sin conciliar.
    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
  });

  it('🔴 el 409 abre la conciliación del período que trabó el pago', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'El cobro de junio registra $400.000 pagados sin recibo', 'PLATA_SIN_RECIBO', {
          cobroId: 'c-jun',
        }),
      );
    const onConciliar = vi.fn();
    await abrir({ onSubmit: onSubmit as never, onConciliar: onConciliar as never });
    elegirMedio('efectivo');
    await enviar();

    const panel = document.body.querySelector('[data-testid="panel-conciliacion"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('El cobro de junio registra $400.000 pagados sin recibo');
    expect(panel?.textContent).toContain('recibos.conciliar.queVaAPasar');
  });

  it('la conciliación exige el origen (mínimo 5) y concilia el cobro que dijo el back', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(409, 'sin conciliar', 'PLATA_SIN_RECIBO', { cobroId: 'c-jun' }));
    const onConciliar = vi.fn().mockResolvedValue({
      recibo: { ...RESPUESTA.recibos[0], numero: 'RC-0009', valorCop: 400_000 },
      cobro: { ...COBRO, paidAmount: 400_000, pendingAmount: 600_000, status: 'partial' },
    });
    await abrir({ onSubmit: onSubmit as never, onConciliar: onConciliar as never });
    elegirMedio('efectivo');
    await enviar();

    const confirmar = () => porTexto('recibos.conciliar.confirmar')[0];
    expect(confirmar().disabled).toBe(true);
    escribir('#origen-conciliacion', 'PSE');
    expect(confirmar().disabled).toBe(true);

    escribir('#origen-conciliacion', '  Consignación en Bancolombia  ');
    await act(async () => {
      confirmar().click();
    });

    expect(onConciliar).toHaveBeenCalledWith('c-jun', { origen: 'Consignación en Bancolombia' });
    // Conciliar no es el trámite: es el permiso. Se vuelve al recibo.
    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });

  it('sin onConciliar no ofrece un botón que no puede cumplir', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(409, 'sin conciliar', 'PLATA_SIN_RECIBO', { cobroId: 'c-jun' }));
    await abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar();

    escribir('#origen-conciliacion', 'Pago por PSE del 3 de agosto');
    expect(porTexto('recibos.conciliar.confirmar')[0].disabled).toBe(true);
  });
});

describe('<RegistrarPagoModal> los medios configurados por la inmobiliaria', () => {
  afterEach(() => {
    mediosConfigurados = [];
  });

  it('sin medios configurados ofrece la lista fija y manda su valor histórico', async () => {
    const onSubmit = await abrir();
    expect(porTexto('recibos.form.medios.transferencia')).toHaveLength(1);
    elegirMedio('transferencia');
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ medio: 'transferencia' });
  });

  it('con medios configurados ofrece sólo los activos y manda el NOMBRE del medio', async () => {
    mediosConfigurados = [
      { id: 'm1', nombre: 'Transferencia a Bancolombia', tipo: 'TRANSFERENCIA', activo: true },
      { id: 'm2', nombre: 'Efectivo en la oficina', tipo: 'EFECTIVO', activo: true },
      { id: 'm3', nombre: 'Cuenta vieja', tipo: 'TRANSFERENCIA', activo: false },
    ];
    const onSubmit = await abrir();
    expect(porTexto('recibos.form.medios.transferencia')).toHaveLength(0);
    expect(porTexto('Cuenta vieja')).toHaveLength(0);
    act(() => porTexto('Transferencia a Bancolombia')[0].click());
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ medio: 'Transferencia a Bancolombia' });
  });

  it('un nombre más largo que el DTO viaja recortado a 40 caracteres', async () => {
    const largo = 'Transferencia a la cuenta de ahorros número dos de Bancolombia';
    mediosConfigurados = [{ id: 'm1', nombre: largo, tipo: 'TRANSFERENCIA', activo: true }];
    const onSubmit = await abrir();
    act(() => porTexto(largo)[0].click());
    await enviar();
    const medio = (onSubmit.mock.calls[0][0] as { medio: string }).medio;
    expect(medio).toBe(largo.slice(0, 40));
    expect(medio.length).toBe(40);
  });
});

describe('<RegistrarPagoModal> la llave del recibo (R1)', () => {
  const llaveDe = (onSubmit: ReturnType<typeof vi.fn>, i: number) =>
    (onSubmit.mock.calls[i][0] as { idempotencyKey?: string }).idempotencyKey;

  it('🔴 reintentar tras un fallo manda LA MISMA llave; el recibo siguiente lleva otra', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'fetch failed'))
      .mockResolvedValueOnce(RESPUESTA)
      .mockResolvedValueOnce(RESPUESTA);

    await abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar(); // se cae la red: el primero pudo haber entrado
    await enviar(); // reintento

    expect(onSubmit).toHaveBeenCalledTimes(2);
    const primera = llaveDe(onSubmit, 0);
    expect(typeof primera).toBe('string');
    expect(primera!.length).toBeGreaterThan(0);
    expect(primera!.length).toBeLessThanOrEqual(64);
    expect(llaveDe(onSubmit, 1)).toBe(primera);

    // Salió bien y se cerró. Se abre de nuevo para OTRO recibo.
    await act(async () => {
      root.render(
        <RegistrarPagoModal isOpen={false} onClose={vi.fn()} cobro={COBRO} onSubmit={onSubmit as never} />,
      );
    });
    await abrir({ onSubmit: onSubmit as never });
    escribir('#monto-recibo', '$ 1.000.000');
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit).toHaveBeenCalledTimes(3);
    expect(llaveDe(onSubmit, 2)).toBeTruthy();
    expect(llaveDe(onSubmit, 2)).not.toBe(primera);
  });
});

describe('<RegistrarPagoModal> la fecha del recibo (R4)', () => {
  /*
   * 🔴 R4 (auditoría 13-09): el campo tenía techo (`hoy`) pero no PISO, y un
   * dedo de más escribía un recibo fechado en 2016 — un arqueo que nunca
   * cuadra y que nadie va a encontrar. El piso es el período más viejo que la
   * persona debe: no tiene sentido fechar el pago antes de que existiera la
   * deuda que paga.
   */
  it('no deja fechar el recibo antes del período más viejo que se debe', async () => {
    carteraPorCobro.mockResolvedValue(debeTresMeses());
    await abrir({});

    const campo = document.body.querySelector<HTMLInputElement>('#fecha-recibo');
    expect(campo).toBeTruthy();
    // `debeTresMeses` arranca en 2026-06.
    expect(campo!.getAttribute('min')).toBe('2026-06-01');
    expect(campo!.getAttribute('max')).toBeTruthy();
  });

  /*
   * 🔴 Con deuda SÓLO futura, tomar el período más viejo de la lista dejaba el
   * piso en el futuro (`min` 2026-11-01 contra un `max` de hoy): el campo
   * quedaba imposible de satisfacer y el valor prellenado, fuera de rango.
   */
  it('con deuda sólo futura el piso NO se va al futuro', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    await abrir({});

    const campo = document.body.querySelector<HTMLInputElement>('#fecha-recibo');
    const min = campo!.getAttribute('min')!;
    const max = campo!.getAttribute('max')!;
    expect(min <= max).toBe(true);
    expect(min).toBe(`${new Date().getFullYear()}-01-01`);
  });

  it('sin cartera el piso es el 1.º de enero del año en curso, no el año cero', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({ total: 0, vencidoCop: 0, futuroCop: 0, cuotas: [], anticipoDisponible: true }),
    );
    await abrir({});

    const campo = document.body.querySelector<HTMLInputElement>('#fecha-recibo');
    const anio = new Date().getFullYear();
    expect(campo!.getAttribute('min')).toBe(`${anio}-01-01`);
  });
});

describe('<RegistrarPagoModal> un cliente sin cuotas pendientes (R2)', () => {
  /*
   * 🔴 Sin la migración del saldo a favor (`anticipoDisponible: false`) esto
   * sigue siendo un callejón: el back responde 400 a cualquier plata que no
   * tenga contra qué ir, así que el formulario no se dibuja y el vacío explica
   * POR QUÉ. La regla vieja era «no prometas un anticipo»; la de hoy es «no
   * prometas uno que esta base no puede guardar».
   */
  it('sin saldo a favor disponible lo dice, no dibuja el formulario y deja salir con «Cerrar»', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({ total: 0, vencidoCop: 0, futuroCop: 0, cuotas: [], anticipoDisponible: false }),
    );
    const onClose = vi.fn();
    await abrir({ onClose });

    const vacio = document.body.querySelector('[data-testid="cliente-sin-deuda"] [data-testid="sin-datos"]');
    expect(vacio).toBeTruthy();
    expect(vacio!.textContent).toContain('recibos.form.cartera.sinDeuda');
    // Y lo dice por lo que ES: no queda ninguna cuota, ni vencida ni futura.
    expect(vacio!.textContent).toContain('ni vencida ni por vencer');
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeNull();

    const cerrar = document.body.querySelector<HTMLButtonElement>('[data-testid="cerrar-sin-deuda"]');
    expect(cerrar?.textContent).toBe('Cerrar');
    act(() => cerrar!.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /*
   * Con la migración aplicada, el mismo cliente SÍ puede pagar por adelantado:
   * es el pedido del CEO («no tengo que esperar que se cumpla la fecha»).
   */
  it('con saldo a favor disponible sí se le puede recibir plata por adelantado', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({ total: 0, vencidoCop: 0, futuroCop: 0, cuotas: [], anticipoDisponible: true }),
    );
    await abrir({});

    expect(document.body.querySelector('[data-testid="cliente-sin-deuda"]')).toBeNull();
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });
});

describe('<RegistrarPagoModal> pagar de más', () => {
  /*
   * 🔴 Pagar de más dejó de ser un error (CEO, 2026-09-15). Lo que NO puede
   * pasar es que la plata desaparezca de la pantalla sin explicación: el
   * excedente se nombra antes de emitir.
   */
  it('con saldo a favor disponible acepta más que la deuda y dice cuánto queda a favor', async () => {
    carteraPorCobro.mockResolvedValue(debeTresMeses({ anticipoDisponible: true }));
    await abrir({});
    escribir('#monto-recibo', '$ 5.000.000');

    // 5.000.000 pagados − 3.000.000 de deuda. El `formatCurrency` de este
    // archivo no pone separadores: se afirma sobre la cifra, no sobre el
    // formato, que es del design system y no de esta pantalla.
    const aviso = document.body.querySelector('[data-testid="aviso-a-favor"]');
    expect(aviso?.textContent).toContain('2000000');
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });

  it('sin saldo a favor disponible sigue topando el monto', async () => {
    carteraPorCobro.mockResolvedValue(debeTresMeses({ anticipoDisponible: false }));
    await abrir({});
    escribir('#monto-recibo', '$ 5.000.000');

    expect(document.body.querySelector('[data-testid="aviso-a-favor"]')).toBeNull();
  });
});

describe('<RegistrarPagoModal> la deuda nace con el contrato (2026-09-15)', () => {
  /*
   * 🔴 El defecto que originó el cambio: contrato vigente, ninguna cuota
   * vencida, y el diálogo decía «no debe nada» y no dejaba hacer nada. Nico:
   * «Desde que él comience el contrato ya debe.»
   */
  it('🔴 sin NADA vencido dibuja el formulario y dice que lo que entre es un adelanto', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    await abrir();

    expect(document.body.querySelector('[data-testid="cliente-sin-deuda"]')).toBeNull();
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="aviso-adelanto"]')?.textContent).toContain(
      'recibos.form.cartera.soloAdelanto',
    );
    // El encabezado del diálogo deja de prometer un cobro.
    expect(document.body.textContent).toContain('recibos.form.descripcionAdelanto');
  });

  it('🔴 muestra los dos números por separado y NO los suma en uno solo', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        total: 5_000_000,
        vencidoCop: 3_000_000,
        futuroCop: 2_000_000,
        cuotas: [
          periodo('c-jun', '2026-06', 1_000_000),
          periodo('c-jul', '2026-07', 1_000_000),
          periodo('c-ago', '2026-08', 1_000_000),
          periodo('c-nov', '2026-11', 2_000_000, { vencida: false }),
        ],
      }),
    );
    await abrir();

    expect(document.body.querySelector('[data-testid="cartera-vencido"]')?.textContent).toContain(
      '3000000',
    );
    expect(document.body.querySelector('[data-testid="cartera-futuro"]')?.textContent).toContain(
      '2000000',
    );
    expect(document.body.querySelector('[data-testid="cartera-total"]')?.textContent).toContain(
      '5000000',
    );
    // Y el período futuro queda en su propio grupo, rotulado.
    const futuro = document.body.querySelector('[data-testid="cartera-periodo-2026-11"]');
    expect(futuro?.getAttribute('data-vencida')).toBe('no');
    expect(futuro?.querySelector('[data-testid="periodo-futuro"]')).toBeTruthy();
  });

  /*
   * 🔴 El campo arranca con lo VENCIDO, no con la deuda entera del contrato:
   * prellenar $5.000.000 cuando lo que se reclama hoy son $3.000.000 es
   * ofrecerle a caja un recibo que nadie pidió.
   */
  it('prellena lo vencido, no toda la deuda del contrato', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({ total: 5_000_000, vencidoCop: 3_000_000, futuroCop: 2_000_000 }),
    );
    const onSubmit = await abrir();
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ valorCop: 3_000_000 });
  });

  it('sin nada vencido el campo arranca VACÍO: el monto del adelanto lo dice quien trae la plata', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    await abrir();

    const campo = document.body.querySelector<HTMLInputElement>('#monto-recibo');
    expect(campo?.value ?? '').toBe('');
    // Y no se puede emitir un recibo vacío.
    expect(porTexto('recibos.form.emitir')[0].disabled).toBe(true);
  });

  it('«Paga toda la deuda» llena el total, incluyendo lo que no vence', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    const onSubmit = await abrir();
    act(() => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="atajo-todo"]')!.click();
    });
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ valorCop: 2_000_000 });
  });

  it('🔴 el plan marca qué renglones son ADELANTO', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    await abrir();
    escribir('#monto-recibo', '$ 1.500.000');

    expect(document.body.querySelector('[data-testid="plan-parte-2026-11"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-adelanto-2026-11"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-hay-adelanto"]')).toBeTruthy();
  });

  it('un renglón vencido NO se marca como adelanto', async () => {
    await abrir();
    escribir('#monto-recibo', '$ 1.000.000');

    expect(document.body.querySelector('[data-testid="plan-parte-2026-06"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="plan-adelanto-2026-06"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="plan-hay-adelanto"]')).toBeNull();
  });

  /*
   * 🔴 Con nada vencido, adelantar NO puede seguir topado por la deuda vencida:
   * el máximo es toda la deuda del contrato.
   */
  it('adelantar hasta el total no es un sobrepago', async () => {
    carteraPorCobro.mockResolvedValue(soloDeudaFutura());
    await abrir();
    escribir('#monto-recibo', '$ 2.000.000');
    elegirMedio('efectivo');

    expect(document.body.textContent).not.toContain('recibos.form.montoExcede');
    expect(porTexto('recibos.form.emitir')[0].disabled).toBe(false);
  });
});

describe('<RegistrarPagoModal> los tres conflictos del back no son el mismo', () => {
  /*
   * 🔴 Antes bastaba con que el error fuera 409 para caer en el panel de
   * conciliación, usando el primer período sin conciliar que hubiera a mano.
   * Desde el 2026-09-15 hay tres códigos distintos y dos de ellos NO se
   * arreglan conciliando: mandarlos ahí es hacerle escribir al usuario el
   * origen de una plata que nadie le está preguntando.
   */
  it('🔴 CONTRATO_SIN_MANDATO se dice con palabras, no manda a conciliar', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        cuotas: [periodo('c-jun', '2026-06', 1_000_000, { sinRespaldo: 500_000 })],
        total: 1_000_000,
        vencidoCop: 1_000_000,
        futuroCop: 0,
      }),
    );
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(
        409,
        'El contrato 1686 debe $1.000.000 de 2026-06, pero su inmueble no tiene mandato en esta inmobiliaria y el recibo necesita uno. Asigna el mandato y vuelve a intentarlo.',
        'CONTRATO_SIN_MANDATO',
        { contractId: 'ct1', month: '2026-06' },
      ),
    );
    await abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
    const banner = document.body.querySelector('[data-testid="error-del-back"]');
    expect(banner?.textContent).toContain('no tiene mandato en esta inmobiliaria');
    expect(banner?.textContent).toContain('recibos.form.sinMandato');
  });

  /*
   * 🔴 (2026-09-16) CUOTA_Y_COBRO_NO_CUADRAN: los documentos del mes no cuadran
   * (dos cobros para el mismo mes, o el cobro es de otro contrato del inmueble).
   * Dos trampas: trae `cobroId` en el cuerpo —sin exigir el código caería al
   * panel de conciliación— y un título genérico «no se emitió» invita a
   * reintentar, que no sirve. El texto del back ya viene escrito para caja.
   */
  it('🔴 CUOTA_Y_COBRO_NO_CUADRAN lleva su propio título y no manda a conciliar aunque traiga cobroId', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        cuotas: [periodo('c-jun', '2026-06', 1_000_000, { sinRespaldo: 500_000 })],
        total: 1_000_000,
        vencidoCop: 1_000_000,
        futuroCop: 0,
      }),
    );
    const mensaje =
      'Hay dos cobros de junio de 2026 para Jose Lopez (Apto 101), y la cuota de ese mes ya está respaldada por el otro. ' +
      'Revisa los dos en Cartera → Cobros emitidos y avísale a soporte cuál sobra: desde caja no se puede borrar un cobro.';
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(409, mensaje, 'CUOTA_Y_COBRO_NO_CUADRAN', {
        cobroId: 'c-jun',
        cuotaId: 'q-c-jun',
        month: '2026-06',
      }),
    );
    await abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
    const banner = document.body.querySelector('[data-testid="error-del-back"]');
    expect(banner?.textContent).toContain('recibos.form.cuotaYCobroNoCuadran');
    expect(banner?.textContent).not.toContain('recibos.form.fallo');
    expect(banner?.textContent).toContain('Cartera → Cobros emitidos');
  });

  it('un rechazo sin código conocido conserva el título genérico', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(409, 'Otro conflicto cualquiera', 'CODIGO_NUEVO', {}));
    await abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    const banner = document.body.querySelector('[data-testid="error-del-back"]');
    expect(banner?.textContent).toContain('recibos.form.fallo');
    expect(banner?.textContent).not.toContain('recibos.form.cuotaYCobroNoCuadran');
    expect(banner?.textContent).not.toContain('recibos.form.sinMandato');
  });

  it('DEUDA_MAS_VIEJA tampoco: se muestra el mensaje que dice cuál va primero', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        cuotas: [periodo('c-jun', '2026-06', 1_000_000, { sinRespaldo: 500_000 })],
        total: 1_000_000,
        vencidoCop: 1_000_000,
        futuroCop: 0,
      }),
    );
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(
        409,
        'Jose Lopez debe $1.000.000 de junio de 2026 (Apto 101). La plata va primero a la deuda más vieja.',
        'DEUDA_MAS_VIEJA',
        { cuotaId: 'q-c-jun', cobroId: null, month: '2026-06' },
      ),
    );
    await abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
    expect(document.body.textContent).toContain('va primero a la deuda más vieja');
  });

  it('PLATA_SIN_RECIBO sí abre la conciliación, como siempre', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'plata sin recibo', 'PLATA_SIN_RECIBO', { cobroId: 'c-jun' }),
      );
    await abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeTruthy();
  });
});

describe('<RegistrarPagoModal> la vista previa sigue a la fecha', () => {
  /*
   * 🔴 Prueba en vivo en QA (2026-09-16, contrato #69): al cambiar la fecha
   * del recibo a 2026-08-20 el diálogo seguía mostrando el interés de hoy
   * ($2.588.062) y no salía ningún pedido nuevo. El back sí cobraba hasta la
   * fecha, así que la pantalla mostraba más interés del que se iba a cobrar y
   * «paga toda la deuda» mandaba de más.
   *
   * Hoy: 15-sep-2026. Debe junio, julio y agosto. A hoy el interés es 120.000;
   * al 20-ago, 50.000.
   */
  const HOY = new Date('2026-09-15T17:00:00.000Z');

  const aHoy = () =>
    debeTresMeses({
      total: 3_120_000,
      vencidoCop: 3_120_000,
      interesCop: 120_000,
      liquidadoAl: '2026-09-15',
      pisoDeLaFecha: '2026-06-01',
    });
  const al20DeAgosto = () =>
    debeTresMeses({
      total: 3_050_000,
      vencidoCop: 3_050_000,
      interesCop: 50_000,
      liquidadoAl: '2026-08-20',
      pisoDeLaFecha: '2026-06-01',
    });
  const al1DeSeptiembre = () =>
    debeTresMeses({
      total: 3_090_000,
      vencidoCop: 3_090_000,
      interesCop: 90_000,
      liquidadoAl: '2026-09-01',
      pisoDeLaFecha: '2026-06-01',
    });

  /** Una respuesta que se resuelve cuando la prueba dice. */
  function diferida<T>() {
    let resolver!: (v: T) => void;
    let rechazar!: (e: unknown) => void;
    const promesa = new Promise<T>((res, rej) => {
      resolver = res;
      rechazar = rej;
    });
    return { promesa, resolver, rechazar };
  }

  const total = () =>
    document.body.querySelector('[data-testid="cartera-total"]')?.textContent ?? '';
  const pedidosConFecha = () => carteraPorCobro.mock.calls.filter((c) => c.length > 1);

  /** Deja pasar la espera de la fecha y las respuestas que ya estén listas. */
  async function pasaLaEspera() {
    await act(async () => {
      vi.advanceTimersByTime(ESPERA_DE_LA_FECHA_MS);
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  async function resolverCon<T>(d: ReturnType<typeof diferida<T>>, valor: T) {
    await act(async () => {
      d.resolver(valor);
      await d.promesa;
    });
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(HOY);
    carteraPorCobro.mockImplementation((_id: string, fecha?: string) =>
      Promise.resolve(fecha === '2026-08-20' ? al20DeAgosto() : aHoy()),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('🔴 cambiar la fecha vuelve a pedir la cartera CON esa fecha, y «paga toda la deuda» sigue a la cartera nueva', async () => {
    const onSubmit = await abrir();
    expect(carteraPorCobro).toHaveBeenCalledTimes(1);
    expect(carteraPorCobro).toHaveBeenCalledWith('c-ago');

    act(() => document.body.querySelector<HTMLButtonElement>('[data-testid="atajo-todo"]')!.click());
    elegirMedio('efectivo');
    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();

    expect(pedidosConFecha()).toEqual([['c-ago', '2026-08-20']]);
    expect(total()).toContain('3050000');

    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      fecha: '2026-08-20',
      // El total AL 20 DE AGOSTO, no el de hoy (3.120.000): con el de hoy
      // sobraban 70.000 que iban a dar 400 o a quedar a favor.
      valorCop: 3_050_000,
    });
  });

  it('escribir la fecha a mano no pide en cada tecla: una sola petición cuando se deja de escribir', async () => {
    await abrir();
    escribir('#fecha-recibo', '2026-08-01');
    await act(async () => {
      vi.advanceTimersByTime(ESPERA_DE_LA_FECHA_MS - 100);
    });
    escribir('#fecha-recibo', '2026-08-02');
    await act(async () => {
      vi.advanceTimersByTime(ESPERA_DE_LA_FECHA_MS - 100);
    });
    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();

    expect(pedidosConFecha()).toEqual([['c-ago', '2026-08-20']]);
  });

  it('🔴 la tabla no parpadea: mientras llega la cartera nueva se ve la anterior, se dice, y no se emite con ella', async () => {
    const nueva = diferida<CarteraDelCliente>();
    carteraPorCobro.mockImplementation((_id: string, fecha?: string) =>
      fecha ? nueva.promesa : Promise.resolve(aHoy()),
    );
    const onSubmit = await abrir();
    elegirMedio('efectivo');

    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();

    // La cartera anterior sigue ahí, sin el spinner de «cargando la cartera».
    expect(document.body.querySelector('[data-testid="cartera-del-cliente"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="cartera-cargando"]')).toBeNull();
    expect(total()).toContain('3120000');
    expect(document.body.querySelector('[data-testid="recalculando-interes"]')).toBeTruthy();
    // Con números de otro día no se emite.
    await enviar();
    expect(onSubmit).not.toHaveBeenCalled();

    await resolverCon(nueva, al20DeAgosto());
    expect(total()).toContain('3050000');
    expect(document.body.querySelector('[data-testid="recalculando-interes"]')).toBeNull();
    await enviar();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('🔴 la respuesta de una fecha VIEJA que llega tarde no pisa la de la fecha nueva', async () => {
    const del20 = diferida<CarteraDelCliente>();
    const del1 = diferida<CarteraDelCliente>();
    carteraPorCobro.mockImplementation((_id: string, fecha?: string) =>
      fecha === '2026-08-20'
        ? del20.promesa
        : fecha === '2026-09-01'
          ? del1.promesa
          : Promise.resolve(aHoy()),
    );
    const onSubmit = await abrir();
    act(() => document.body.querySelector<HTMLButtonElement>('[data-testid="atajo-todo"]')!.click());
    elegirMedio('efectivo');

    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();
    escribir('#fecha-recibo', '2026-09-01');
    await pasaLaEspera();
    expect(pedidosConFecha()).toEqual([
      ['c-ago', '2026-08-20'],
      ['c-ago', '2026-09-01'],
    ]);

    // Llega primero la nueva y DESPUÉS la vieja.
    await resolverCon(del1, al1DeSeptiembre());
    await resolverCon(del20, al20DeAgosto());

    expect(total()).toContain('3090000');
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      fecha: '2026-09-01',
      valorCop: 3_090_000,
    });
  });

  it('🔴 cambiar la fecha NO borra el formulario ni devuelve la fecha a hoy', async () => {
    await abrir();
    elegirMedio('efectivo');
    escribir('#saludos-recibo', 'Gracias por el pago');
    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();

    expect(document.body.querySelector<HTMLInputElement>('#fecha-recibo')!.value).toBe('2026-08-20');
    expect(document.body.querySelector<HTMLTextAreaElement>('#saludos-recibo')!.value).toBe(
      'Gracias por el pago',
    );
    // Y no entró en un bucle de pedidos: uno de hoy y uno del 20.
    await pasaLaEspera();
    expect(carteraPorCobro).toHaveBeenCalledTimes(2);
  });

  it('un monto escrito a mano NO se mueve con la fecha; el prellenado con lo vencido sí', async () => {
    // Los envíos fallan a propósito: uno que sale bien cierra el formulario.
    const onSubmit = await abrir({
      onSubmit: vi.fn().mockRejectedValue(new ApiError(500, 'caído')) as never,
    });
    elegirMedio('efectivo');

    // Prellenado con lo vencido de hoy → sigue a lo vencido del 20.
    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ valorCop: 3_050_000 });

    // Escrito a mano → se queda.
    escribir('#monto-recibo', '$ 1.000.000');
    escribir('#fecha-recibo', '2026-09-15');
    await pasaLaEspera();
    await enviar();
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ valorCop: 1_000_000, fecha: '2026-09-15' });
  });

  it('el piso lo manda el back: un día antes no se pide y el campo dice desde cuándo', async () => {
    carteraPorCobro.mockImplementation(() =>
      Promise.resolve({ ...aHoy(), pisoDeLaFecha: '2026-08-01' }),
    );
    const onSubmit = await abrir();
    elegirMedio('efectivo');

    const campo = document.body.querySelector<HTMLInputElement>('#fecha-recibo')!;
    // Las cuotas empiezan en junio, pero el piso es el que dijo el servidor.
    expect(campo.getAttribute('min')).toBe('2026-08-01');

    escribir('#fecha-recibo', '2026-07-15');
    await pasaLaEspera();
    expect(pedidosConFecha()).toEqual([]);
    expect(document.body.querySelector('[data-testid="fecha-antes-del-piso"]')?.textContent).toContain(
      'recibos.form.fechaAntesDeLaDeuda',
    );
    await enviar();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('🔴 el 400 del back sobre la fecha va al campo, tal cual, y la cartera anterior se queda', async () => {
    const mensaje =
      'El recibo no puede quedar fechado el 20 de agosto de 2026: la deuda más vieja de Jose Lopez es de septiembre de 2026.';
    carteraPorCobro.mockImplementation((_id: string, fecha?: string) =>
      fecha
        ? Promise.reject(
            new ApiError(400, mensaje, 'FECHA_ANTERIOR_A_LA_DEUDA', {
              piso: '2026-09-01',
              fecha,
            }),
          )
        : Promise.resolve(aHoy()),
    );
    const onSubmit = await abrir();
    elegirMedio('efectivo');

    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();

    expect(document.body.querySelector('[data-testid="error-de-la-fecha"]')?.textContent).toBe(mensaje);
    expect(document.body.querySelector('[data-testid="cartera-del-cliente"]')).toBeTruthy();
    expect(total()).toContain('3120000');
    await enviar();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('🔴 R1: cambiar la fecha después de un fallo NO cambia la llave del recibo', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'fetch failed'))
      .mockResolvedValueOnce(RESPUESTA);
    await abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar(); // se cae la red: pudo haber entrado

    escribir('#fecha-recibo', '2026-08-20');
    await pasaLaEspera();
    await enviar();

    expect(onSubmit).toHaveBeenCalledTimes(2);
    const llave = (i: number) =>
      (onSubmit.mock.calls[i][0] as { idempotencyKey?: string }).idempotencyKey;
    expect(llave(0)).toBeTruthy();
    expect(llave(1)).toBe(llave(0));
  });
});
