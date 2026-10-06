/**
 * Egresos, QA de Contabilidad (03-10-2026). El armado (mocks) es el de
 * `Egresos.test.tsx`.
 *
 *   · CB-07: los «por qué está apagado» de cada acción no se pintan dentro de
 *     la fila (iban en el `title` y para el lector de pantalla), la fila dice
 *     UNA ayuda corta; sin el código interno «(P-4)»; la barra de abajo no se
 *     pega (ni tapa filas) mientras no haya nada marcado.
 *   · CB-22: bajo 768 px cada egreso es una tarjeta con sus acciones.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Egreso, LoteDeEgreso } from '@/lib/api/gastos.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { gastos, escrituraMock, cambioMock, toastMock, salidasDelEgreso } = vi.hoisted(() => ({
  // Seguimiento 6: la salida del extracto se elige de una lista (ya no se teclea el id).
  salidasDelEgreso: { listar: vi.fn() },
  gastos: {
    egresos: {
      listar: vi.fn(),
      registrar: vi.fn(),
      anular: vi.fn(),
      conciliar: vi.fn(),
      comprobante: vi.fn(),
      historial: vi.fn(),
      cambiar: vi.fn(),
    },
    lotes: {
      listar: vi.fn(),
      crear: vi.fn(),
      aprobar: vi.fn(),
      archivo: vi.fn(),
      pagado: vi.fn(),
      anular: vi.fn(),
    },
  },
  escrituraMock: {
    puede: true,
    motivo: null as string | null,
    usuarioId: 'u-yo',
    esAdministrador: false as boolean,
  },
  // El permiso PUNTUAL de corregir un egreso (22-09), aparte de la escritura.
  cambioMock: { puede: true, motivo: null as string | null, usuarioId: 'u-yo' },
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/api/gastos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/gastos.service')>(
    '@/lib/api/gastos.service',
  );
  return { ...actual, gastosApi: gastos };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return {
    ...actual,
    usePuedeEscribir: () => escrituraMock,
    usePuedeCambiarEgresos: () => cambioMock,
  };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/api/salidas-del-egreso', () => ({ salidasDelEgresoApi: salidasDelEgreso }));
const celular = vi.hoisted(() => ({ valor: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => celular.valor }));
vi.mock('@/lib/i18n', async () => {
  const { t } = await import('@/lib/i18n/i18n-test-stub');
  return {
    useI18n: () => ({ t, formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
  };
});

import { Egresos, parteDeEgresos } from './Egresos';
import { ApiError } from '@/lib/api/client';
import { MOTIVO_SIN_CAMBIO_DE_EGRESO } from '../use-puede-escribir';

const egreso = (extra: Partial<Egreso> = {}): Egreso => ({
  id: 'e1',
  numero: null,
  estado: 'PENDIENTE',
  beneficiarioTipo: 'PROVEEDOR',
  beneficiarioId: null,
  beneficiarioNombre: 'Ferretería El Tornillo SAS',
  beneficiarioTipoDocumento: 'NIT',
  beneficiarioDocumento: '900123456',
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroDeCuenta: '123456789',
  facturaId: 'f1',
  concepto: 'FE-4521 Cerraduras',
  valorCop: 476_000,
  retefuenteCop: 10_000,
  reteivaCop: 0,
  reteicaCop: 3_040,
  netoCop: 462_960,
  rubro: 'oficina',
  sedeId: null,
  loteId: null,
  fechaDelEgreso: null,
  asientoId: null,
  asientoNumero: null,
  movimientoBancarioId: null,
  motivoDeLaAnulacion: null,
  ...extra,
});

const lote = (extra: Partial<LoteDeEgreso> = {}): LoteDeEgreso => ({
  id: 'l1',
  concepto: 'Proveedores segunda quincena',
  estado: 'BORRADOR',
  totalCop: 462_960,
  cantidad: 1,
  creadoPorUserId: 'u-otro',
  aprobadoPorUserId: null,
  aprobadoAt: null,
  formatoArchivo: 'BANCOLOMBIA_PAB',
  archivoGeneradoAt: null,
  archivoHash: null,
  pagadoAt: null,
  referenciaBanco: null,
  anuladoAt: null,
  motivoDeLaAnulacion: null,
  egresos: [egreso({ estado: 'EN_LOTE', loteId: 'l1' })],
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  gastos.egresos.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 1, egresos: [egreso()] });
  gastos.lotes.listar
    .mockReset()
    .mockResolvedValue({ disponible: true, motivo: null, total: 1, lotes: [lote()] });
  gastos.lotes.aprobar.mockReset().mockResolvedValue(lote({ estado: 'APROBADO' }));
  gastos.lotes.crear.mockReset().mockResolvedValue(lote());
  gastos.lotes.pagado.mockReset();
  gastos.egresos.historial.mockReset().mockResolvedValue({
    disponible: true,
    motivo: null,
    referencia: 'PAB-88231',
    nota: null,
    cambios: [],
  });
  gastos.egresos.cambiar.mockReset();
  escrituraMock.puede = true;
  escrituraMock.motivo = null;
  escrituraMock.usuarioId = 'u-yo';
  escrituraMock.esAdministrador = false;
  cambioMock.puede = true;
  cambioMock.motivo = null;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar(inicial: 'egresos' | 'lotes' = 'egresos') {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<Egresos inicial={inicial} />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}


describe('Egresos · CB-07, la fila que cabe', () => {
  it('🔴 los motivos de las acciones apagadas no se pintan en la fila: van en el title y para el lector', async () => {
    await pintar();
    const motivo = q('comprobante-e1-motivo')!;
    expect(motivo.className).toContain('sr-only');
    const boton = q('comprobante-e1') as HTMLButtonElement;
    expect(boton.getAttribute('aria-describedby')).toBe(motivo.id);
    expect(boton.parentElement!.getAttribute('title')).toContain('se numera cuando el lote');
    // UNA ayuda corta en su lugar.
    expect(q('ayuda-de-acciones-e1')!.textContent).toBe(
      'El comprobante y la conciliación, cuando el lote se marque pagado.',
    );
  });

  it('🔴 ningún texto de la pantalla muestra el código interno «P-4»', async () => {
    escrituraMock.esAdministrador = true;
    await pintar();
    expect(document.body.textContent).not.toContain('P-4');
    expect(q('armar-lote-resumen')!.textContent).toContain('queda aprobado al armarlo');
  });

  it('🔴 sin nada marcado la barra no se pega al borde (no tapa la segunda fila)', async () => {
    await pintar();
    expect(q('armar-lote')!.className).not.toMatch(/\bsticky\b/);
    expect(q('armar-lote')!.parentElement!.className).not.toMatch(/\bsticky\b/);
  });
});

describe('Egresos · CB-22, tarjetas en el celular', () => {
  afterEach(() => {
    celular.valor = false;
  });

  it('🔴 bajo 768 px no hay tabla: tarjetas con beneficiario, concepto, valor, estado y acciones', async () => {
    celular.valor = true;
    await pintar();
    expect(q('tarjetas-de-egresos')).not.toBeNull();
    expect(q('egresos')!.querySelector('table')).toBeNull();
    const tarjeta = q('egreso-e1')!;
    expect(tarjeta.textContent).toContain('Ferretería El Tornillo SAS');
    expect(tarjeta.textContent).toContain('FE-4521 Cerraduras');
    expect(tarjeta.textContent).toContain('462.960');
    expect(tarjeta.textContent).toContain('Pendiente');
    expect(tarjeta.querySelector('[data-testid="anular-egreso-e1"]')).not.toBeNull();
    expect(tarjeta.querySelector('[data-testid="marcar-e1"]')).not.toBeNull();
  });
});
