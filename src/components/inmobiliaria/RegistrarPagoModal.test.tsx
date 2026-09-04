/**
 * RegistrarPagoModal.test.tsx — el formulario del recibo de caja.
 *
 * Tres cosas que se rompieron o se pueden romper en silencio:
 *
 * 1. 🔴 El monto. El campo viene prellenado con el saldo, y el parser anterior
 *    convertía «1.800.000» en **1.8** (`parseFloat` sobre el formato es-CL, que
 *    usa el punto como separador de miles). Nada fallaba: el back recibía un
 *    recibo por un peso con ochenta. El primer test manda el monto prellenado
 *    sin tocarlo y comprueba la cifra que sale.
 *
 * 2. 🔴 El 409. Le pasa a TODO cobro anterior al recibo de caja y a los de PSE.
 *    Sin la salida a conciliar, el módulo no sirve sobre la cartera viva.
 *
 * 3. 🔴 El mensaje del back. El 400 del sobrepago trae el máximo abonable; si
 *    se cambia por un «hubo un error», el usuario no sabe cuánto puede abonar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro } from '@/lib/types/inmobiliaria';
import type { RespuestaDeRecibo } from '@/lib/api/recibos-de-caja.types';

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

// El detalle se pide por HTTP; acá interesa el formulario, no la petición.
let mediosConfigurados: { id: string; nombre: string; tipo: string; activo: boolean }[] = [];
vi.mock('@/lib/hooks/use-medios-de-pago', () => ({
  useMediosDePago: () => ({ medios: mediosConfigurados, cargando: false, error: null, refrescar: vi.fn() }),
}));

vi.mock('@/lib/hooks/useDetalleDeCobro', () => ({
  useDetalleDeCobro: () => ({
    detalle: null,
    conceptos: [],
    recibos: [],
    cargando: false,
    falloDesglose: false,
    falloRecibos: false,
    recargar: vi.fn(),
    aplicarRespuesta: vi.fn(),
  }),
}));

import { ApiError } from '@/lib/api/client';
import { RegistrarPagoModal } from './RegistrarPagoModal';

const COBRO: Cobro = {
  id: 'c1',
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
  rentAmount: 1_800_000,
  adminAmount: 150_000,
  totalAmount: 1_950_000,
  lateFee: 50_000,
  totalWithFees: 2_000_000,
  status: 'pending',
  dueDate: '2026-08-05',
  paidAmount: 0,
  pendingAmount: 1_800_000,
  daysLate: 0,
  remindersSent: 0,
  createdAt: '2026-08-01',
  updatedAt: '2026-08-01',
};

const RESPUESTA: RespuestaDeRecibo = {
  recibo: {
    id: 'rc-1',
    numero: 'RC-0001',
    valorCop: 1_800_000,
    fecha: '2026-08-31',
    medio: 'efectivo',
    referencia: null,
    notas: null,
    registradoPorUserId: 'u-1',
    anuladoAt: null,
  },
  cobro: { ...COBRO, paidAmount: 1_800_000, pendingAmount: 0, status: 'paid' },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

function abrir(props: Partial<Parameters<typeof RegistrarPagoModal>[0]> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(RESPUESTA);
  act(() =>
    root.render(
      <RegistrarPagoModal
        isOpen
        onClose={vi.fn()}
        cobro={COBRO}
        onSubmit={onSubmit as never}
        {...props}
      />,
    ),
  );
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

describe('<RegistrarPagoModal> el monto', () => {
  it('🔴 manda el saldo COMPLETO cuando no se toca el campo prellenado', async () => {
    const onSubmit = abrir();
    elegirMedio('efectivo');
    await enviar();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // El bug viejo mandaba 1.8 acá. Un peso con ochenta.
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cobroId: 'c1',
      valorCop: 1_800_000,
      medio: 'efectivo',
    });
  });

  it('🔴 lee «1.800.000» como 1.800.000, no como 1,8', async () => {
    const onSubmit = abrir();
    // Exactamente lo que el formato colombiano pone en el campo. El parser
    // viejo (`parseFloat` tras cambiar la coma por punto) devolvía 1.8.
    escribir('#monto-recibo', '$ 1.800.000');
    elegirMedio('efectivo');
    await enviar();

    expect((onSubmit.mock.calls[0][0] as { valorCop: number }).valorCop).toBe(1_800_000);
  });

  it('el botón de emitir está enlazado al formulario que vive en el cuerpo', () => {
    abrir();
    // El pie del modal es hermano del <form>, no su hijo: sin el atributo
    // `form` el botón de submit no dispara nada y el modal se ve muerto.
    const emitir = porTexto('recibos.form.emitir')[0];
    expect(emitir.getAttribute('type')).toBe('submit');
    expect(emitir.getAttribute('form')).toBe('form-recibo-de-caja');
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });

  it('muestra el máximo abonable', () => {
    abrir();
    expect(document.body.textContent).toContain('recibos.form.maximo');
  });

  it('dice cuánto queda pendiente después de este abono', () => {
    abrir();
    escribir('#monto-recibo', '500000');

    expect(document.body.textContent).toContain('recibos.form.quedaPendiente');
    expect(document.body.textContent).not.toContain('recibos.form.quedaEnCero');
  });

  it('dice que el cobro queda en cero cuando se abona todo', () => {
    abrir();
    expect(document.body.textContent).toContain('recibos.form.quedaEnCero');
  });

  it('no deja emitir por encima del saldo y dice cuál es el máximo', () => {
    abrir();
    escribir('#monto-recibo', '9000000');

    expect(document.body.textContent).toContain('recibos.form.montoExcede');
    const emitir = porTexto('recibos.form.emitir')[0];
    expect(emitir.disabled).toBe(true);
  });

  it('no manda las claves opcionales vacías', async () => {
    const onSubmit = abrir();
    elegirMedio('transferencia');
    await enviar();

    const cuerpo = onSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty('referencia');
    expect(cuerpo).not.toHaveProperty('notas');
  });

  it('exige elegir el medio antes de emitir', () => {
    abrir();
    const emitir = porTexto('recibos.form.emitir')[0];
    expect(emitir.disabled).toBe(true);
  });
});

describe('<RegistrarPagoModal> los rechazos del back', () => {
  it('🔴 muestra el mensaje del 400 del sobrepago TAL CUAL', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(400, 'El máximo abonable para este cobro es $1.800.000'));
    abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar();

    expect(document.body.textContent).toContain(
      'El máximo abonable para este cobro es $1.800.000',
    );
    // Y NO se pasa a conciliar: un 400 no es un pago sin conciliar.
    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
  });

  it('🔴 el 409 abre la conciliación con el mensaje del back a la vista', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'El cobro registra $900.000 pagados y sólo $400.000 con recibo'),
      );
    abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    const panel = document.body.querySelector('[data-testid="panel-conciliacion"]');
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain(
      'El cobro registra $900.000 pagados y sólo $400.000 con recibo',
    );
    // Y explica qué va a pasar si concilia.
    expect(panel?.textContent).toContain('recibos.conciliar.queVaAPasar');
  });

  it('la conciliación exige el origen (mínimo 5) antes de dejar confirmar', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, 'sin conciliar'));
    abrir({ onSubmit: onSubmit as never, onConciliar: vi.fn() as never });
    elegirMedio('efectivo');
    await enviar();

    const confirmar = () => porTexto('recibos.conciliar.confirmar')[0];
    expect(confirmar().disabled).toBe(true);

    escribir('#origen-conciliacion', 'PSE');
    expect(confirmar().disabled).toBe(true);

    escribir('#origen-conciliacion', 'Pago por PSE del 3 de agosto');
    expect(confirmar().disabled).toBe(false);
  });

  it('conciliar manda sólo el origen recortado y vuelve al formulario', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, 'sin conciliar'));
    const onConciliar = vi.fn().mockResolvedValue({
      recibo: { ...RESPUESTA.recibo, numero: 'RC-0009', valorCop: 500_000 },
      cobro: { ...COBRO, paidAmount: 500_000, pendingAmount: 1_300_000, status: 'partial' },
    });
    abrir({ onSubmit: onSubmit as never, onConciliar: onConciliar as never });
    elegirMedio('efectivo');
    await enviar();

    escribir('#origen-conciliacion', '  Consignación en Bancolombia  ');
    await act(async () => {
      porTexto('recibos.conciliar.confirmar')[0].click();
    });

    expect(onConciliar).toHaveBeenCalledWith('c1', { origen: 'Consignación en Bancolombia' });
    // Conciliar no es el trámite: es el permiso. Se vuelve al recibo.
    expect(document.body.querySelector('[data-testid="panel-conciliacion"]')).toBeNull();
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeTruthy();
  });

  it('sin onConciliar no ofrece un botón que no puede cumplir', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(409, 'sin conciliar'));
    abrir({ onSubmit: onSubmit as never });
    elegirMedio('efectivo');
    await enviar();

    escribir('#origen-conciliacion', 'Pago por PSE del 3 de agosto');
    expect(porTexto('recibos.conciliar.confirmar')[0].disabled).toBe(true);
  });
});

describe('<RegistrarPagoModal> el desglose', () => {
  it('🔴 el desglose está a la vista MIENTRAS se hace el recibo', () => {
    abrir();
    // Es el punto de todo el cambio: sin esto se acepta un abono parcial
    // creyendo que el cliente quedó al día.
    expect(document.body.querySelector('[data-testid="desglose-adeudado"]')).toBeTruthy();
  });

  /*
   * 🔴 El caso que de verdad costaba plata, y que el test de «1.800.000 → 1.8»
   * no cubre.
   *
   * Con un saldo de SEIS cifras el campo prellenado tenía UN solo separador:
   * `parseFloat('500.000')` da **500**, que es un entero perfectamente válido.
   * El back lo aceptaba sin chistar y registraba la milésima parte del pago.
   * Con siete cifras el resultado era decimal y al menos rebotaba con un 400.
   *
   * O sea: el error silencioso vivía justo en el rango de canon más común.
   */
  it.each([[85_000], [500_000], [950_000]])(
    'un saldo de %i se abona COMPLETO, no en su milésima parte',
    async (saldo) => {
      const onSubmit = abrir({
        cobro: { ...COBRO, pendingAmount: saldo, totalWithFees: saldo },
      });
      elegirMedio('efectivo');
      await enviar();

      const enviado = (onSubmit.mock.calls[0][0] as { valorCop: number }).valorCop;
      expect(enviado).toBe(saldo);
      // Lo que fallaba: mandar 500 cuando el saldo eran 500.000.
      expect(enviado).not.toBe(saldo / 1000);
    },
  );
});

describe('<RegistrarPagoModal> los medios configurados por la inmobiliaria', () => {
  afterEach(() => {
    mediosConfigurados = [];
  });

  it('sin medios configurados ofrece la lista fija y manda su valor histórico', async () => {
    const onSubmit = abrir();
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
    const onSubmit = abrir();
    expect(porTexto('recibos.form.medios.transferencia')).toHaveLength(0);
    expect(porTexto('Cuenta vieja')).toHaveLength(0);
    act(() => porTexto('Transferencia a Bancolombia')[0].click());
    await enviar();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ medio: 'Transferencia a Bancolombia' });
  });

  it('un nombre más largo que el DTO viaja recortado a 40 caracteres', async () => {
    const largo = 'Transferencia a la cuenta de ahorros número dos de Bancolombia';
    mediosConfigurados = [{ id: 'm1', nombre: largo, tipo: 'TRANSFERENCIA', activo: true }];
    const onSubmit = abrir();
    act(() => porTexto(largo)[0].click());
    await enviar();
    const medio = (onSubmit.mock.calls[0][0] as { medio: string }).medio;
    expect(medio).toBe(largo.slice(0, 40));
    expect(medio.length).toBe(40);
  });
});
