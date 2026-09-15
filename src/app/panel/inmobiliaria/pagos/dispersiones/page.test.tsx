/**
 * @vitest-environment happy-dom
 *
 * Dispersiones — los casos de error de la auditoría del 2026-09-13.
 *
 *   D1  un fallo de carga NO es «no hay dispersiones»
 *   D2  «Aprobar todas» confirma antes y, si una falla, dice cuántas salieron
 *   D3  con aprobación por lote no se ofrece «Aprobar» suelto, y el 409 lleva a Lotes
 *   D5  un resumen que no cargó se rotula «estimado», no se lee como real
 *   D6  el extracto carga y falla DENTRO del modal
 *   D8  el vacío de una búsqueda no es el vacío del mes
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { Dispersion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    info: vi.fn(),
  },
  push: vi.fn(),
  approve: vi.fn(),
  process: vi.fn(),
  getSummary: vi.fn(),
  getExtracto: vi.fn(),
  getMyAgency: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: string) => d,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push, replace: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));

vi.mock('@/lib/hooks/use-auto-refresh', () => ({ useAutoRefresh: () => undefined }));

vi.mock('@/components/ui/toast', () => ({ toast: m.toast }));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          initial,
          animate,
          exit,
          transition,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void initial; void animate; void exit; void transition;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

// El estado del hook de la lista lo maneja cada prueba.
let lista: {
  dispersiones: Dispersion[];
  isLoading: boolean;
  error: string | null;
  errorCrudo: unknown;
  refetch: typeof m.refetch;
};

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useDispersiones: () => lista,
  usePropietarios: () => ({ propietarios: [] }),
  dispersionesApi: {
    approve: (id: string) => m.approve(id),
    process: (id: string, ref: string) => m.process(id, ref),
    getSummary: (mes: string) => m.getSummary(mes),
  },
  propietariosApi: {
    getExtracto: (id: string, mes: string) => m.getExtracto(id, mes),
  },
}));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { getMyAgency: () => m.getMyAgency() },
}));

/*
 * El resumen va de verdad (es donde viven «Aprobar todas», «Ir a Lotes» y el
 * rótulo de estimado). La tabla, la tarjeta, los filtros y el cajón son
 * dobles con los mismos contratos, para mirar qué les pasa la página.
 */
vi.mock('@/components/inmobiliaria', async () => {
  const { DispersionResumen } = await vi.importActual<
    typeof import('@/components/inmobiliaria/DispersionResumen')
  >('@/components/inmobiliaria/DispersionResumen');
  return {
    DispersionResumen,
    DispersionFilters: ({
      filters,
      onFiltersChange,
    }: {
      filters: Record<string, unknown>;
      onFiltersChange: (f: Record<string, unknown>) => void;
    }) =>
      React.createElement(
        'button',
        { type: 'button', 'data-testid': 'buscar-zzz', onClick: () => onFiltersChange({ ...filters, search: 'zzz' }) },
        'buscar',
      ),
    DispersionTable: ({
      dispersiones,
      onProcess,
    }: {
      dispersiones: Dispersion[];
      onProcess?: (d: Dispersion) => void;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'tabla' },
        dispersiones.map((d) =>
          React.createElement(
            'div',
            { key: d.id, 'data-testid': 'fila' },
            d.propietarioName,
            onProcess && d.status === 'pending'
              ? React.createElement('button', { type: 'button', 'data-testid': 'fila-aprobar', onClick: () => onProcess(d) }, 'Procesar')
              : null,
          ),
        ),
      ),
    DispersionCard: () => null,
    ExtractoPropietario: () => React.createElement('div', { 'data-testid': 'extracto' }, 'extracto'),
    DispersionDetail: (props: {
      apruebaPorLote?: boolean;
      usuarioActualId?: string | null;
      onApprove?: (d: Dispersion) => Promise<void> | void;
      onViewExtracto?: (d: Dispersion) => void;
    }) =>
      React.createElement(
        'div',
        {
          'data-testid': 'detalle',
          'data-por-lote': props.apruebaPorLote ? 'si' : 'no',
          'data-usuario': props.usuarioActualId ?? '',
        },
        React.createElement('button', { type: 'button', 'data-testid': 'detalle-aprobar', onClick: () => void props.onApprove?.(fila('d-1')) }, 'aprobar'),
        React.createElement('button', { type: 'button', 'data-testid': 'detalle-extracto', onClick: () => props.onViewExtracto?.(fila('d-1')) }, 'extracto'),
      ),
  };
});

