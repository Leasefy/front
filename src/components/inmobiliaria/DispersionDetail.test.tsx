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
    // Con los parámetros a la vista: «Por: {{name}}» tiene que llevar el NOMBRE.
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
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

// «Marcar como girada» pregunta el banco de origen (23-09): el selector lee
// `GET /dispersiones/origen-del-giro`. Por defecto, una base SIN la migración.
const origenDelGiroMock = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { origenDelGiro: () => origenDelGiroMock() as unknown },
}));
const SIN_MIGRACION = {
  disponible: false,
  motivo: 'Preguntar desde qué banco salió el giro necesita la migración 20260923010000_origen_del_giro.',
  bancos: [],
  cuentas: [],
  ultima: null,
};

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
  origenDelGiroMock.mockResolvedValue(SIN_MIGRACION);
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
  it('pendiente: no hay «Aprobar»; hay «Ir a Lotes» —al mes de ESTA dispersión— y la razón', () => {
    renderConProps(BASE_DISPERSION, { apruebaPorLote: true, onApprove: vi.fn() });
    expect(q('dispersion-aprobar')).toBeNull();
    // 22-09: sin el mes, Lotes abría en el de hoy y no en el de la dispersión.
    expect(q('dispersion-ir-a-lotes')?.getAttribute('href')).toBe(
      `/panel/inmobiliaria/pagos/dispersiones/lotes?mes=${BASE_DISPERSION.month}`,
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

  it('si la aprobó otra persona: se puede anotar la referencia', async () => {
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    await act(async () => {});
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

/*
 * 🔴 22-09 · La captura de Nico: «Canon causado $2.054.037 · Comisión
 * $205.404 · Neto $1.848.633» — «no estás teniendo en cuenta el IVA en la
 * comisión». Con el IVA liquidado, el cajón tiene una ficha más entre la
 * comisión y el neto; y una dispersión generada SIN él lo dice.
 */
describe('<DispersionDetail> el IVA de la comisión', () => {
  const CON_IVA: Dispersion = {
    ...BASE_DISPERSION,
    totalCollected: 2_054_037,
    totalCommission: 205_404,
    totalIvaComision: 39_027,
    totalRetencionesComision: 0,
    netToPropietario: 1_809_606,
  };

  // El `formatCurrency` del stub de i18n no agrupa: «$39027».
  it('pinta la ficha «IVA de la comisión» y la cuenta cierra con lo que se ve', () => {
    renderConProps(CON_IVA, {});
    const ficha = q('dispersion-iva-comision');
    expect(ficha?.textContent).toContain('inmobiliaria.dispersiones.detailView.ivaComision');
    expect(ficha?.textContent).toContain('$39027');
    expect(q('dispersion-neto')?.textContent).toContain('$1809606');
    // Entre la comisión y el neto.
    const texto = container.textContent ?? '';
    expect(texto.indexOf('$205404')).toBeLessThan(texto.indexOf('$39027'));
    expect(texto.indexOf('$39027')).toBeLessThan(texto.indexOf('$1809606'));
  });

  it('sin IVA, las tres fichas de siempre', () => {
    renderConProps(BASE_DISPERSION, {});
    expect(q('dispersion-iva-comision')).toBeNull();
  });

  it('una dispersión generada sin el IVA lo avisa con el texto del back', () => {
    renderConProps(
      {
        ...BASE_DISPERSION,
        avisoDelIvaDeLaComision:
          'Esta liquidación se generó sin el IVA de la comisión (19 % de $100.000 = $19.000).',
      },
      {},
    );
    expect(q('dispersion-aviso-iva')?.textContent).toContain('$19.000');
  });
});

/**
 * «Marcar como girada» pregunta desde qué cuenta salió la plata (Nico, 23-09:
 * «que "Marcar como girada" pregunte el banco de origen»). Es el «Desde» del
 * correo «Te giramos». Lo que se mira es lo que el cajón le PASA a quien
 * llama —el `origen` que termina en el cuerpo del `PUT .../process`—.
 */
describe('<DispersionDetail> «Marcar como girada» pregunta el banco de origen', () => {
  const aprobada: Dispersion = { ...BASE_DISPERSION, status: 'processing', approvedBy: 'u-1' };
  const CON_TABLA = {
    disponible: true,
    motivo: null,
    bancos: [
      { id: 'BANCOLOMBIA', nombre: 'Bancolombia' },
      { id: 'BANCO_BOGOTA', nombre: 'Banco de Bogotá' },
    ],
    cuentas: [],
    ultima: null,
  };

  function escribir(el: HTMLInputElement | HTMLSelectElement, valor: string) {
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  }

  async function abrir(onProcess: () => void) {
    renderConProps(aprobada, { onProcess, usuarioActualId: 'u-2' });
    await act(async () => {});
    act(() => escribir(q('dispersion-referencia') as HTMLInputElement, 'TRF-9'));
  }

  it('propone la última cuenta de la agencia y la MANDA con la referencia', async () => {
    origenDelGiroMock.mockResolvedValue({
      ...CON_TABLA,
      ultima: { banco: 'BANCOLOMBIA', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '12345674321' },
    });
    const onProcess = vi.fn();
    await abrir(onProcess);

    expect((q('origen-del-giro-banco') as HTMLSelectElement).value).toBe('BANCOLOMBIA');
    await act(async () => (q('dispersion-marcar-girada') as HTMLButtonElement).click());

    expect(onProcess).toHaveBeenCalledWith(aprobada, 'TRF-9', {
      banco: 'BANCOLOMBIA',
      tipoDeCuenta: 'AHORROS',
      numeroDeCuenta: '12345674321',
    });
  });

  it('sin cuenta propuesta, «Marcar como girada» no se deja tocar hasta elegir banco y número', async () => {
    origenDelGiroMock.mockResolvedValue(CON_TABLA);
    const onProcess = vi.fn();
    await abrir(onProcess);

    const boton = () => q('dispersion-marcar-girada') as HTMLButtonElement;
    expect(boton().disabled).toBe(true);

    act(() => escribir(q('origen-del-giro-banco') as HTMLSelectElement, 'BANCO_BOGOTA'));
    expect(boton().disabled).toBe(true);
    act(() =>
      escribir(container.querySelector('#numero-de-cuenta-origen-del-giro') as HTMLInputElement, '0001-2345-7788'),
    );
    expect(boton().disabled).toBe(false);

    await act(async () => boton().click());
    expect(onProcess).toHaveBeenCalledWith(aprobada, 'TRF-9', {
      banco: 'BANCO_BOGOTA',
      tipoDeCuenta: 'AHORROS',
      numeroDeCuenta: '0001-2345-7788',
    });
  });

  it('sin la migración: no pregunta, dice por qué, y marca girada sin origen como antes', async () => {
    const onProcess = vi.fn();
    await abrir(onProcess);

    expect(q('origen-del-giro-banco')).toBeNull();
    expect(q('origen-del-giro-sin-migracion')?.textContent).toContain('20260923010000_origen_del_giro');
    await act(async () => (q('dispersion-marcar-girada') as HTMLButtonElement).click());
    expect(onProcess).toHaveBeenCalledWith(aprobada, 'TRF-9', null);
  });

  it('girada: el cajón dice «Desde» con la cuenta tapada', () => {
    renderConProps(
      {
        ...BASE_DISPERSION,
        status: 'completed',
        transferReference: 'TRF-9',
        origenDelGiro: {
          banco: 'BANCOLOMBIA',
          nombreDelBanco: 'Bancolombia',
          tipoDeCuenta: 'AHORROS',
          cuenta: '•••• 4321',
          de: 'GIRO',
        },
      },
      {},
    );
    const desde = q('dispersion-desde');
    expect(desde?.textContent).toContain('inmobiliaria.dispersiones.origenDelGiro.desde');
    expect(desde?.textContent).toContain('•••• 4321');
  });
});

/**
 * 🔴 23-09, QA en el navegador: el historial del cajón decía «Por:
 * eb859b1c-…» —el id de quien aprobó pintado como si fuera su nombre—.
 */
describe('<DispersionDetail> quién aprobó, con su nombre', () => {
  const ID = 'eb859b1c-1111-2222-3333-444455556666';
  const aprobada: Dispersion = {
    ...BASE_DISPERSION,
    status: 'processing',
    approvedBy: ID,
    approvedAt: '2026-07-02T10:00:00.000Z',
  };

  it('el historial nombra a la persona y nunca muestra su id', () => {
    renderConProps({ ...aprobada, approvedByName: 'Ana Ruiz' }, {});
    expect(container.textContent).toContain('inmobiliaria.dispersiones.detailView.approvedBy(Ana Ruiz)');
    expect(container.textContent).not.toContain(ID);
  });

  it('sin nombre del back: si la aprobó la sesión, «ti»; si no, no hay «Por»', () => {
    renderConProps(aprobada, { usuarioActualId: ID });
    expect(container.textContent).toContain(
      'inmobiliaria.dispersiones.detailView.approvedBy(inmobiliaria.dispersiones.detailView.aprobadoPorTi)',
    );
    act(() => root.unmount());
    root = createRoot(container);
    renderConProps(aprobada, { usuarioActualId: 'otra' });
    expect(container.textContent).not.toContain(ID);
    expect(container.textContent).not.toContain('detailView.approvedBy');
  });
});

/**
 * 🔴 23-09, QA: el pie fijo del cajón cargaba el banco de origen, el número,
 * la referencia y tres ayudas, y se comía media pantalla. Lo que se LLENA va
 * en el cuerpo; el pie queda con los botones.
 */
describe('<DispersionDetail> el pie queda con los botones', () => {
  const aprobada: Dispersion = { ...BASE_DISPERSION, status: 'processing', approvedBy: 'u-1' };

  it('la referencia y el banco de origen viven en «Registrar el giro», no en el pie', async () => {
    origenDelGiroMock.mockResolvedValue({
      disponible: true,
      motivo: null,
      bancos: [{ id: 'BANCOLOMBIA', nombre: 'Bancolombia' }],
      cuentas: [],
      ultima: null,
    });
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    await act(async () => {});
    const seccion = q('dispersion-registrar-el-giro');
    expect(seccion?.querySelector('[data-testid="dispersion-referencia"]')).not.toBeNull();
    expect(seccion?.querySelector('[data-testid="origen-del-giro-banco"]')).not.toBeNull();
    const pie = q('dispersion-marcar-girada')?.closest('.border-t');
    expect(pie?.querySelector('[data-testid="dispersion-referencia"]')).toBeNull();
    expect(pie?.querySelector('[data-testid="origen-del-giro"]')).toBeNull();
  });

  it('«Te proponemos la última cuenta» sólo sale cuando HAY una última', async () => {
    const opciones = {
      disponible: true,
      motivo: null,
      bancos: [{ id: 'BANCOLOMBIA', nombre: 'Bancolombia' }],
      cuentas: [],
      ultima: null as null | { banco: string; tipoDeCuenta: string; numeroDeCuenta: string },
    };
    origenDelGiroMock.mockResolvedValue(opciones);
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    await act(async () => {});
    expect(container.textContent).not.toContain('teProponemosLaUltima');

    act(() => root.unmount());
    root = createRoot(container);
    origenDelGiroMock.mockResolvedValue({
      ...opciones,
      ultima: { banco: 'BANCOLOMBIA', tipoDeCuenta: 'AHORROS', numeroDeCuenta: '12345674321' },
    });
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    await act(async () => {});
    expect(container.textContent).toContain('teProponemosLaUltima');
  });

  it('las ayudas de la referencia no bajan de 13 px (`text-caption`, no `text-[11px]`)', async () => {
    renderConProps(aprobada, { onProcess: vi.fn(), usuarioActualId: 'u-2' });
    await act(async () => {});
    expect(container.innerHTML).not.toContain('text-[11px]');
  });
});
