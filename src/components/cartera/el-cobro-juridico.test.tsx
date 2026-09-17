/**
 * 🔴 EL COBRO JURÍDICO en pantalla (17-09-2026).
 *
 * «Los abogados se registran por inmobiliaria. UNA persona pasa el caso; el
 * sistema lo SUGIERE desde el día 90 sin póliza. Los honorarios van a cargo del
 * inquilino sólo si el contrato lo pacta, son un % de lo recaudado con tope, y
 * son del abogado: cuenta por pagar.»
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: {
    abogados: vi.fn(),
    crearAbogado: vi.fn(),
    actualizarAbogado: vi.fn(),
    configuracion: vi.fn(),
    guardarConfiguracion: vi.fn(),
    sugeridos: vi.fn(),
    casos: vi.fn(),
    cerrar: vi.fn(),
    pasar: vi.fn(),
    pactarEnElContrato: vi.fn(),
    honorarios: vi.fn(),
    pagarHonorarios: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  permisos: { canAccess: vi.fn((_m: string, _a: string) => true), isLoading: false },
}));

vi.mock('@/lib/api/juridico.service', () => ({ juridicoApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ error }: { error: unknown }) => (
    <div data-testid="fallo">{error instanceof Error ? error.message : String(error)}</div>
  ),
}));

import { CobroJuridico } from './CobroJuridico';

const ABOGADO = {
  id: 'ab-1',
  nombre: 'Martínez & Asociados',
  documento: '900123456',
  email: null,
  telefono: null,
  activo: true,
};

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
    root!.render(<CobroJuridico />);
  });
  await esperar();
  await esperar();
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`No se encontró ${selector}`);
  return el;
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await esperar();
  await esperar();
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  permisos.canAccess.mockReset();
  permisos.canAccess.mockReturnValue(true);
  api.abogados.mockResolvedValue([ABOGADO]);
  api.configuracion.mockResolvedValue({
    pactaHonorarios: true,
    honorariosPct: 10,
    honorariosTopeCop: 3_000_000,
  });
  api.sugeridos.mockResolvedValue([]);
  api.casos.mockResolvedValue([]);
  api.honorarios.mockResolvedValue([]);
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

describe('el cobro jurídico', () => {
  it('🔴 el sugerido dice los días y la deuda, y pasar el caso manda el abogado elegido', async () => {
    api.sugeridos.mockResolvedValue([
      {
        contractId: 'ct-1',
        numero: '1686',
        tenantId: 'u-1',
        tenantName: 'Ana Pérez',
        direccion: 'Cra 76 #45-12',
        diasDeMora: 132,
        deudaCop: 4_000_000,
        pactaHonorarios: true,
      },
    ]);
    api.pasar.mockResolvedValue({ id: 'caso-1' });
    await montar();

    const fila = $('[data-testid="sugerido-ct-1"]');
    expect(fila.textContent).toContain('132 días');
    expect(fila.textContent).toContain('pacta honorarios');

    const select = fila.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      select.value = 'ab-1';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await clic($('[data-testid="pasar-ct-1"]'));

    expect(api.pasar).toHaveBeenCalledWith({
      contractId: 'ct-1',
      abogadoId: 'ab-1',
      motivo: '132 días de mora, sin póliza.',
    });
  });

  it('el caso en jurídico dice qué se pactó y deja cambiarlo por contrato', async () => {
    api.casos.mockResolvedValue([
      {
        id: 'caso-1',
        contractId: 'ct-1',
        tenantId: 'u-1',
        estado: 'EN_JURIDICO',
        pasadoAt: '2026-09-17T10:00:00.000Z',
        motivo: null,
        diasDeMora: 132,
        deudaAlPasarCop: 4_000_000,
        pactaHonorarios: true,
        honorariosPct: 10,
        honorariosTopeCop: 3_000_000,
        cerradoAt: null,
        motivoDeCierre: null,
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados', documento: null },
        honorariosCausadosCop: 100_000,
        honorariosPorPagarCop: 100_000,
      },
    ]);
    api.pactarEnElContrato.mockResolvedValue({ contractId: 'ct-1', pacta: false, efectivo: false });
    await montar();

    const caso = $('[data-testid="caso-caso-1"]');
    expect(caso.textContent).toContain('10 % de lo recaudado');
    expect(caso.textContent).toContain('causados');

    await clic($('[data-testid="pactar-ct-1"]'));
    expect(api.pactarEnElContrato).toHaveBeenCalledWith('ct-1', false);
    expect(toastMock.success).toHaveBeenCalledWith(
      'Este contrato NO le cobra honorarios al inquilino.',
    );
  });

  it('🔴 los honorarios son plata del ABOGADO: se listan por pagar y se marcan pagados', async () => {
    api.honorarios.mockResolvedValue([
      {
        id: 'h-1',
        casoId: 'caso-1',
        contractId: 'ct-1',
        abogado: { id: 'ab-1', nombre: 'Martínez & Asociados' },
        reciboId: 'r-1',
        recaudoCop: 1_000_000,
        honorarioCop: 100_000,
        estado: 'POR_PAGAR_AL_ABOGADO',
        pagadoAt: null,
        createdAt: '2026-09-17T10:00:00.000Z',
      },
    ]);
    api.pagarHonorarios.mockResolvedValue({ pagados: 1 });
    await montar();

    expect($('[data-testid="honorarios"]').textContent).toContain('no es ingreso de la inmobiliaria');
    expect($('[data-testid="honorario-h-1"]').textContent).toContain('recaudados');
    await clic($('[data-testid="pagar-h-1"]'));
    expect(api.pagarHonorarios).toHaveBeenCalledWith(['h-1']);
  });

  it('sin cobros:edit se ve todo pero no se mueve nada', async () => {
    permisos.canAccess.mockImplementation((_m: string, a: string) => a === 'view');
    api.sugeridos.mockResolvedValue([
      {
        contractId: 'ct-1',
        numero: '1686',
        tenantId: null,
        tenantName: 'Ana Pérez',
        direccion: 'Cra 76 #45-12',
        diasDeMora: 132,
        deudaCop: 4_000_000,
        pactaHonorarios: false,
      },
    ]);
    await montar();
    expect($('[data-testid="sugerido-ct-1"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="pasar-ct-1"]')).toBeNull();
    expect(document.querySelector('[data-testid="registrar-abogado"]')).toBeNull();
  });

  it('sin la migración el back responde 503 y la pantalla lo dice', async () => {
    api.abogados.mockRejectedValue(
      new Error('El cobro jurídico todavía no está disponible: falta la migración 20260917170000.'),
    );
    await montar();
    expect(document.body.textContent).toContain('20260917170000');
  });
});