import DispersionesPage from './page';

function mesActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function fila(id: string, extra: Partial<Dispersion> = {}): Dispersion {
  return {
    id,
    propietarioId: `p-${id}`,
    propietarioName: `Propietario ${id}`,
    propietarioBankAccount: null,
    month: mesActual(),
    items: [],
    totalCollected: 1_000_000,
    totalCommission: 100_000,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: 900_000,
    status: 'pending',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...extra,
  } as Dispersion;
}

const TRES = [fila('d-1'), fila('d-2'), fila('d-3')];

function resumenDelBack(extra: Record<string, unknown> = {}) {
  return {
    month: mesActual(),
    totalToDisburse: 2_700_000,
    totalCommissions: 300_000,
    dispersionsPending: 3,
    dispersionsCompleted: 0,
    dispersionsFailed: 0,
    ...extra,
  };
}

let host: HTMLDivElement;
let root: Root;

async function asentar(veces = 3) {
  for (let i = 0; i < veces; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<DispersionesPage />);
  });
  await asentar();
}

async function volverAPintar() {
  await act(async () => {
    root.render(<DispersionesPage />);
  });
  await asentar();
}

const q = (testid: string, dentro: ParentNode = host) =>
  dentro.querySelector(`[data-testid="${testid}"]`);

