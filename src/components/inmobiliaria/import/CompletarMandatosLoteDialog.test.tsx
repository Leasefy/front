/**
 * CompletarMandatosLoteDialog.test.tsx — T-0030 WU-3, Slice A (R1), extended
 * 2026-09-02 with the «Uno por uno» mode.
 *
 * The submission logic itself (payload building, 409-as-success, partial
 * failure) is exhaustively covered by `submitMandatosLote.test.ts` — the
 * first block are smoke/wiring tests: the dialog renders the batch, "Hacerlo
 * después" skips without calling onDone, and an empty batch renders nothing
 * (same closed-state contract as the single-row `CompletarMandatoDialog`).
 *
 * The «Uno por uno» block drives the per-row table: two owners → two calls
 * with each one; a row without an owner is not sent and the footer counts
 * it; «copiar el de arriba»; a new owner chosen in two rows is created ONCE;
 * the row filter. The cadence `Combobox` is a Radix Popover that cannot be
 * operated under happy-dom (see AgencyStepForm.test.tsx), so it is replaced
 * by a native `<select>` with the same `value/onChange/options` contract;
 * `PropietarioForm` is replaced by a one-button stub for the same reason
 * (its own tests cover the form).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc: string, [key, val]) => acc.replace(`{{${key}}}`, String(val)),
          k,
        );
      }
      return k;
    },
    locale: 'es',
  }),
}));

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'agente@test.com' } }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const createConsignacionMock = vi.fn();
const createPropietarioMock = vi.fn();
const updatePropertyMock = vi.fn();

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: { create: (...args: unknown[]) => createConsignacionMock(...args) },
  propietariosApi: {
    create: (...args: unknown[]) => createPropietarioMock(...args),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { update: (...args: unknown[]) => updatePropertyMock(...args) },
}));

// The DS Combobox is a Radix Popover — not operable under happy-dom. Same
// contract (value / onChange(value | undefined) / options), native element.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    value,
    onChange,
    options,
    disabled,
  }: {
    value?: string;
    onChange?: (v: string | undefined) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
  }) =>
    React.createElement(
      'select',
      {
        'data-testid': 'combobox-propietario',
        value: value ?? '',
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange?.(e.target.value === '' ? undefined : e.target.value),
      },
      React.createElement('option', { value: '' }, '—'),
      ...options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
    ),
}));

// One button that hands back a fixed new owner — the real form is covered by
// its own tests; here only the wiring (temp id → rows → persisted once) matters.
vi.mock('@/components/inmobiliaria/PropietarioForm', () => ({
  PropietarioForm: ({ onSubmit }: { onSubmit: (d: Record<string, unknown>) => Promise<void> }) =>
    React.createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'guardar-nuevo-propietario',
        onClick: () =>
          void onSubmit({
            name: 'Dueña Nueva',
            email: 'nueva@test.com',
            phone: '3000000000',
            documentType: 'CC',
            documentNumber: '999',
            bankCode: '',
            bankAccountType: 'savings',
            bankAccountNumber: '',
          }),
      },
      'guardar nuevo',
    ),
}));

import { CompletarMandatosLoteDialog } from './CompletarMandatosLoteDialog';
import type { Propietario } from '@/lib/types/inmobiliaria';

function makePropietario(overrides: Partial<Propietario> = {}): Propietario {
  return {
    id: 'owner-1',
    name: 'Ana Pérez',
    email: 'ana@test.com',
    phone: '3001234567',
    documentType: 'CC',
    documentNumber: '123',
    bankAccount: { bankCode: '', bankName: '', accountType: 'savings', accountNumber: '' },
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    ...overrides,
  } as Propietario;
}

function makeInmueble(overrides: Partial<InmuebleSinConsignacion> = {}): InmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyThumbnail: null,
    monthlyRent: 2_500_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  createConsignacionMock.mockReset().mockResolvedValue({});
  createPropietarioMock.mockReset().mockResolvedValue({ id: 'owner-created' });
  updatePropertyMock.mockReset().mockResolvedValue({});
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('<CompletarMandatosLoteDialog> — smoke render', () => {
  it('renders the whole batch, including a ROOM row (same shape as the table traps)', () => {
    expect(() => {
      act(() => {
        root.render(
          <CompletarMandatosLoteDialog
            inmuebles={[
              makeInmueble({ propertyId: 'a', propertyTitle: 'Depto Chicó' }),
              makeInmueble({ propertyId: 'b', propertyTitle: 'Cuarto en Room', propertyType: 'room', propertyZone: '' }),
            ]}
            onClose={vi.fn()}
            propietarios={[]}
            agentes={[]}
            onDone={vi.fn()}
          />,
        );
      });
    }).not.toThrow();
    // Dialog portals its content to `document.body`, not `container`.
    expect(document.body.textContent).toContain('Depto Chicó');
    expect(document.body.textContent).toContain('Cuarto en Room');
  });

  it('renders nothing for an empty batch — same closed-state contract as CompletarMandatoDialog', () => {
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[]}
          onClose={vi.fn()}
          propietarios={[]}
          agentes={[]}
          onDone={vi.fn()}
        />,
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('"Hacerlo después" (skip) calls onClose and never onDone — R2: creates nothing further', () => {
    const onClose = vi.fn();
    const onDone = vi.fn();
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[makeInmueble()]}
          onClose={onClose}
          propietarios={[]}
          agentes={[]}
          onDone={onDone}
        />,
      );
    });

    const skipBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.import.confirm.mandateBatch.skip'),
    );
    expect(skipBtn).toBeTruthy();
    act(() => {
      (skipBtn as HTMLElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('the confirm button starts disabled — no propietario picked yet', () => {
    act(() => {
      root.render(
        <CompletarMandatosLoteDialog
          inmuebles={[makeInmueble()]}
          onClose={vi.fn()}
          propietarios={[]}
          agentes={[]}
          onDone={vi.fn()}
        />,
      );
    });

    const confirmBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.import.confirm.mandateBatch.confirm'),
    );
    expect(confirmBtn).toBeTruthy();
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });
});

// ── «Uno por uno» ────────────────────────────────────────────────────────

const PROPIETARIOS = [
  makePropietario({ id: 'owner-1', name: 'Ana Pérez', documentNumber: '123' }),
  makePropietario({ id: 'owner-2', name: 'Bruno Díaz', documentNumber: '456' }),
];

function renderDialog(inmuebles: InmuebleSinConsignacion[], onDone = vi.fn()) {
  act(() => {
    root.render(
      <CompletarMandatosLoteDialog
        inmuebles={inmuebles}
        onClose={vi.fn()}
        propietarios={PROPIETARIOS}
        agentes={[]}
        onDone={onDone}
      />,
    );
  });
  return onDone;
}

function radios() {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="radiogroup"] [role="radio"]'));
}

function switchToUnoPorUno() {
  const radio = radios().find((r) => r.getAttribute('aria-label')?.includes('modo.unoPorUno'));
  expect(radio).toBeTruthy();
  act(() => {
    radio!.click();
  });
}

function filas() {
  return Array.from(document.body.querySelectorAll<HTMLTableRowElement>('[data-testid="fila-inmueble"]'));
}

function selectDeFila(fila: HTMLTableRowElement) {
  return fila.querySelector('[data-testid="combobox-propietario"]') as HTMLSelectElement;
}

function elegir(select: HTMLSelectElement, value: string) {
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function confirmar() {
  return document.body.querySelector('[data-testid="confirmar-mandatos"]') as HTMLButtonElement;
}

function pie() {
  return document.body.querySelector('[data-testid="pie-para-despues"]') as HTMLElement;
}

async function guardar() {
  await act(async () => {
    confirmar().click();
  });
}

describe('<CompletarMandatosLoteDialog> — modo «Uno por uno»', () => {
  it('shows the mode switch only when there is more than one property', () => {
    renderDialog([makeInmueble({ propertyId: 'a' })]);
    expect(radios().length).toBe(0);

    renderDialog([makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })]);
    expect(radios().length).toBe(2);
    // Starts in «todos»: no per-row table yet.
    expect(filas().length).toBe(0);
  });

  it('assigns two different owners and sends one call per property with each one', async () => {
    const onDone = renderDialog([
      makeInmueble({ propertyId: 'a', propertyTitle: 'Depto A' }),
      makeInmueble({ propertyId: 'b', propertyTitle: 'Depto B' }),
    ]);
    switchToUnoPorUno();
    const [filaA, filaB] = filas();
    expect(filas().length).toBe(2);

    elegir(selectDeFila(filaA), 'owner-1');
    elegir(selectDeFila(filaB), 'owner-2');

    expect(pie().dataset.listas).toBe('2');
    expect(pie().dataset.paraDespues).toBe('0');
    expect(confirmar().disabled).toBe(false);

    await guardar();

    expect(createConsignacionMock).toHaveBeenCalledTimes(2);
    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ propertyId: 'a', propietarioId: 'owner-1', commissionPercent: 10 }),
    );
    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ propertyId: 'b', propietarioId: 'owner-2', commissionPercent: 10 }),
    );
    expect(createPropietarioMock).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0]).toMatchObject({ succeededCount: 2, failedCount: 0 });
  });

  it('a per-row commission overrides the general one only for that row', async () => {
    renderDialog([makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })]);
    switchToUnoPorUno();
    const [filaA, filaB] = filas();
    elegir(selectDeFila(filaA), 'owner-1');
    elegir(selectDeFila(filaB), 'owner-1');
    setInputValue(filaB.querySelector('input[type="number"]') as HTMLInputElement, '7.5');

    await guardar();

    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ propertyId: 'a', commissionPercent: 10 }),
    );
    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ propertyId: 'b', commissionPercent: 7.5 }),
    );
  });

  it('a row without an owner is NOT sent and the footer counts it as «para después»', async () => {
    const onDone = renderDialog([
      makeInmueble({ propertyId: 'a' }),
      makeInmueble({ propertyId: 'b' }),
      makeInmueble({ propertyId: 'c' }),
    ]);
    switchToUnoPorUno();

    // Nothing chosen yet: cannot save, every row is pending.
    expect(confirmar().disabled).toBe(true);
    expect(pie().dataset.listas).toBe('0');
    expect(pie().dataset.paraDespues).toBe('3');
    expect(filas().every((f) => f.dataset.conPropietario === 'false')).toBe(true);

    elegir(selectDeFila(filas()[1]), 'owner-2');

    expect(pie().dataset.listas).toBe('1');
    expect(pie().dataset.paraDespues).toBe('2');
    expect(filas()[1].dataset.conPropietario).toBe('true');

    await guardar();

    expect(createConsignacionMock).toHaveBeenCalledTimes(1);
    expect(createConsignacionMock).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'b', propietarioId: 'owner-2' }),
    );
    expect(onDone.mock.calls[0][0]).toMatchObject({ succeededCount: 1, failedCount: 0 });
  });

  it('«copiar el de arriba» copies the previous row\'s owner and is disabled when there is none', () => {
    renderDialog([makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })]);
    switchToUnoPorUno();
    const [filaA, filaB] = filas();
    const copiarA = filaA.querySelector('[data-testid="copiar-anterior"]') as HTMLButtonElement;
    const copiarB = filaB.querySelector('[data-testid="copiar-anterior"]') as HTMLButtonElement;

    // First row has nothing above; second has an empty row above.
    expect(copiarA.disabled).toBe(true);
    expect(copiarB.disabled).toBe(true);

    elegir(selectDeFila(filaA), 'owner-2');
    expect((filaB.querySelector('[data-testid="copiar-anterior"]') as HTMLButtonElement).disabled).toBe(false);

    act(() => {
      (filaB.querySelector('[data-testid="copiar-anterior"]') as HTMLButtonElement).click();
    });
    expect(selectDeFila(filas()[1]).value).toBe('owner-2');
    expect(pie().dataset.listas).toBe('2');
  });

  it('a new owner chosen in two rows is created ONCE and both mandates use the created id', async () => {
    renderDialog([makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })]);
    switchToUnoPorUno();

    // «Agregar nuevo…» on row A opens the inline form; saving it assigns a
    // temp id to A and adds the new owner to every row's list.
    elegir(selectDeFila(filas()[0]), '__nuevo__');
    const guardarNuevo = document.body.querySelector('[data-testid="guardar-nuevo-propietario"]') as HTMLButtonElement;
    expect(guardarNuevo).toBeTruthy();
    await act(async () => {
      guardarNuevo.click();
    });
    expect(document.body.querySelector('[data-testid="guardar-nuevo-propietario"]')).toBeNull();

    const tempId = selectDeFila(filas()[0]).value;
    expect(tempId.startsWith('new-')).toBe(true);

    // Row B picks that same new owner from its own list.
    const opcionesB = Array.from(selectDeFila(filas()[1]).options).map((o) => o.value);
    expect(opcionesB).toContain(tempId);
    elegir(selectDeFila(filas()[1]), tempId);

    await guardar();

    expect(createPropietarioMock).toHaveBeenCalledTimes(1);
    expect(createPropietarioMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dueña Nueva' }));
    expect(createConsignacionMock).toHaveBeenCalledTimes(2);
    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ propertyId: 'a', propietarioId: 'owner-created' }),
    );
    expect(createConsignacionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ propertyId: 'b', propietarioId: 'owner-created' }),
    );
  });

  it('filters rows by title or address and keeps the assignments of hidden rows', async () => {
    renderDialog([
      makeInmueble({ propertyId: 'a', propertyTitle: 'Depto Chicó', propertyAddress: 'Cra 11' }),
      makeInmueble({ propertyId: 'b', propertyTitle: 'Casa Usaquén', propertyAddress: 'Calle 120' }),
      makeInmueble({ propertyId: 'c', propertyTitle: 'Local', propertyAddress: 'Av Chile' }),
    ]);
    switchToUnoPorUno();
    elegir(selectDeFila(filas()[0]), 'owner-1');

    const filtro = document.body.querySelector('[data-testid="filtro-inmuebles"]') as HTMLInputElement;
    setInputValue(filtro, 'usaq');
    expect(filas().length).toBe(1);
    expect(filas()[0].dataset.propertyId).toBe('b');

    // Address matches too.
    setInputValue(filtro, 'chile');
    expect(filas().map((f) => f.dataset.propertyId)).toEqual(['c']);

    // The hidden row's owner survives the filter; the footer keeps counting all.
    expect(pie().dataset.listas).toBe('1');
    setInputValue(filtro, '');
    expect(filas().length).toBe(3);
    expect(selectDeFila(filas()[0]).value).toBe('owner-1');
  });

  it('paginates in blocks of 25 when the batch is larger', () => {
    const lote = Array.from({ length: 30 }, (_, i) =>
      makeInmueble({ propertyId: `p-${i}`, propertyTitle: `Inmueble ${i}` }),
    );
    renderDialog(lote);
    switchToUnoPorUno();
    expect(filas().length).toBe(25);
    expect(pie().dataset.paraDespues).toBe('30');
  });
});
