/**
 * DispersionDetail.test.tsx — propietario contact guards.
 *
 * `Propietario.email`/`phone` are nullable in the DB (Prisma `String?`), but
 * the owner-contact block used to interpolate them unguarded into
 * `tel:`/`mailto:`/`wa.me` links — `propietario.phone.replace(...)` crashed
 * outright when `phone` was `null`. These tests lock the guard: no
 * email/phone → no crash and no broken contact link/action is rendered;
 * email/phone present → all three contact actions render.
 *
 * Sheet/dialog primitives are mocked as plain pass-throughs so the test
 * exercises the guard logic directly instead of Radix portal/dialog
 * behavior (nothing in this repo tests through a real Sheet yet).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion, Propietario } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatDate: (d: string) => d,
    formatCurrency: (n: number) => `$${n}`,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => children,
  SheetContent: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  SheetHeader: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
  SheetTitle: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('./ComisionDesglose', () => ({
  ComisionDesglose: () => null,
}));

const propietariosMock = vi.fn();
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => propietariosMock(),
  useInmobiliariaConfig: () => ({ config: undefined }),
}));

import { DispersionDetail } from './DispersionDetail';

const BASE_PROPIETARIO: Propietario = {
  id: 'own1',
  name: 'Maria Perez',
  email: 'maria@mail.com',
  phone: '300 123 4567',
  documentType: 'CC',
  documentNumber: '123456',
  bankAccount: {
    bank: 'bancolombia',
    accountType: 'savings',
    accountNumber: '0011223344',
    accountHolder: 'Maria Perez',
  },
  propertyCount: 1,
  activeLeases: 1,
  totalMonthlyRent: 1_000_000,
  pendingBalance: 0,
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
};

const BASE_DISPERSION: Dispersion = {
  id: 'd1',
  propietarioId: 'own1',
  propietarioName: 'Maria Perez',
  propietarioBankAccount: null,
  month: '2026-07',
  items: [],
  baseDelCanon: 'CAUSADO',
  totalCollected: 1_000_000,
  totalCommission: 100_000,
  totalConceptosAFavor: 0,
  totalConceptosACargo: 0,
  totalDeTerceros: 0,
  netToPropietario: 900_000,
  status: 'pending',
  createdAt: '2026-07-01',
  updatedAt: '2026-07-01',
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
  vi.restoreAllMocks();
});

function renderDetail(propietario: Propietario | null) {
  propietariosMock.mockReturnValue({ propietarios: propietario ? [propietario] : [] });
  act(() => {
    root.render(
      React.createElement(DispersionDetail, {
        isOpen: true,
        onClose: () => {},
        dispersion: BASE_DISPERSION,
      }),
    );
  });
}

describe('<DispersionDetail> propietario contact', () => {
  it('renders tel, WhatsApp and mailto actions when email/phone are present', () => {
    renderDetail(BASE_PROPIETARIO);
    const tel = container.querySelector('a[href^="tel:"]');
    const wa = container.querySelector('a[href^="https://wa.me/"]');
    const mailto = container.querySelector('a[href^="mailto:"]');
    expect(tel).toBeTruthy();
    expect(wa).toBeTruthy();
    expect(mailto).toBeTruthy();
    // WhatsApp strips non-digits from the number.
    expect(wa?.getAttribute('href')).toBe('https://wa.me/3001234567');
  });

  it('renders no contact links and does not crash when email/phone are null', () => {
    expect(() =>
      renderDetail({ ...BASE_PROPIETARIO, email: null, phone: null }),
    ).not.toThrow();
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    // No link should ever carry a literal null/undefined value either.
    expect(container.innerHTML).not.toMatch(/href="(tel|mailto):null"/);
    expect(container.innerHTML).not.toMatch(/wa\.me\/undefined/);
    // The propietario name still renders — only the contact actions are gated.
    expect(container.textContent).toContain('Maria Perez');
  });
});

function renderConProps(
  dispersion: Dispersion,
  props: Partial<React.ComponentProps<typeof DispersionDetail>>,
) {
  propietariosMock.mockReturnValue({ propietarios: [BASE_PROPIETARIO] });
  act(() => {
    root.render(
      React.createElement(DispersionDetail, {
        isOpen: true,
        onClose: () => {},
        dispersion,
        ...props,
      }),
    );
  });
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

describe('<DispersionDetail> D3 — la agencia aprueba por lote', () => {
  it('pendiente: no hay «Aprobar»; hay «Ir a Lotes» y la razón', () => {
    renderConProps(BASE_DISPERSION, { apruebaPorLote: true, onApprove: vi.fn() });
    expect(q('dispersion-aprobar')).toBeNull();
    expect(q('dispersion-ir-a-lotes')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/pagos/dispersiones/lotes',
    );
    expect(q('dispersion-por-lote')?.textContent).toContain('por lote');
  });

  it('aprobada: tampoco se ofrece anotar el giro, que también da 409', () => {
    renderConProps(
      { ...BASE_DISPERSION, status: 'processing', approvedBy: 'u-1' },
      { apruebaPorLote: true, onProcess: vi.fn() },
    );
    expect(q('dispersion-marcar-girada')).toBeNull();
    expect(q('dispersion-referencia')).toBeNull();
    expect(q('dispersion-ir-a-lotes')).not.toBeNull();
  });

  it('sin aprobación por lote, «Aprobar» sigue vivo', () => {
    renderConProps(BASE_DISPERSION, { apruebaPorLote: false, onApprove: vi.fn() });
    expect(q('dispersion-aprobar')).not.toBeNull();
    expect(q('dispersion-ir-a-lotes')).toBeNull();
  });
});

describe('<DispersionDetail> D4 — quien aprobó no marca girada', () => {
  const aprobada: Dispersion = { ...BASE_DISPERSION, status: 'processing', approvedBy: 'u-1' };

  it('si quien mira la aprobó: campo y botón deshabilitados, con la explicación ANTES de escribir', () => {
    const onProcess = vi.fn();
    renderConProps(aprobada, { onProcess, usuarioActualId: 'u-1' });

    const input = q('dispersion-referencia') as HTMLInputElement;
    const boton = q('dispersion-marcar-girada') as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(boton.disabled).toBe(true);
    expect(q('dispersion-aprobador-no-gira')?.textContent).toContain('Tú aprobaste esta dispersión');

    act(() => boton.click());
    expect(onProcess).not.toHaveBeenCalled();
  });

  it('si la aprobó otra persona: se puede anotar la referencia', () => {
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    expect((q('dispersion-referencia') as HTMLInputElement).disabled).toBe(false);
    expect((q('dispersion-marcar-girada') as HTMLButtonElement).disabled).toBe(false);
    expect(q('dispersion-aprobador-no-gira')).toBeNull();
  });
});

describe('<DispersionDetail> — deducciones del propietario', () => {
  const conDeducciones = {
    netoDelMesCop: 900_000,
    deducciones: [
      {
        id: 'ded-1', propietarioId: 'own1', origen: 'REPARACION' as const, motivo: 'Cambio de calentador',
        valorCop: 1_000_000, mesDesde: '2026-07', fecha: '2026-07-02', grupoId: 'g-1', valorTotalCop: 1_000_000,
        participacionBps: 10_000, consignacionId: 'c1', solicitudMantenimientoId: 's1',
        tieneSoporte: false, soporteNombre: null, estado: 'EN_LIQUIDACION' as const,
      },
    ],
    deduccionesCop: 1_000_000,
    saldoAnteriorCop: 0,
    netoCop: -100_000,
    aGirarCop: 0,
    saldoEnContraCop: 100_000,
    compensadoCop: 900_000,
    renglones: [{ concepto: 'Reparación: Cambio de calentador', valorCop: -1_000_000, motivo: 'Cambio de calentador' }],
  };

  it('🔴 el neto que se muestra es el que se gira: $0, no el guardado en contra', () => {
    renderConProps({ ...BASE_DISPERSION, netToPropietario: -100_000, conDeducciones }, {});
    expect(q('dispersion-neto')?.textContent).toBe('$0');
    expect(q('bloque-de-deducciones')?.textContent).toContain('Reparación: Cambio de calentador');
    expect(q('bloque-saldo-en-contra')).not.toBeNull();
  });

  it('sin deducciones, el neto guardado y ningún bloque', () => {
    renderConProps(BASE_DISPERSION, {});
    expect(q('dispersion-neto')?.textContent).toBe('$900000');
    expect(q('bloque-de-deducciones')).toBeNull();
  });
});

describe('DispersionDetail — la cuenta bancaria no se inventa', () => {
  it('🔴 sin tipo ni titular del back dice «—», no «Corriente» ni el nombre del propietario (QA 22-09)', () => {
    propietariosMock.mockReturnValue({ propietarios: [BASE_PROPIETARIO] });
    act(() => {
      root.render(
        React.createElement(DispersionDetail, {
          isOpen: true,
          onClose: () => {},
          dispersion: {
            ...BASE_DISPERSION,
            propietarioBankAccount: {
              bank: 'bancolombia',
              accountType: '' as never,
              accountNumber: '0011223344',
              accountHolder: '',
            },
          },
        } as React.ComponentProps<typeof DispersionDetail>),
      );
    });
    const texto = document.body.textContent ?? '';
    expect(texto).not.toContain('Corriente');
    expect(texto).not.toContain('detailView.checking');
    expect(texto).toContain('—');
  });
});

/**
 * 🔴 22-09: la cuenta de un giro puede ser de OTRA persona (Nico). El cajón
 * decía «Titular —»; ahora dice «Titular: Nombre · CC 123» con el titular que
 * se copió al generar la dispersión, y avisa cuando es otra persona.
 */
