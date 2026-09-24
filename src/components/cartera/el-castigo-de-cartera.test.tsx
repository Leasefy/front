/**
 * 🔴 EL CASTIGO DE CARTERA en pantalla (21-09-2026).
 *
 * Nico y Juan Camilo, 17-09: «cartera incobrable: se castiga con aprobación
 * del administrador y el contador; sale del informe de cartera activa y queda
 * en un listado de castigada; si alguna vez paga, entra como recuperación».
 *
 * Lo que este archivo amarra:
 *
 *   1. Las tres cifras de un castigo (recuperado + anulado + sin recuperar)
 *      cuadran con su capital, y se VEN cuadrando.
 *   2. Lo que falta se dice en palabras, no con un estado en mayúsculas.
 *   3. Firmar sólo se le ofrece al administrador y al contador. A los demás se
 *      les explica quién firma, en vez de mostrarles un botón que da 403.
 *   4. Rechazar y reversar piden motivo, y el botón no se puede apretar sin él.
 *   5. `contratosConCartera` sólo ofrece lo que YA es cartera, y primero lo más
 *      viejo: es a quién se castiga primero.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, reportes, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    listar: vi.fn(),
    candidatas: vi.fn(),
    proponer: vi.fn(),
    firmar: vi.fn(),
    rechazar: vi.fn(),
    reversar: vi.fn(),
  },
  reportes: { getCartera: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: {
    canAccess: vi.fn((_m: string, _a: string) => true),
    isAdmin: false,
    agencyRole: 'CONTADOR' as string | null,
    isLoading: false,
  },
}));

vi.mock('@/lib/api/castigo.service', () => ({ castigoApi: api }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ reportesApi: reportes }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { CastigoDeCartera } from './CastigoDeCartera';
import { AuthContext } from '@/lib/auth/auth-context';
import { contratosConCartera } from './ProponerCastigo';
import type { CarteraItem } from '@/lib/types/inmobiliaria';

const FIRMA = (nombre: string) => ({
  userId: `u-${nombre}`,
  nombre,
  at: '2026-09-21T15:00:00.000Z',
});

const PROPUESTO = {
  id: 'cas-1',
  contractId: 'ct-1',
  estado: 'PROPUESTO' as const,
  capitalCop: 1_500_000,
  interesCop: 200_000,
  cuotas: 2,
  motivo: 'El inquilino se fue del país y el proceso jurídico se archivó.',
  propuestoPor: FIRMA('Carla Paz'),
  admin: null,
  contador: null,
  castigadaAt: null,
  rechazo: null,
  reversa: null,
  notas: null,
  recuperadoCop: 0,
  anuladoCop: 0,
  sinRecuperarCop: 0,
  queFalta: 'Falta la firma del administrador y la del contador.',
};

const CASTIGADO = {
  ...PROPUESTO,
  id: 'cas-2',
  estado: 'CASTIGADA' as const,
  admin: FIRMA('Ana Díaz'),
  contador: FIRMA('Beto Ruiz'),
  castigadaAt: '2026-09-21T15:00:00.000Z',
  queFalta: null,
  recuperadoCop: 400_000,
  anuladoCop: 500_000,
  sinRecuperarCop: 600_000,
};

const LISTA = (castigos: unknown[]) => ({
  disponible: true,
  motivo: null,
  castigos,
  castigadoCop: 1_500_000,
  recuperadoCop: 400_000,
  sinRecuperarCop: 600_000,
  propuestoCop: 1_500_000,
});

let root: Root | null = null;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CastigoDeCartera />);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

const hay = (selector: string) => document.querySelector(selector) !== null;

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  reportes.getCartera.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset().mockReturnValue(true);
  permisos.isAdmin = false;
  permisos.agencyRole = 'CONTADOR';
  api.listar.mockResolvedValue(LISTA([PROPUESTO, CASTIGADO]));
  reportes.getCartera.mockResolvedValue({ items: [] });
});

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  root = null;
  document.body.innerHTML = '';
});

describe('la pantalla de cartera castigada', () => {
  it('muestra las cuatro cifras', async () => {
    await montar();
    expect($('[data-testid="total-castigado"]').textContent).toContain('1.500.000');
    expect($('[data-testid="total-recuperado"]').textContent).toContain('400.000');
    expect($('[data-testid="total-sin-recuperar"]').textContent).toContain('600.000');
    expect($('[data-testid="total-propuesto"]').textContent).toContain('1.500.000');
  });

  it('🔴 en un castigo aplicado, lo recuperado y lo anulado se ven por separado', async () => {
    await montar();
    const filas = document.querySelectorAll('[data-testid="castigo-fila"]');
    const aplicado = Array.from(filas).find(
      (f) => f.getAttribute('data-castigo-id') === 'cas-2',
    )!;
    expect(aplicado.textContent).toContain('400.000');
    // 🔴 Lo anulado NO es plata que entró, y lo dice.
    expect(aplicado.textContent).toContain('500.000 se anularon, no entraron');
    expect(
      CASTIGADO.recuperadoCop + CASTIGADO.anuladoCop + CASTIGADO.sinRecuperarCop,
    ).toBe(CASTIGADO.capitalCop);
  });

  it('dice QUÉ FALTA en palabras, no un estado en mayúsculas', async () => {
    await montar();
    expect($('[data-testid="que-falta"]').textContent).toContain(
      'Falta la firma del administrador',
    );
  });

  it('las dos firmas se ven con nombre, y la que no está se dice', async () => {
    await montar();
    const propuesto = Array.from(
      document.querySelectorAll('[data-testid="castigo-fila"]'),
    ).find((f) => f.getAttribute('data-castigo-id') === 'cas-1')!;
    expect(propuesto.textContent).toContain('sin firmar');
    const aplicado = Array.from(
      document.querySelectorAll('[data-testid="castigo-fila"]'),
    ).find((f) => f.getAttribute('data-castigo-id') === 'cas-2')!;
    expect(aplicado.textContent).toContain('Ana Díaz');
    expect(aplicado.textContent).toContain('Beto Ruiz');
  });

  it('firma y avisa que todavía falta la otra', async () => {
    api.firmar.mockResolvedValue({ ...PROPUESTO, admin: FIRMA('Ana Díaz') });
    await montar();
    await clic($('[data-testid="firmar-castigo"]'));
    expect(api.firmar).toHaveBeenCalledWith('cas-1');
    expect(toastMock.success).toHaveBeenCalledWith(
      'Firmaste. Todavía falta la otra firma.',
    );
  });

  it('con las dos firmas dice que sale de la cobranza', async () => {
    api.firmar.mockResolvedValue({ ...PROPUESTO, estado: 'CASTIGADA' });
    await montar();
    await clic($('[data-testid="firmar-castigo"]'));
    expect(toastMock.success).toHaveBeenCalledWith(
      'Castigada. Sale de la cartera activa y de la cobranza.',
    );
  });

  /*
   * P-4 aclarado (Nico, 24-09): lo que propone el administrador vuelve del
   * back ya castigado, con su firma por los dos lados. La pantalla lo LEE de
   * las firmas (la misma persona en los dos lados), no lo adivina.
   */
  it('🔴 P-4: un castigo firmado por la misma persona en los dos lados lo dice', async () => {
    const SOLO = { ...CASTIGADO, id: 'cas-3', admin: FIRMA('Ana Díaz'), contador: FIRMA('Ana Díaz') };
    api.listar.mockResolvedValue(LISTA([SOLO]));
    await montar();
    expect($('[data-testid="castigo-p4"]').textContent).toBe(
      'Lo castigó una sola persona, como administrador (P-4)',
    );
  });

  it('🔴 P-4: a quien lo castigó solo le dice «castigado por ti como administrador»', async () => {
    const SOLO = { ...CASTIGADO, id: 'cas-3', admin: FIRMA('Ana Díaz'), contador: FIRMA('Ana Díaz') };
    api.listar.mockResolvedValue(LISTA([SOLO]));
    const host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <AuthContext.Provider value={{ user: { id: 'u-Ana Díaz' } } as never}>
          <CastigoDeCartera />
        </AuthContext.Provider>,
      );
    });
    await esperar();
    await esperar();
    expect($('[data-testid="castigo-p4"]').textContent).toBe('Castigado por ti como administrador (P-4)');
  });

  it('dos personas distintas: sin nota de P-4', async () => {
    await montar();
    expect(hay('[data-testid="castigo-p4"]')).toBe(false);
  });

  it('🔴 P-4: el administrador que lo propuso firma y queda castigado de una: el aviso lo dice', async () => {
    permisos.isAdmin = true;
    permisos.agencyRole = 'ADMIN';
    api.firmar.mockResolvedValue({
      ...PROPUESTO,
      estado: 'CASTIGADA',
      admin: FIRMA('Carla Paz'),
      contador: FIRMA('Carla Paz'),
    });
    await montar();
    await clic($('[data-testid="firmar-castigo"]'));
    expect(toastMock.success).toHaveBeenCalledWith(
      'Lo castigó una sola persona, como administrador (P-4). Sale de la cartera activa y de la cobranza.',
    );
  });

  it('🔴 un auxiliar de cartera no ve el botón: se le dice quién firma', async () => {
    permisos.agencyRole = 'AUXILIAR_CARTERA';
    await montar();
    expect(hay('[data-testid="firmar-castigo"]')).toBe(false);
    expect(document.body.textContent).toContain(
      'Lo firman el administrador y el contador',
    );
  });

  it('un administrador sí lo ve', async () => {
    permisos.agencyRole = 'ADMIN';
    permisos.isAdmin = true;
    await montar();
    expect(hay('[data-testid="firmar-castigo"]')).toBe(true);
  });

  it('🔴 rechazar pide motivo, y sin motivo el botón no se puede apretar', async () => {
    await montar();
    await clic($('[data-testid="rechazar-castigo"]'));
    const confirmar = $('[data-testid="confirmar-motivo"]') as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    const area = document.querySelector('textarea')!;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!;
      setter.call(area, 'Tiene codeudor: todavía se le puede cobrar.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    api.rechazar.mockResolvedValue({ ...PROPUESTO, estado: 'RECHAZADO' });
    await clic($('[data-testid="confirmar-motivo"]'));

    expect(api.rechazar).toHaveBeenCalledWith(
      'cas-1',
      'Tiene codeudor: todavía se le puede cobrar.',
    );
  });

  it('🔴 sin la migración las cifras dicen «—», no «$0»', async () => {
    api.listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta aplicar la migración 20260921100000_castigo_de_cartera.',
      castigos: [],
      castigadoCop: 0,
      recuperadoCop: 0,
      sinRecuperarCop: 0,
      propuestoCop: 0,
    });
    await montar();
    // Un $0 afirma «no hay cartera castigada»; acá no se sabe.
    for (const id of [
      'total-castigado',
      'total-recuperado',
      'total-sin-recuperar',
      'total-propuesto',
    ]) {
      expect($(`[data-testid="${id}"]`).textContent).toBe('—');
    }
    expect(document.body.textContent).toContain('Todavía no se puede saber.');
  });

  it('con la migración sí son números', async () => {
    await montar();
    expect($('[data-testid="total-castigado"]').textContent).toContain('1.500.000');
  });

  it('sin la migración lo dice y no ofrece proponer', async () => {
    api.listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta aplicar la migración 20260921100000_castigo_de_cartera.',
      castigos: [],
      castigadoCop: 0,
      recuperadoCop: 0,
      sinRecuperarCop: 0,
      propuestoCop: 0,
    });
    await montar();
    expect($('[data-testid="castigo-sin-migrar"]').textContent).toContain(
      '20260921100000_castigo_de_cartera',
    );
    expect(hay('[data-testid="proponer-castigo"]')).toBe(false);
  });

  it('sin permiso de mover no se ofrece proponer, pero la lista se ve', async () => {
    permisos.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit');
    await montar();
    expect(hay('[data-testid="proponer-castigo"]')).toBe(false);
    expect(hay('[data-testid="castigo-fila"]')).toBe(true);
  });
});

