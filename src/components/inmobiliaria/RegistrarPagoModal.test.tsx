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
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type {
  CarteraDelCliente,
  CobroEnCartera,
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
const carteraPorCobro = vi.fn<(id: string) => Promise<CarteraDelCliente>>();
const cartera = vi.fn<(id: string) => Promise<CarteraDelCliente>>();
vi.mock('@/lib/api/recibos-de-caja.service', () => ({
  recibosDeCajaApi: {
    carteraPorCobro: (id: string) => carteraPorCobro(id),
    cartera: (id: string) => cartera(id),
  },
}));

vi.mock('@/lib/api/inquilinos.service', () => ({
  inquilinosApi: { listar: () => Promise.resolve([]) },
}));

import { ApiError } from '@/lib/api/client';
import { RegistrarPagoModal } from './RegistrarPagoModal';

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
  extra: Partial<CobroEnCartera> = {},
): CobroEnCartera {
  return {
    id,
    month,
    dueDate: `${month}-05T00:00:00.000Z`,
    createdAt: `${month}-01T00:00:00.000Z`,
    consignacionId: 'cons1',
    contractId: null,
    leaseId: 'l1',
    propertyTitle: 'Apto 101',
    tenantName: 'Jose Lopez',
    totalWithFees: pendingAmount,
    paidAmount: 0,
    pendingAmount,
    status: 'PENDING',
    daysLate: 0,
    lateFee: 0,
    sinRespaldo: 0,
    conceptos: [],
    ...extra,
  };
}

/** Debe tres meses de un millón: junio, julio y agosto. */
function debeTresMeses(extra: Partial<CarteraDelCliente> = {}): CarteraDelCliente {
  return {
    tenantId: 't1',
    nombre: 'Jose Lopez',
    documento: '1020304050',
    email: null,
    inmuebles: 1,
    total: 3_000_000,
    cobros: [
      periodo('c-jun', '2026-06', 1_000_000),
      periodo('c-jul', '2026-07', 1_000_000),
      periodo('c-ago', '2026-08', 1_000_000),
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
      cobroId: 'c-jun',
      month: '2026-06',
      propertyTitle: 'Apto 101',
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
        cobros: [
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
      debeTresMeses({ total: 0, cobros: [] }),
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
        cobros: [
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

  it('avisa cuando un período tiene plata que ningún recibo respalda', async () => {
    carteraPorCobro.mockResolvedValue(
      debeTresMeses({
        total: 600_000,
        cobros: [periodo('c-jun', '2026-06', 600_000, { paidAmount: 400_000, sinRespaldo: 400_000 })],
      }),
    );
    await abrir();

    expect(document.body.querySelector('[data-testid="aviso-sin-conciliar"]')).toBeTruthy();
  });
});

describe('<RegistrarPagoModal> el monto', () => {
  it('🔴 manda TODA la deuda cuando no se toca el campo prellenado', async () => {
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
        debeTresMeses({ total: deuda, cobros: [periodo('c-jun', '2026-06', deuda)] }),
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