describe('DispersionDetail — el titular del giro', () => {
  const conCuenta = (titularDeLaCuenta: Dispersion['titularDeLaCuenta']): Dispersion => ({
    ...BASE_DISPERSION,
    propietarioBankAccount: {
      bank: 'bancolombia',
      accountType: 'savings',
      accountNumber: '0011223344',
      accountHolder: titularDeLaCuenta?.nombre ?? '',
    },
    titularDeLaCuenta,
  });

  it('de otra persona: nombre, documento y el aviso', () => {
    renderConProps(
      conCuenta({
        esElPropietario: false,
        tipoDocumento: 'CC',
        numeroDocumento: '80012345',
        nombre: 'Carlos Restrepo',
        copiadoAlGenerar: true,
      }),
      {},
    );
    const celda = q('dispersion-titular')?.textContent ?? '';
    expect(celda).toContain('Carlos Restrepo · CC 80012345');
    expect(celda).toContain('inmobiliaria.dispersiones.detailView.titularOtraPersona');
    expect(celda).not.toContain('titularDeLaFichaHoy');
  });

  it('del propietario: su nombre y su documento, sin aviso', () => {
    renderConProps(
      conCuenta({
        esElPropietario: true,
        tipoDocumento: 'CC',
        numeroDocumento: '123456',
        nombre: 'Maria Perez',
        copiadoAlGenerar: true,
      }),
      {},
    );
    const celda = q('dispersion-titular')?.textContent ?? '';
    expect(celda).toContain('Maria Perez · CC 123456');
    expect(celda).not.toContain('titularOtraPersona');
  });

  it('una dispersión vieja (sin copia) dice que es el titular de la ficha de hoy', () => {
    renderConProps(
      conCuenta({
        esElPropietario: true,
        tipoDocumento: 'CC',
        numeroDocumento: '123456',
        nombre: 'Maria Perez',
        copiadoAlGenerar: false,
      }),
      {},
    );
    expect(q('dispersion-titular')?.textContent).toContain(
      'inmobiliaria.dispersiones.detailView.titularDeLaFichaHoy',
    );
  });
});
