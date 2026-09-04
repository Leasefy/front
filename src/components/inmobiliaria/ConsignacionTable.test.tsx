/**
 * ConsignacionTable.test.tsx — T-0030 WU-2.
 *
 * The portfolio table now renders `PortafolioRow[]`: real mandates
 * (`Consignacion`) merged with mandate-less properties
 * (`InmuebleSinConsignacion`, contract.md T-0030 §3). Two confirmed crash
 * traps drove this file (brief §6):
 *
 *  1. `AVAILABILITY_COLORS[consignacion.availability]` — a mandate-less row
 *     has no `availability`. Indexing it unguarded threw `undefined.variant`
 *     and unmounted the WHOLE table, not one row.
 *  2. `PROPERTY_TYPE_ICONS[consignacion.propertyType]` — `ROOM` has no entry
 *     in the 6-key map. Using the `undefined` result as a component threw
 *     React's "Element type is invalid", again taking the table down.
 *
 * Tests 1-2 are the regression guards for those two traps. 3-5 cover R2/R4:
 * the alert affordance, that it routes to the mandate form (not `onView`),
 * and that a mandate-less row's actions menu offers no consignación-only
 * action.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { PortafolioRow, Consignacion } from '@/lib/types/inmobiliaria';

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

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({ children, initial, animate, exit, transition, whileHover, whileTap, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
}));

import { ConsignacionTable } from './ConsignacionTable';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

function makeConsignacion(overrides: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'consig-1',
    propertyId: 'prop-consig-1',
    propietarioId: 'prop-owner-1',
    // Un solo dueño al 100 % — la forma que dejó el backfill de la migración.
    copropietarios: [{ propietarioId: 'prop-owner-1', participacionBps: 10000 }],
    agenteId: 'agente-1',
    propertyTitle: 'Depto con mandato',
    propertyAddress: 'Cra 1 #1-1',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propertyType: 'apartment',
    monthlyRent: 2_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSinMandatoRow(
  overrides: Partial<Extract<PortafolioRow, { kind: 'sinMandato' }>> = {},
): PortafolioRow {
  return {
    kind: 'sinMandato',
    propertyId: 'prop-sin-mandato-1',
    propertyTitle: 'Estudio importado',
    propertyAddress: 'Cra 2 #2-2',
    propertyCity: 'Medellín',
    propertyZone: '',
    propertyType: 'room',
    propertyThumbnail: null,
    monthlyRent: 1_500_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

function render(rows: PortafolioRow[], handlers: Partial<React.ComponentProps<typeof ConsignacionTable>> = {}) {
  const onView = vi.fn();
  const onEdit = vi.fn();
  const onCompletarMandato = vi.fn();
  act(() => {
    root.render(
      <ConsignacionTable
        consignaciones={rows}
        onView={onView}
        onEdit={onEdit}
        onCompletarMandato={onCompletarMandato}
        {...handlers}
      />,
    );
  });
  return { onView, onEdit, onCompletarMandato };
}

describe('<ConsignacionTable> — mandate-less rows do not crash the table', () => {
  it('Trap 1 — a row with no `availability` renders instead of throwing on AVAILABILITY_COLORS[undefined]', () => {
    expect(() => render([makeSinMandatoRow()])).not.toThrow();
    expect(container.textContent).toContain('Estudio importado');
  });

  it('Trap 2 — a ROOM row renders instead of throwing "Element type is invalid" on PROPERTY_TYPE_ICONS[undefined]', () => {
    expect(() => render([makeSinMandatoRow({ propertyType: 'room' })])).not.toThrow();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('a normal consignación row keeps rendering unaffected (regression)', () => {
    render([{ kind: 'consignacion', ...makeConsignacion() }]);
    expect(container.textContent).toContain('Depto con mandato');
  });

  it('a mixed array (mandate + mandate-less) renders both rows without crashing', () => {
    render([
      { kind: 'consignacion', ...makeConsignacion() },
      makeSinMandatoRow(),
    ]);
    expect(container.textContent).toContain('Depto con mandato');
    expect(container.textContent).toContain('Estudio importado');
  });
});

describe('<ConsignacionTable> — R4 alert affordance', () => {
  it('shows a visible alert for a mandate-less row', () => {
    render([makeSinMandatoRow()]);
    expect(container.textContent).toContain('inmobiliaria.consignaciones.table.missingMandate');
  });

  it('activating the alert calls onCompletarMandato with that row — not onView', () => {
    const row = makeSinMandatoRow();
    const { onView, onCompletarMandato } = render([row]);

    const alertBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.consignaciones.table.missingMandate'),
    );
    expect(alertBtn).toBeTruthy();

    act(() => {
      (alertBtn as HTMLElement).click();
    });

    expect(onCompletarMandato).toHaveBeenCalledTimes(1);
    expect(onCompletarMandato).toHaveBeenCalledWith(row);
    expect(onView).not.toHaveBeenCalled();
  });

  it('clicking the rest of a mandate-less row does not call onView (no id to navigate to)', () => {
    const row = makeSinMandatoRow();
    const { onView } = render([row]);

    const tr = container.querySelector('tr');
    expect(tr).toBeTruthy();
    act(() => {
      (tr as HTMLElement).click();
    });

    expect(onView).not.toHaveBeenCalled();
  });
});

describe('<ConsignacionTable> — T-0038 property code + SALE listing display', () => {
  it('renders the property code for a sinMandato row that carries one', () => {
    render([makeSinMandatoRow({ code: 7 })]);
    expect(container.textContent).toContain('#7');
  });

  it('renders "—" for the code when a sinMandato row has none (older backend / not entitled)', () => {
    render([makeSinMandatoRow({ code: undefined })]);
    // The em-dash appears for both the code cell and (possibly) other empty
    // cells — assert the code cell specifically isn't a stray "#undefined".
    expect(container.textContent).not.toContain('#undefined');
    expect(container.textContent).toContain('—');
  });

  it('a real consignación row (no `code` field at all) shows "—" for code, never crashes', () => {
    expect(() => render([{ kind: 'consignacion', ...makeConsignacion() }])).not.toThrow();
  });

  it('a SALE sinMandato row shows the sale price with a sale tag, never the (absent) monthlyRent as "$ 0"', () => {
    render([
      makeSinMandatoRow({
        listingType: 'sale',
        monthlyRent: null,
        salePrice: 350_000_000,
        adminFee: 0,
      }),
    ]);
    expect(container.textContent).toContain('$350.000.000');
    expect(container.textContent).not.toContain('$ 0');
    expect(container.textContent).not.toContain('$0');
  });

  it('a SALE sinMandato row never renders an "Administración: $0" row', () => {
    render([
      makeSinMandatoRow({
        listingType: 'sale',
        monthlyRent: null,
        salePrice: 350_000_000,
        adminFee: 0,
      }),
    ]);
    expect(container.textContent).not.toContain('admin');
  });

  it('a SALE sinMandato row with no salePrice recorded shows "—", never $0', () => {
    render([
      makeSinMandatoRow({ listingType: 'sale', monthlyRent: null, salePrice: null }),
    ]);
    expect(container.textContent).not.toContain('$ 0');
    expect(container.textContent).not.toContain('$0');
  });
});

describe('<ConsignacionTable> — R3/R4 actions menu is gated for mandate-less rows', () => {
  function openRowMenu() {
    const trigger = container.querySelector('[aria-label="Acciones"]');
    expect(trigger).toBeTruthy();
    act(() => {
      (trigger as HTMLElement).dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }),
      );
    });
  }

  it('a mandate-less row never offers "Ver detalle"/"Editar"/"Eliminar" — consignación-keyed actions', () => {
    render([makeSinMandatoRow()], { onEliminar: vi.fn(), onCandidatos: vi.fn(), onVerAviso: vi.fn() });
    openRowMenu();

    const items = Array.from(document.querySelectorAll('[role="menuitem"]')).map((el) => el.textContent);
    expect(items.some((t) => t?.includes('inmobiliaria.consignaciones.table.viewDetail'))).toBe(false);
    expect(items.some((t) => t?.includes('inmobiliaria.consignaciones.table.edit'))).toBe(false);
    expect(items.some((t) => t?.includes('inmobiliaria.inmuebles.acciones.eliminar'))).toBe(false);
  });

  it('a mandate-less row offers a "complete the mandate" action in its menu', () => {
    const { onCompletarMandato } = render([makeSinMandatoRow()]);
    openRowMenu();

    const item = Array.from(document.querySelectorAll('[role="menuitem"]')).find((el) =>
      el.textContent?.includes('inmobiliaria.consignaciones.table.missingMandate'),
    );
    expect(item).toBeTruthy();
    act(() => {
      (item as HTMLElement).click();
    });
    expect(onCompletarMandato).toHaveBeenCalledTimes(1);
  });

  it('a real consignación row keeps its full actions menu (regression)', () => {
    render([{ kind: 'consignacion', ...makeConsignacion() }], { onEliminar: vi.fn() });
    openRowMenu();

    const items = Array.from(document.querySelectorAll('[role="menuitem"]')).map((el) => el.textContent);
    expect(items.some((t) => t?.includes('inmobiliaria.consignaciones.table.viewDetail'))).toBe(true);
    expect(items.some((t) => t?.includes('inmobiliaria.consignaciones.table.edit'))).toBe(true);
  });
});
