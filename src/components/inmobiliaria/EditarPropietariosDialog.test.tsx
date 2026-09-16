/**
 * EditarPropietariosDialog — editar los dueños de un mandato que YA existe y
 * su % del canon (Nico, 2026-09-13: «un inmueble puede tener múltiples
 * propietarios con diferentes % del canon»).
 *
 * Lo que fija este archivo:
 *  - el diálogo manda SIEMPRE `copropietarios` (la lista completa), nunca un
 *    `propietarioId` suelto — el suelto es lo que borraba a los demás dueños;
 *  - la lista suma 100 % por construcción y el principal es el primero;
 *  - sin cambios no se guarda; con un error del back se dice, no se cierra.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion, Propietario } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const updateMock = vi.fn();
const getAllMock = vi.fn();
const createPropietarioMock = vi.fn();

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    update: (...args: unknown[]) => updateMock(...args),
  },
  propietariosApi: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    create: (...args: unknown[]) => createPropietarioMock(...args),
    update: vi.fn(),
  },
}));

import {
  EditarPropietariosDialog,
  duenosActuales,
  listaParaGuardar,
  mismoReparto,
} from './EditarPropietariosDialog';

const propietario = (id: string, name: string): Propietario => ({
  id,
  name,
  email: null,
  phone: null,
  documentType: 'CC',
  documentNumber: `doc-${id}`,
  bankAccount: { bank: 'bancolombia', accountType: 'savings', accountNumber: '', accountHolder: '' },
  propertyCount: 0,
  activeLeases: 0,
  totalMonthlyRent: 0,
  pendingBalance: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

const ANA = propietario('ana', 'Ana Gómez');
const BETO = propietario('beto', 'Beto Ruiz');
const CARLA = propietario('carla', 'Carla Díaz');

function consignacion(over: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'ana',
    copropietarios: [
      { propietarioId: 'ana', participacionBps: 7000, propietario: { id: 'ana', name: 'Ana Gómez' } },
      { propietarioId: 'beto', participacionBps: 3000, propietario: { id: 'beto', name: 'Beto Ruiz' } },
    ],
    agenteId: 'agent-1',
    propertyTitle: 'Casa Laureles',
    propertyAddress: 'Cra 76 #1-2',
    propertyCity: 'Medellín',
    propertyZone: 'Laureles',
    propertyType: 'house',
    monthlyRent: 2_400_000,
    adminFee: 0,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: 7,
    commissionPercent: 8,
    contractDate: '2026-01-01T00:00:00.000Z',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  getAllMock.mockResolvedValue([ANA, BETO, CARLA]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(c: Consignacion, onGuardado = vi.fn(), onClose = vi.fn()) {
  await act(async () => {
    root.render(<EditarPropietariosDialog open consignacion={c} onClose={onClose} onGuardado={onGuardado} />);
  });
  // La lista de propietarios llega en una promesa: un tick más.
  await act(async () => {
    await Promise.resolve();
  });
  return { onGuardado, onClose };
}

const boton = (testId: string) => document.body.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!;
const tarjetaDe = (nombre: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('[data-testid="mandato-propietarios-grid"] button')).find(
    (b) => b.textContent?.includes(nombre),
  )!;

describe('los helpers puros', () => {
  it('duenosActuales: la lista del mandato de mayor a menor; sin lista cae al principal al 100 %', () => {
    expect(duenosActuales(consignacion()).map((d) => d.propietarioId)).toEqual(['ana', 'beto']);
    expect(duenosActuales(consignacion({ copropietarios: [] }))).toEqual([
      { propietarioId: 'ana', participacionBps: 10000 },
    ]);
  });

  it('listaParaGuardar: con un dueño solo es una LISTA de uno al 100 %, nunca un id suelto', () => {
    expect(listaParaGuardar([], 'ana')).toEqual([{ propietarioId: 'ana', participacionBps: 10000 }]);
    const lista = listaParaGuardar([{ propietarioId: 'beto', participacionBps: 4000 }], 'ana');
    expect(lista).toEqual([
      { propietarioId: 'ana', participacionBps: 6000 },
      { propietarioId: 'beto', participacionBps: 4000 },
    ]);
    expect(lista.reduce((a, d) => a + d.participacionBps, 0)).toBe(10000);
  });

  it('mismoReparto no depende del orden y sí de los porcentajes', () => {
    const a = [
      { propietarioId: 'ana', participacionBps: 7000 },
      { propietarioId: 'beto', participacionBps: 3000 },
    ];
    expect(mismoReparto(a, [...a].reverse())).toBe(true);
    expect(mismoReparto(a, [{ ...a[0], participacionBps: 6000 }, a[1]])).toBe(false);
    expect(mismoReparto(a, [a[0]])).toBe(false);
  });
});

describe('<EditarPropietariosDialog>', () => {
  it('abre con los dueños de hoy marcados y el reparto tal cual (70/30), y sin cambios no deja guardar', async () => {
    await render(consignacion());
    expect(document.body.textContent).toContain('Casa Laureles');
    const casilla = document.body.querySelector<HTMLInputElement>('[data-testid="mandato-reparto"] input[type="number"]');
    expect(casilla?.value).toBe('30');
    expect(document.body.querySelector('[data-testid="mandato-reparto-resto"]')?.textContent).toContain('70');
    expect(boton('editar-propietarios-guardar').disabled).toBe(true);
  });

  it('cambiar el porcentaje manda la LISTA COMPLETA que suma 100 y repinta con lo que devuelve el back', async () => {
    const actualizada = consignacion({
      copropietarios: [
        { propietarioId: 'ana', participacionBps: 6000 },
        { propietarioId: 'beto', participacionBps: 4000 },
      ],
    });
    updateMock.mockResolvedValue(actualizada);
    const { onGuardado, onClose } = await render(consignacion());

    const casilla = document.body.querySelector<HTMLInputElement>('[data-testid="mandato-reparto"] input[type="number"]')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(casilla, '40');
      casilla.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(boton('editar-propietarios-guardar').disabled).toBe(false);

    await act(async () => {
      boton('editar-propietarios-guardar').click();
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const [id, payload] = updateMock.mock.calls[0] as [string, { copropietarios: unknown; propietarioId?: unknown }];
    expect(id).toBe('cons-1');
    // 🔴 La forma explícita: la lista entera, nunca `propietarioId` a secas.
    expect(payload).not.toHaveProperty('propietarioId');
    expect(payload.copropietarios).toEqual([
      { propietarioId: 'ana', participacionBps: 6000 },
      { propietarioId: 'beto', participacionBps: 4000 },
    ]);
    expect(onGuardado).toHaveBeenCalledWith(actualizada);
    expect(onClose).toHaveBeenCalled();
  });

  it('sumar un tercer dueño reparte en partes iguales y el principal carga el redondeo', async () => {
    updateMock.mockResolvedValue(consignacion());
    await render(consignacion());
    await act(async () => {
      tarjetaDe('Carla Díaz').click();
    });
    await act(async () => {
      boton('editar-propietarios-guardar').click();
    });
    const payload = updateMock.mock.calls[0][1] as { copropietarios: { propietarioId: string; participacionBps: number }[] };
    expect(payload.copropietarios.map((d) => d.participacionBps)).toEqual([3334, 3333, 3333]);
    expect(payload.copropietarios[0].propietarioId).toBe('ana');
  });

  it('dejar UN solo dueño (se vendió) manda una lista de uno al 100 %, no un id suelto', async () => {
    updateMock.mockResolvedValue(consignacion());
    await render(consignacion());
    await act(async () => {
      tarjetaDe('Beto Ruiz').click(); // desmarca a Beto
    });
    expect(document.body.querySelector('[data-testid="mandato-reparto"]')).toBeNull();
    await act(async () => {
      boton('editar-propietarios-guardar').click();
    });
    const payload = updateMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toEqual({ copropietarios: [{ propietarioId: 'ana', participacionBps: 10000 }] });
  });

  it('sin ningún dueño no se puede guardar y se dice por qué', async () => {
    await render(consignacion({ copropietarios: [], propietarioId: 'ana' }));
    await act(async () => {
      tarjetaDe('Ana Gómez').click();
    });
    expect(boton('editar-propietarios-guardar').disabled).toBe(true);
    expect(document.body.querySelector('[data-testid="editar-propietarios-problema"]')?.textContent).toContain(
      'al menos un propietario',
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('si el back rechaza, el error se muestra en el diálogo y NO se cierra', async () => {
    updateMock.mockRejectedValue(new Error('Las participaciones tienen que sumar 100 %'));
    const { onClose, onGuardado } = await render(consignacion());
    await act(async () => {
      tarjetaDe('Carla Díaz').click();
    });
    await act(async () => {
      boton('editar-propietarios-guardar').click();
    });
    expect(document.body.querySelector('[data-testid="editar-propietarios-error"]')?.textContent).toContain('sumar 100');
    expect(onClose).not.toHaveBeenCalled();
    expect(onGuardado).not.toHaveBeenCalled();
  });
});
