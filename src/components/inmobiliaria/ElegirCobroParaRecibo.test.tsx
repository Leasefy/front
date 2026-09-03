/**
 * «Hacer recibo de caja» empieza por el INMUEBLE, no por los cobros del mes
 * (Nico, 2026-09-03). Las reglas puras se prueban solas; el DOM del diálogo
 * completo, con el Combobox de cadence reemplazado por un <select>.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro, Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getAllMock, generateMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  generateMock: vi.fn(),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  cobrosApi: { getAll: getAllMock, generate: generateMock },
  normalizeCobro: (c: unknown) => c,
}));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, v?: Record<string, string>) => (v?.mes ? `${k}:${v.mes}` : k),
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/hooks/use-medios-de-pago', () => ({
  useMediosDePago: () => ({ medios: [], cargando: false, error: null, refrescar: vi.fn() }),
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
// El Combobox de cadence se reemplaza por un <select>: lo que se prueba acá
// son las opciones que recibe y qué pasa al elegir, no el popover.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    value,
    onChange,
  }: {
    options: { value: string; label: string }[];
    value?: string;
    onChange: (v: string | undefined) => void;
  }) =>
    React.createElement(
      'select',
      {
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || undefined),
      },
      [React.createElement('option', { key: '', value: '' }, '—')].concat(
        options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
      ),
    ),
}));

import {
  cobrosPendientesDe,
  etiquetaParaRecibo,
  inmueblesParaRecibo,
} from './ElegirCobroParaRecibo';
import { RegistrarPagoModal } from './RegistrarPagoModal';

const consig = (over: Partial<Consignacion>): Consignacion =>
  ({
    id: 'cons1',
    propertyId: 'p1',
    propertyTitle: 'Apto 101',
    propertyAddress: 'Calle 1 #2-3',
    propertyCode: 7,
    status: 'active',
    availability: 'rented',
    listingType: 'rent',
    currentTenantName: 'Jose Lopez',
    ...over,
  }) as unknown as Consignacion;

const cobro = (over: Partial<Cobro>): Cobro =>
  ({
    id: 'c-2026-08',
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
    adminAmount: 0,
    totalAmount: 1_800_000,
    lateFee: 0,
    totalWithFees: 1_800_000,
    status: 'pending',
    dueDate: '2026-08-05',
    paidAmount: 0,
    pendingAmount: 1_800_000,
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
    ...over,
  }) as Cobro;

describe('inmueblesParaRecibo', () => {
  it('sólo mandatos activos con inmueble; los arrendados primero, después por título', () => {
    const lista = inmueblesParaRecibo([
      consig({ id: 'z', propertyTitle: 'Zeta', availability: 'available' }),
      consig({ id: 'r2', propertyTitle: 'Beta' }),
      consig({ id: 'r1', propertyTitle: 'Alfa' }),
      consig({ id: 't', status: 'terminated' }),
      consig({ id: 'n', propertyId: '' }),
    ]);
    expect(lista.map((c) => c.id)).toEqual(['r1', 'r2', 'z']);
  });
});

describe('etiquetaParaRecibo', () => {
  it('código · título · dirección · arrendado · inquilino, para que todo sea buscable', () => {
    expect(etiquetaParaRecibo(consig({}))).toBe('#7 · Apto 101 · Calle 1 #2-3 · arrendado · Jose Lopez');
  });
  it('sin inquilino no deja el separador colgando', () => {
    expect(etiquetaParaRecibo(consig({ currentTenantName: '  ', availability: 'available' }))).toBe(
      '#7 · Apto 101 · Calle 1 #2-3',
    );
  });
});

describe('cobrosPendientesDe', () => {
  it('sólo los del mandato con saldo, de TODOS los meses, el más reciente primero', () => {
    const lista = cobrosPendientesDe(
      [
        cobro({ id: 'jun', month: '2026-06', status: 'late', pendingAmount: 500 }),
        cobro({ id: 'ago-pagado', month: '2026-08', status: 'paid', pendingAmount: 0 }),
        cobro({ id: 'otro', month: '2026-08', consignacionId: 'cons2' }),
        cobro({ id: 'jul', month: '2026-07', status: 'partial', pendingAmount: 200 }),
        cobro({ id: 'sep', month: '2026-09' }),
        cobro({ id: 'cero', month: '2026-05', status: 'pending', pendingAmount: 0 }),
      ],
      'cons1',
    );
    expect(lista.map((c) => c.id)).toEqual(['sep', 'jul', 'jun']);
  });
});

describe('<RegistrarPagoModal> sin cobro preseleccionado', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    getAllMock.mockReset();
    generateMock.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  function abrir(consignaciones: Consignacion[]) {
    act(() =>
      root.render(
        <RegistrarPagoModal
          isOpen
          onClose={vi.fn()}
          cobro={null}
          consignaciones={consignaciones}
          mesActual="2026-09"
          onSubmit={vi.fn()}
        />,
      ),
    );
  }

  function elegirInmueble(id: string) {
    const select = document.body.querySelector<HTMLSelectElement>('[data-testid="inmueble-recibo"] select')!;
    expect(select).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    return act(async () => {
      setter.call(select, id);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  it('arranca por el inmueble, con el inquilino en la etiqueta, y sin lista de cobros', () => {
    abrir([consig({}), consig({ id: 'cons2', propertyTitle: 'Casa 9', propertyCode: 9, currentTenantName: 'Ana' })]);
    const select = document.body.querySelector<HTMLSelectElement>('[data-testid="inmueble-recibo"] select')!;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      '—',
      '#7 · Apto 101 · Calle 1 #2-3 · arrendado · Jose Lopez',
      '#9 · Casa 9 · Calle 1 #2-3 · arrendado · Ana',
    ]);
    expect(document.body.querySelector('[data-testid="cobros-pendientes"]')).toBeNull();
    expect(getAllMock).not.toHaveBeenCalled();
  });

  it('🔴 al elegir el inmueble trae sus cobros de TODOS los meses (sin `month`) y al elegir uno abre el formulario', async () => {
    getAllMock.mockResolvedValue([
      cobro({ id: 'jul', month: '2026-07', status: 'late', pendingAmount: 300_000, totalWithFees: 1_800_000 }),
      cobro({ id: 'sep', month: '2026-09' }),
      cobro({ id: 'ago', month: '2026-08', status: 'paid', pendingAmount: 0 }),
    ]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    expect(getAllMock).toHaveBeenCalledWith({ consignacionId: 'cons1' });
    const filas = [...document.body.querySelectorAll<HTMLButtonElement>('[data-testid^="cobro-pendiente-"]')];
    expect(filas.map((f) => f.dataset.testid)).toEqual(['cobro-pendiente-2026-09', 'cobro-pendiente-2026-07']);
    expect(filas[1].textContent).toContain('$300000');
    expect(filas[1].textContent).toContain('inmobiliaria.cobros.status.late');

    act(() => filas[1].click());
    // El formulario de siempre, con el saldo del cobro elegido como máximo.
    expect(document.body.querySelector('#form-recibo-de-caja')).not.toBeNull();
    expect(document.body.textContent).toContain('Apto 101 · Jose Lopez');
    expect(document.body.querySelector('[data-testid="elegir-otro-cobro"]')).not.toBeNull();
  });

  it('🔴 sin cobros con saldo lo dice y ofrece generar los del mes en curso; después vuelve a buscar', async () => {
    getAllMock.mockResolvedValueOnce([]).mockResolvedValueOnce([cobro({ id: 'sep', month: '2026-09' })]);
    generateMock.mockResolvedValue(undefined);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    expect(document.body.querySelector('[data-testid="sin-cobros-pendientes"]')).not.toBeNull();
    const generar = document.body.querySelector<HTMLButtonElement>('[data-testid="generar-cobros-del-mes"]')!;
    expect(generar.textContent).toContain('recibos.form.elegir.generar:Septiembre de 2026');

    await act(async () => generar.click());
    await act(async () => {});
    expect(generateMock).toHaveBeenCalledWith('2026-09');
    expect(getAllMock).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector('[data-testid="cobro-pendiente-2026-09"]')).not.toBeNull();
  });

  it('si el cobro del mes ya existe y está en cero no ofrece un «generar» que no va a crear nada', async () => {
    getAllMock.mockResolvedValue([cobro({ id: 'sep', month: '2026-09', status: 'paid', pendingAmount: 0 })]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});
    expect(document.body.querySelector('[data-testid="sin-cobros-pendientes"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="generar-cobros-del-mes"]')).toBeNull();
  });

  it('sin mandatos activos lo dice en vez de mostrar un buscador vacío', () => {
    abrir([consig({ status: 'terminated' })]);
    expect(document.body.querySelector('[data-testid="sin-inmuebles"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="inmueble-recibo"]')).toBeNull();
  });
});
