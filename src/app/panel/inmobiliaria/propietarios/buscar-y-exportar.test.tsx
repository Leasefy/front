/**
 * buscar-y-exportar.test.tsx — dos cosas que la lista de Propietarios decía y
 * no hacía.
 *
 * 1. **Buscar sólo miraba la página actual.** La página paginaba primero y le
 *    pasaba a `PropietarioTable` las 10 filas de la página 1; la tabla
 *    filtraba ESAS. Con 12 propietarios, buscar al que estaba en la página 2
 *    daba «No se encontraron propietarios»: la pantalla afirmando que no
 *    existe alguien que sí existe. Lo mismo con el filtro de saldo y con el
 *    orden (ordenaba 10 filas sueltas).
 *
 * 2. **«Exportar» no exportaba.** Era `toast.info('Exportando…')` y un
 *    `// TODO`. El cartel afirmaba un hecho —que el archivo estaba saliendo—
 *    que no ocurría, y no había forma de notarlo salvo esperar.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Propietario } from '@/lib/types/inmobiliaria';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { listaMock, exportarLista, toast } = vi.hoisted(() => ({
  listaMock: vi.fn(),
  exportarLista: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}(${Object.values(p).join(',')})` : k),
    formatCurrency: (n: number) => String(n),
  }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({
    propietarios: listaMock(),
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useMigracionConDeuda: () => null }));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/propietarios/exportar-datos', () => ({
  descargarListaDePropietarios: exportarLista,
}));

vi.mock('sonner', () => ({ toast }));
vi.mock('@/components/ui/toast', () => ({ toast }));

/*
 * La tabla se reduce a lo que importa acá: qué filas recibe, qué contadores le
 * dieron, y un disparador para cambiar los filtros como lo haría el buscador.
 */
vi.mock('@/components/inmobiliaria', () => ({
  PropietarioCard: () => null,
  PropietarioForm: () => null,
  PropietarioTable: ({
    propietarios,
    totalFiltrado,
    total,
    filtros,
    onFiltros,
    onExport,
  }: {
    propietarios: Propietario[];
    totalFiltrado: number;
    total: number;
    filtros: Record<string, unknown>;
    onFiltros: (f: Record<string, unknown>) => void;
    onExport?: () => void;
  }) =>
    React.createElement(
      'div',
      null,
      React.createElement(
        'div',
        { 'data-testid': 'filas' },
        propietarios.map((p) => p.name).join('|'),
      ),
      React.createElement('div', { 'data-testid': 'cuenta' }, `${totalFiltrado}/${total}`),
      React.createElement('button', {
        'data-testid': 'buscar-ruiz',
        onClick: () => onFiltros({ ...filtros, busqueda: 'ruiz' }),
      }),
      React.createElement('button', { 'data-testid': 'exportar', onClick: () => onExport?.() }),
    ),
}));

vi.mock('@/components/inmobiliaria/TerceroIACapture', () => ({ TerceroIACapture: () => null }));

import PropietariosPage from './page';

function propietario(name: string): Propietario {
  return {
    id: name,
    name,
    email: null,
    phone: null,
    documentType: 'CC',
    documentNumber: name,
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Propietario;
}

/* 12 propietarios: la página muestra 10, así que «Zulema Ruiz» —última por
   orden alfabético— cae en la página 2 y NO está entre las filas que la tabla
   recibe al abrir. Ese es exactamente el caso que fallaba. */
const DOCE = [
  ...Array.from({ length: 11 }, (_, i) => propietario(`Ana ${String(i).padStart(2, '0')}`)),
  propietario('Zulema Ruiz'),
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  listaMock.mockReturnValue(DOCE);
  exportarLista.mockResolvedValue('propietarios-2026-09-05.xlsx');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

async function render() {
  await act(async () => {
    root.render(React.createElement(PropietariosPage));
  });
}

function texto(testId: string) {
  return document.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

async function click(testId: string) {
  const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!el) throw new Error(`no está ${testId}`);
  await act(async () => {
    el.click();
  });
}

describe('Buscar mira toda la lista, no la página que se está viendo', () => {
  it('al abrir, la página 1 no trae a quien está en la 2', async () => {
    await render();
    expect(texto('filas')).not.toContain('Zulema Ruiz');
    expect(texto('cuenta')).toBe('12/12');
  });

  it('buscar «ruiz» la encuentra igual', async () => {
    await render();
    await click('buscar-ruiz');
    expect(texto('filas')).toBe('Zulema Ruiz');
    expect(texto('cuenta')).toBe('1/12');
  });
});

describe('Exportar baja el archivo de verdad', () => {
  it('exporta lo que se está viendo y dice qué bajó', async () => {
    await render();
    await click('exportar');
    expect(exportarLista).toHaveBeenCalledTimes(1);
    expect(exportarLista.mock.calls[0][0]).toHaveLength(12);
    expect(toast.success).toHaveBeenCalled();
    // Nunca más el cartel que sólo dice «Exportando…» sin bajar nada.
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('con un filtro puesto exporta lo filtrado, no toda la base', async () => {
    await render();
    await click('buscar-ruiz');
    await click('exportar');
    expect(exportarLista.mock.calls[0][0].map((p: Propietario) => p.name)).toEqual([
      'Zulema Ruiz',
    ]);
  });

  it('si la descarga falla, lo dice y no dice «exportado»', async () => {
    exportarLista.mockRejectedValueOnce(new Error('sin memoria'));
    await render();
    await click('exportar');
    expect(toast.error).toHaveBeenCalledWith('inmobiliaria.propietarios.toasts.exportError');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