describe('contratosConCartera', () => {
  const item = (over: Partial<CarteraItem>): CarteraItem =>
    ({
      cuotaId: 'q-1',
      cobroId: null,
      contractId: 'ct-1',
      contrato: '100',
      contratoDeLeasefy: null,
      propertyId: null,
      consignacionId: null,
      propertyTitle: 'Apto 402',
      propertyAddress: 'Cra 13 # 55-20',
      tenantName: 'Ana Gómez',
      tenantPhone: null,
      tenantDocument: null,
      propietarioId: null,
      propietarioName: null,
      agenteId: null,
      agenteName: null,
      month: '2025-03',
      vence: '2025-03-06',
      estado: 'PENDIENTE',
      cajon: 'CARTERA',
      diasDeMora: 100,
      diasDePlazo: 0,
      esVencida: true,
      totalAmount: 1_000_000,
      paidAmount: 0,
      pendingAmount: 1_000_000,
      remindersSent: null,
      lastReminderDate: null,
      ...over,
    }) as CarteraItem;

  it('🔴 sólo lo que YA es cartera: lo que no venció no se castiga', () => {
    const r = contratosConCartera([
      item({ cuotaId: 'a' }),
      item({ cuotaId: 'b', cajon: 'POR_VENCER', diasDeMora: 0 }),
      item({ cuotaId: 'c', cajon: 'VENCIDA_EN_PLAZO', diasDeMora: 0 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.cuotas).toBe(1);
    expect(r[0]!.carteraCop).toBe(1_000_000);
  });

  it('agrupa por contrato y suma', () => {
    const r = contratosConCartera([
      item({ cuotaId: 'a', diasDeMora: 100 }),
      item({ cuotaId: 'b', diasDeMora: 400, pendingAmount: 500_000 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]!.carteraCop).toBe(1_500_000);
    expect(r[0]!.cuotas).toBe(2);
    expect(r[0]!.diasDeLaMasVieja).toBe(400);
  });

  it('primero el atraso más viejo: es a quién se castiga primero', () => {
    const r = contratosConCartera([
      item({ cuotaId: 'a', contractId: 'nuevo', diasDeMora: 40 }),
      item({ cuotaId: 'b', contractId: 'viejo', diasDeMora: 900 }),
    ]);
    expect(r.map((c) => c.contractId)).toEqual(['viejo', 'nuevo']);
  });

  it('sin inquilino lo dice, no deja la fila en blanco', () => {
    const r = contratosConCartera([item({ tenantName: null })]);
    expect(r[0]!.inquilino).toBe('Sin inquilino');
  });
});
