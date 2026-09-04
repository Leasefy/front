/**
 * «Hacer recibo de caja» empieza por el INMUEBLE, no por los cobros del mes
 * (Nico, 2026-09-03), y después tiene DOS caminos: contra un cobro pendiente
 * o de un mes sin cobro (se crea el cobro de ese inmueble y se sigue). Las
 * reglas puras se prueban solas; el DOM del diálogo completo, con el
 * Combobox de cadence reemplazado por un <select>.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Cobro, Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { getAllMock, generateOneMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  generateOneMock: vi.fn(),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  cobrosApi: { getAll: getAllMock, generateOne: generateOneMock },
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
  mesesParaCobroNuevo,
  mesSugerido,
  sumarMeses,
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

describe('meses para un cobro nuevo', () => {
  it('sumarMeses cruza el año en las dos direcciones', () => {
    expect(sumarMeses('2026-11', 2)).toBe('2027-01');
    expect(sumarMeses('2026-01', -2)).toBe('2025-11');
    expect(sumarMeses('2026-09', 0)).toBe('2026-09');
  });

  it('la ventana es 2 atrás y 3 adelante, sin los meses que ya tienen cobro (pagado o no) de ESE mandato', () => {
    const meses = mesesParaCobroNuevo(
      [
        cobro({ id: 'ago', month: '2026-08', status: 'paid', pendingAmount: 0 }),
        cobro({ id: 'oct', month: '2026-10' }),
        cobro({ id: 'ajeno', month: '2026-09', consignacionId: 'cons2' }),
      ],
      'cons1',
      '2026-09',
    );
    expect(meses).toEqual(['2026-07', '2026-09', '2026-11', '2026-12']);
  });

  it('propone el mes en curso; si ya se cobró, el primero libre hacia adelante; si nada adelante, el último de atrás', () => {
    expect(mesSugerido(['2026-07', '2026-09', '2026-11'], '2026-09')).toBe('2026-09');
    expect(mesSugerido(['2026-07', '2026-10'], '2026-09')).toBe('2026-10');
    expect(mesSugerido(['2026-07', '2026-08'], '2026-09')).toBe('2026-08');
    expect(mesSugerido([], '2026-09')).toBe('');
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
    generateOneMock.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
  });

  function abrir(consignaciones: Consignacion[], onCobrosGenerados?: () => void) {
    act(() =>
      root.render(
        <RegistrarPagoModal
          isOpen
          onClose={vi.fn()}
          cobro={null}
          consignaciones={consignaciones}
          mesActual="2026-09"
          onCobrosGenerados={onCobrosGenerados}
          onSubmit={vi.fn()}
        />,
      ),
    );
  }

  function elegirEn(testid: string, valor: string) {
    const select = document.body.querySelector<HTMLSelectElement>(`[data-testid="${testid}"] select`)!;
    expect(select).toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    return act(async () => {
      setter.call(select, valor);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  const elegirInmueble = (id: string) => elegirEn('inmueble-recibo', id);

  /** El SegmentedControl real de cadence: un radiogroup de botones. */
  function segmento(camino: 'opcionPendiente' | 'opcionNuevo') {
    return document.body.querySelector<HTMLButtonElement>(
      `[role="radio"][aria-label="recibos.form.elegir.${camino}"]`,
    )!;
  }

  it('arranca por el inmueble, con el inquilino en la etiqueta, y sin caminos ni lista de cobros', () => {
    abrir([consig({}), consig({ id: 'cons2', propertyTitle: 'Casa 9', propertyCode: 9, currentTenantName: 'Ana' })]);
    const select = document.body.querySelector<HTMLSelectElement>('[data-testid="inmueble-recibo"] select')!;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      '—',
      '#7 · Apto 101 · Calle 1 #2-3 · arrendado · Jose Lopez',
      '#9 · Casa 9 · Calle 1 #2-3 · arrendado · Ana',
    ]);
    expect(document.body.querySelector('[role="radiogroup"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="cobros-pendientes"]')).toBeNull();
    expect(getAllMock).not.toHaveBeenCalled();
  });

  it('🔴 con saldo pendiente arranca en «contra un cobro pendiente»: trae los cobros de TODOS los meses (sin `month`) y al elegir uno abre el formulario', async () => {
    getAllMock.mockResolvedValue([
      cobro({ id: 'jul', month: '2026-07', status: 'late', pendingAmount: 300_000, totalWithFees: 1_800_000 }),
      cobro({ id: 'sep', month: '2026-09' }),
      cobro({ id: 'ago', month: '2026-08', status: 'paid', pendingAmount: 0 }),
    ]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    expect(getAllMock).toHaveBeenCalledWith({ consignacionId: 'cons1' });
    expect(segmento('opcionPendiente').getAttribute('aria-checked')).toBe('true');
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

  it('🔴 sin cobros con saldo pasa solo a «de un mes sin cobro», propone el mes en curso, y al crear el cobro de ESE inmueble abre el formulario con él', async () => {
    getAllMock.mockResolvedValue([]);
    const nuevo = cobro({ id: 'sep', month: '2026-09' });
    generateOneMock.mockResolvedValue({ cobro: nuevo, creado: true });
    const onCobrosGenerados = vi.fn();
    abrir([consig({})], onCobrosGenerados);
    await elegirInmueble('cons1');
    await act(async () => {});

    expect(segmento('opcionNuevo').getAttribute('aria-checked')).toBe('true');
    expect(document.body.querySelector('[data-testid="sin-cobros-pendientes"]')).toBeNull();
    const mes = document.body.querySelector<HTMLSelectElement>('[data-testid="mes-para-cobro"] select')!;
    expect(mes.value).toBe('2026-09');
    expect([...mes.options].map((o) => o.value)).toEqual([
      '',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    const crear = document.body.querySelector<HTMLButtonElement>('[data-testid="crear-cobro-del-mes"]')!;
    expect(crear.textContent).toContain('recibos.form.elegir.crear:Septiembre de 2026');

    await act(async () => crear.click());
    await act(async () => {});
    expect(generateOneMock).toHaveBeenCalledWith('cons1', '2026-09');
    expect(onCobrosGenerados).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('#form-recibo-de-caja')).not.toBeNull();
    expect(document.body.textContent).toContain('Apto 101 · Jose Lopez');
  });

  it('el mes se puede cambiar: cobrar octubre por adelantado crea el cobro de octubre', async () => {
    getAllMock.mockResolvedValue([]);
    generateOneMock.mockResolvedValue({ cobro: cobro({ id: 'oct', month: '2026-10' }), creado: true });
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    await elegirEn('mes-para-cobro', '2026-10');
    const crear = document.body.querySelector<HTMLButtonElement>('[data-testid="crear-cobro-del-mes"]')!;
    expect(crear.textContent).toContain('Octubre de 2026');
    await act(async () => crear.click());
    await act(async () => {});
    expect(generateOneMock).toHaveBeenCalledWith('cons1', '2026-10');
  });

  it('si el mes en curso ya tiene cobro (pagado), no lo ofrece y propone el siguiente libre', async () => {
    getAllMock.mockResolvedValue([cobro({ id: 'sep', month: '2026-09', status: 'paid', pendingAmount: 0 })]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    const mes = document.body.querySelector<HTMLSelectElement>('[data-testid="mes-para-cobro"] select')!;
    expect([...mes.options].map((o) => o.value)).not.toContain('2026-09');
    expect(mes.value).toBe('2026-10');
  });

  it('con saldo pendiente igual se puede pasar a «de un mes sin cobro» y volver', async () => {
    getAllMock.mockResolvedValue([cobro({ id: 'sep', month: '2026-09' })]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    act(() => segmento('opcionNuevo').click());
    expect(document.body.querySelector('[data-testid="mes-sin-cobro"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="cobros-pendientes"]')).toBeNull();
    // Septiembre ya tiene cobro (el pendiente): la ventana lo salta.
    const mes = document.body.querySelector<HTMLSelectElement>('[data-testid="mes-para-cobro"] select')!;
    expect(mes.value).toBe('2026-10');

    act(() => segmento('opcionPendiente').click());
    expect(document.body.querySelector('[data-testid="cobro-pendiente-2026-09"]')).not.toBeNull();
  });

  it('el vacío de «contra un cobro pendiente» lleva al otro camino con un botón', async () => {
    getAllMock.mockResolvedValue([]);
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    act(() => segmento('opcionPendiente').click());
    expect(document.body.querySelector('[data-testid="sin-cobros-pendientes"]')).not.toBeNull();
    act(() => document.body.querySelector<HTMLButtonElement>('[data-testid="pasar-a-mes-nuevo"]')!.click());
    expect(document.body.querySelector('[data-testid="mes-sin-cobro"]')).not.toBeNull();
  });

  it('un inmueble que no está arrendado no tiene canon que cobrar: lo dice y no ofrece crear nada', async () => {
    getAllMock.mockResolvedValue([]);
    abrir([consig({ availability: 'available', currentTenantName: null as unknown as string })]);
    await elegirInmueble('cons1');
    await act(async () => {});

    expect(document.body.querySelector('[data-testid="nuevo-no-arrendado"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="crear-cobro-del-mes"]')).toBeNull();
  });

  it('si el back dice que el cobro ya existía y está pagado, avisa, vuelve a buscar y NO abre el formulario', async () => {
    getAllMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([cobro({ id: 'sep', month: '2026-09', status: 'paid', pendingAmount: 0 })]);
    generateOneMock.mockResolvedValue({
      cobro: cobro({ id: 'sep', month: '2026-09', status: 'paid', pendingAmount: 0 }),
      creado: false,
    });
    const onCobrosGenerados = vi.fn();
    abrir([consig({})], onCobrosGenerados);
    await elegirInmueble('cons1');
    await act(async () => {});

    await act(async () => document.body.querySelector<HTMLButtonElement>('[data-testid="crear-cobro-del-mes"]')!.click());
    await act(async () => {});
    expect(onCobrosGenerados).not.toHaveBeenCalled();
    expect(getAllMock).toHaveBeenCalledTimes(2);
    expect(document.body.querySelector('[data-testid="aviso-mes-pagado"]')?.textContent).toContain(
      'recibos.form.elegir.yaExistePagado:Septiembre de 2026',
    );
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeNull();
    // Y septiembre ya no está entre los meses.
    const mes = document.body.querySelector<HTMLSelectElement>('[data-testid="mes-para-cobro"] select')!;
    expect([...mes.options].map((o) => o.value)).not.toContain('2026-09');
  });

  it('el rechazo del back se muestra tal cual y el formulario no se abre', async () => {
    getAllMock.mockResolvedValue([]);
    generateOneMock.mockRejectedValue(new Error('Este inmueble no está arrendado: no hay canon que cobrar.'));
    abrir([consig({})]);
    await elegirInmueble('cons1');
    await act(async () => {});

    await act(async () => document.body.querySelector<HTMLButtonElement>('[data-testid="crear-cobro-del-mes"]')!.click());
    await act(async () => {});
    expect(document.body.textContent).toContain('no hay canon que cobrar');
    expect(document.body.querySelector('#form-recibo-de-caja')).toBeNull();
  });

  it('sin mandatos activos lo dice en vez de mostrar un buscador vacío', () => {
    abrir([consig({ status: 'terminated' })]);
    expect(document.body.querySelector('[data-testid="sin-inmuebles"]')).not.toBeNull();
    expect(document.body.querySelector('[data-testid="inmueble-recibo"]')).toBeNull();
  });
});
