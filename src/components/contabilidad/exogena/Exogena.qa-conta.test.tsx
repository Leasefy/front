/**
 * Exógena, QA de Contabilidad (CB-12, 03-10-2026). El armado es el de
 * `Exogena.test.tsx`.
 *
 *   · el badge dice el estado REAL («No se puede presentar», no «Generada» al
 *     lado del cartel rojo);
 *   · los 🔴 del back salen del texto (el cartel trae el ícono del DS);
 *   · el bloqueo no se repite junto al botón «Visto bueno»: una ayuda corta.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResumenDeExogena, ResumenDeFormato } from '@/lib/api/exogena.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, escrituraMock, exportarMock, toastMock } = vi.hoisted(() => ({
  api: {
    resumen: vi.fn(),
    formato: vi.fn(),
    archivo: vi.fn(),
    conceptos: vi.fn(),
    guardarConceptos: vi.fn(),
    aprobar: vi.fn(),
    anular: vi.fn(),
  },
  escrituraMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  exportarMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/exogena.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/exogena.service')>(
    '@/lib/api/exogena.service',
  );
  return { ...actual, exogenaApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return {
    ...actual,
    usePuedeEscribir: () => escrituraMock,
    usePuedeExportarContabilidad: () => exportarMock,
  };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));

import { Exogena } from './Exogena';

const formato = (extra: Partial<ResumenDeFormato> = {}): ResumenDeFormato => ({
  formato: '1001',
  nombre: 'Pagos y abonos en cuenta y retenciones practicadas',
  filas: 128,
  totalCop: 740_000_000,
  estado: 'GENERADA',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  observaciones: null,
  bloqueos: [],
  avisos: [],
  necesitaContador: true,
  ...extra,
});

const resumen = (
  formatos: ResumenDeFormato[] = [formato()],
  extra: Partial<ResumenDeExogena> = {},
): ResumenDeExogena => ({
  anio: 2026,
  formatos,
  disponible: true,
  cuantiasMenores: { activa: false, topeCop: 1_000_000, nit: '222222222', filas: 0 },
  ...extra,
});

const conceptos = () => ({
  anio: 2026,
  disponible: true,
  conceptos: [
    {
      cuentaId: 'c1',
      codigo: '513595',
      nombre: 'Otros servicios',
      formato: '1001' as const,
      concepto: '5008',
      fuente: 'PRESET' as const,
    },
  ],
  sinConcepto: [{ cuentaId: 'c2', codigo: '519595', movimientosCop: 3_400_000 }],
  avisoLegal: 'Los códigos de concepto los fija la resolución de la DIAN de cada año.',
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.resumen.mockReset().mockResolvedValue(resumen());
  api.conceptos.mockReset().mockResolvedValue(conceptos());
  api.formato.mockReset();
  api.archivo.mockReset().mockResolvedValue(new Blob(['x']));
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
  exportarMock.puede = true;
  exportarMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(anioInicial?: number) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Exogena anioInicial={anioInicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}


describe('<Exogena> · CB-12', () => {
  const BLOQUEO = '🔴 2 movimientos por $205.830 no tienen tercero: la exógena no se puede presentar así.';

  it('🔴 con bloqueos el badge dice que no se puede presentar, no «Generada»', async () => {
    api.resumen.mockResolvedValue(resumen([formato({ bloqueos: [BLOQUEO] })]));
    await pintar();
    expect(q('estado-1001')!.textContent).toBe('No se puede presentar');
    expect(q('formato-1001')!.textContent).not.toContain('Generada');
  });

  it('🔴 sin emojis en el texto del back y con la plata de la casa', async () => {
    api.resumen.mockResolvedValue(
      resumen([formato({ bloqueos: [BLOQUEO], paraElContador: ['🔴 ¿Los giros a los propietarios van en el 1001?'] })]),
    );
    await pintar();
    const tarjeta = q('formato-1001')!.textContent ?? '';
    expect(tarjeta).not.toContain('🔴');
    expect(q('bloqueos-1001')!.textContent).toContain('2 movimientos por $ 205.830');
  });

  it('🔴 el bloqueo no se repite junto a «Visto bueno»: va en el title y una ayuda corta lo dice', async () => {
    api.resumen.mockResolvedValue(resumen([formato({ bloqueos: [BLOQUEO] })]));
    await pintar();
    const tarjeta = q('formato-1001')!;
    // El texto del bloqueo aparece UNA vez a la vista (en el cartel rojo).
    const visibles = Array.from(tarjeta.querySelectorAll('p, li')).filter(
      (n) => !n.closest('.sr-only') && !n.classList.contains('sr-only') && n.textContent?.includes('no tienen tercero'),
    );
    expect(visibles).toHaveLength(1);
    expect(q('aprobar-1001-motivo')!.className).toContain('sr-only');
    expect(q('ayuda-1001')!.textContent).toContain('Esto impide presentar el formato');
  });

  it('un formato limpio dice «Falta el visto bueno» y no lleva ayuda', async () => {
    await pintar();
    expect(q('estado-1001')!.textContent).toBe('Falta el visto bueno');
    expect(q('ayuda-1001')).toBeNull();
  });
});