beforeEach(() => {
  Object.values(m.toast).forEach((f) => f.mockReset());
  [m.push, m.approve, m.process, m.getSummary, m.getExtracto, m.getMyAgency, m.refetch].forEach((f) =>
    f.mockReset(),
  );
  m.refetch.mockResolvedValue(null);
  lista = { dispersiones: TRES, isLoading: false, error: null, errorCrudo: null, refetch: m.refetch };
  m.getSummary.mockResolvedValue(resumenDelBack());
  // Por defecto, una agencia que aprueba una por una.
  m.getMyAgency.mockResolvedValue({ id: 'a-1', dispersionExigePin: false, dispersionMontoDobleAprobacion: null });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('D1 — un fallo de carga no es «no hay dispersiones»', () => {
  it('mientras carga: esqueleto, ni vacío ni fallo', async () => {
    lista = { ...lista, dispersiones: [], isLoading: true };
    await montar();
    const zona = q('dispersiones-lista') as HTMLElement;
    expect(q('esqueleto-tabla', zona)).not.toBeNull();
    expect(q('sin-datos', zona)).toBeNull();
    expect(q('fallo-de-carga', zona)).toBeNull();
  });

  it('si la lista falla: el fallo con reintento, y NO «todavía no hay dispersiones»', async () => {
    lista = { ...lista, dispersiones: [], isLoading: true };
    await montar();
    lista = {
      ...lista,
      isLoading: false,
      error: 'Internal server error',
      errorCrudo: new ApiError(500, 'Internal server error'),
    };
    await volverAPintar();

    const zona = q('dispersiones-lista') as HTMLElement;
    expect(q('fallo-de-carga', zona)).not.toBeNull();
    expect(q('sin-datos', zona)).toBeNull();
    expect(host.textContent).not.toContain('Todavía no hay dispersiones');

    await act(async () => {
      (q('reintentar', zona) as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 450));
    });
    expect(m.refetch).toHaveBeenCalled();
  });

  it('con la respuesta vacía de verdad: el vacío del mes, con el asistente', async () => {
    lista = { ...lista, dispersiones: [] };
    m.getSummary.mockResolvedValue(resumenDelBack({ dispersionsPending: 0 }));
    await montar();
    const vacio = q('sin-datos') as HTMLElement;
    expect(vacio.getAttribute('data-caso')).toBe('vacio');
    expect(vacio.textContent).toContain('Todavía no hay dispersiones de');
  });

  it('D8: una búsqueda sin coincidencias dice «ningún resultado», no que el mes está vacío', async () => {
    await montar();
    await act(async () => {
      (q('buscar-zzz') as HTMLButtonElement).click();
    });
    const vacio = q('sin-datos') as HTMLElement;
    expect(vacio.getAttribute('data-caso')).toBe('filtros');
    expect(vacio.textContent).toContain('Ningún resultado coincide');
  });
});

describe('D2 — «Aprobar todas»', () => {
  it('pregunta antes, y no aprueba nada hasta confirmar', async () => {
    await montar();
    await act(async () => {
      (q('resumen-aprobar-todas') as HTMLButtonElement).click();
    });
    const dialogo = document.querySelector('[role="alertdialog"]');
    expect(dialogo?.textContent).toContain('Vas a aprobar 3 dispersiones por');
    expect(dialogo?.textContent).toContain('¿Seguimos?');
    expect(m.approve).not.toHaveBeenCalled();
  });

  it('con 1 rechazo de 3: el informe dice «2 aprobadas · 1 con error» y el motivo', async () => {
    m.approve.mockImplementation(async (id: string) => {
      if (id === 'd-2') throw new ApiError(409, 'Esta dispersión ya no está pendiente.', 'ESTADO');
      return fila(id, { status: 'processing' });
    });
    await montar();
    await act(async () => {
      (q('resumen-aprobar-todas') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('confirmar-aprobar-todas', document.body) as HTMLButtonElement).click();
    });
    await asentar();

    // Se intentaron las tres, cada una por su lado.
    expect(m.approve).toHaveBeenCalledTimes(3);
    const informe = q('informe-aprobar-todas') as HTMLElement;
    expect(informe.textContent).toContain('2 aprobadas · 1 con error');
    expect(informe.textContent).toContain('Propietario d-2');
    expect(informe.textContent).toContain('Esta dispersión ya no está pendiente.');
    expect(m.toast.error).toHaveBeenCalledWith(
      '2 aprobadas · 1 con error',
      expect.objectContaining({ description: 'Esta dispersión ya no está pendiente.' }),
    );
    expect(m.refetch).toHaveBeenCalled();
  });

  it('si salen todas: toast de éxito y sin informe de errores', async () => {
    m.approve.mockResolvedValue(fila('x', { status: 'processing' }));
    await montar();
    await act(async () => {
      (q('resumen-aprobar-todas') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('confirmar-aprobar-todas', document.body) as HTMLButtonElement).click();
    });
    await asentar();
    expect(m.toast.success).toHaveBeenCalledWith('3 aprobadas', expect.anything());
    expect(q('informe-aprobar-todas')).toBeNull();
  });
});

describe('D3 — la agencia aprueba por lote', () => {
  it('con el PIN prendido: ni «Aprobar todas» ni «Aprobar» en la fila; «Ir a Lotes» en su lugar', async () => {
    m.getMyAgency.mockResolvedValue({ id: 'a-1', dispersionExigePin: true });
    await montar();
    expect(q('resumen-aprobar-todas')).toBeNull();
    expect(q('resumen-ir-a-lotes')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/pagos/dispersiones/lotes',
    );
    expect(q('fila-aprobar')).toBeNull();
    expect(q('detalle')?.getAttribute('data-por-lote')).toBe('si');
  });

  it('sin poder leer la agencia se asume por lote, como el back', async () => {
    m.getMyAgency.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();
    expect(q('resumen-aprobar-todas')).toBeNull();
    expect(q('resumen-ir-a-lotes')).not.toBeNull();
  });

  it('agencia que aprueba una por una: «Aprobar» vive en la fila y en el resumen', async () => {
    await montar();
    expect(q('resumen-aprobar-todas')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="fila-aprobar"]')).toHaveLength(3);
    expect(q('detalle')?.getAttribute('data-por-lote')).toBe('no');
    // D4: el cajón recibe quién está mirando.
    expect(q('detalle')?.getAttribute('data-usuario')).toBe('u-1');
  });

  it('si igual llega un 409 APROBAR_POR_LOTE: el mensaje del back y el enlace a Lotes, no «Error»', async () => {
    const msg =
      'Esta inmobiliaria aprueba las dispersiones por lote, con código: arma el lote del mes en Dispersiones → Lotes.';
    m.approve.mockRejectedValue(new ApiError(409, msg, 'APROBAR_POR_LOTE'));
    await montar();
    await act(async () => {
      (q('detalle-aprobar') as HTMLButtonElement).click();
    });
    await asentar();

    expect(m.toast.error).toHaveBeenCalledTimes(1);
    const [titulo, opciones] = m.toast.error.mock.calls[0] as [
      string,
      { description: string; action: { label: string; onClick: () => void } },
    ];
    expect(titulo).toBe('Tu inmobiliaria aprueba por lote');
    expect(titulo).not.toContain('Error');
    expect(opciones.description).toBe(msg);
    expect(opciones.action.label).toBe('Ir a Lotes');
    opciones.action.onClick();
    expect(m.push).toHaveBeenCalledWith('/panel/inmobiliaria/pagos/dispersiones/lotes');

    // Y la pantalla deja de ofrecer aprobar suelto.
    expect(q('resumen-aprobar-todas')).toBeNull();
    expect(q('fila-aprobar')).toBeNull();
  });
});

describe('D5 — el resumen que no cargó', () => {
  it('se rotula «estimado» con reintento, y reintentar lo vuelve a pedir', async () => {
    m.getSummary.mockRejectedValueOnce(new ApiError(500, 'boom'));
    await montar();

    const aviso = q('resumen-estimado') as HTMLElement;
    expect(aviso.textContent).toContain('Totales estimados');
    expect(aviso.textContent).toContain('el resumen del mes no cargó');

    m.getSummary.mockResolvedValue(resumenDelBack());
    await act(async () => {
      (q('resumen-reintentar') as HTMLButtonElement).click();
    });
    await asentar();
    expect(m.getSummary).toHaveBeenCalledTimes(2);
    expect(q('resumen-estimado')).toBeNull();
  });

  it('si tampoco cargó la lista no hay nada que estimar: se dice que falló', async () => {
    m.getSummary.mockRejectedValue(new ApiError(500, 'boom'));
    lista = { ...lista, dispersiones: [], isLoading: true };
    await montar();
    lista = { ...lista, isLoading: false, error: 'boom', errorCrudo: new ApiError(500, 'boom') };
    await volverAPintar();

    const zona = q('dispersiones-resumen') as HTMLElement;
    expect(q('fallo-de-carga', zona)).not.toBeNull();
    expect(q('resumen-estimado')).toBeNull();
  });
});

describe('D6 — el extracto en el modal', () => {
  it('esqueleto mientras carga y, si falla, el fallo con reintento DENTRO del modal', async () => {
    let rechazar: (e: unknown) => void = () => undefined;
    m.getExtracto.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rechazar = reject;
        }),
    );
    await montar();
    await act(async () => {
      (q('detalle-extracto') as HTMLButtonElement).click();
    });

    const cuerpo = () => q('extracto-cuerpo', document.body) as HTMLElement;
    expect(q('esqueleto-tabla', cuerpo())).not.toBeNull();

    await act(async () => {
      rechazar(new ApiError(500, 'boom'));
    });
    await asentar();
    expect(q('fallo-de-carga', cuerpo())).not.toBeNull();
    expect(q('esqueleto-tabla', cuerpo())).toBeNull();

    m.getExtracto.mockResolvedValue({ lineItems: [] });
    await act(async () => {
      (q('reintentar', cuerpo()) as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r, 450));
    });
    await asentar();
    expect(m.getExtracto).toHaveBeenCalledTimes(2);
    expect(q('extracto', cuerpo())).not.toBeNull();
    // El fallo ya no va como toast por detrás del modal.
    expect(m.toast.error).not.toHaveBeenCalled();
  });
});
