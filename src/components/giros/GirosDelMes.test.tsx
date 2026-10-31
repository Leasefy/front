/**
 * «Giros a propietarios» en una pantalla (Nico, 31-10-2026): los tres pasos dicen lo que toca, el botón
 * grande «Girar» lleva lo que está listo, los giros sueltos se avisan con su salida y lo que está en el
 * banco ofrece «Ya el banco pagó».
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

let soyAdmin = true;
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAdmin: soyAdmin, isLoading: false, agencyRole: 'admin' }),
}));
vi.mock('@/components/dispersiones/lotes/use-nombres-del-equipo', () => ({
  useNombresDelEquipo: () => ({ yo: 'u-1', nombreDe: () => 'Ana' }),
}));
vi.mock('@/lib/hooks/use-refresco-automatico', () => ({ useRefrescoAutomatico: () => undefined }));
vi.mock('@/components/dispersiones/lotes/ComoSaleUnLote', () => ({ ComoSaleUnLote: () => null }));
vi.mock('@/components/dispersiones/lotes/DetalleDelLote', () => ({ ArchivoDialog: () => null, MarcarPagadoDialog: () => null }));
vi.mock('@/components/dispersiones/lotes/ElegirBancoDeOrigen', () => ({ ElegirBancoDeOrigen: () => null }));
vi.mock('@/components/dispersiones/lotes/ElegirAQuienPagarle', () => ({ ElegirAQuienPagarle: () => null }));
vi.mock('@/components/seguridad/CodigoDeLaApp', () => ({ CampoDelCodigoDeLaApp: () => null }));

const m = vi.hoisted(() => ({
  liquidacionDelMes: vi.fn(),
  candidatos: vi.fn(),
  listar: vi.fn(),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { liquidacionDelMes: m.liquidacionDelMes, devolverAlLoteEnElCentro: vi.fn(), descartarEnElCentro: vi.fn() },
}));
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  RECURSO_DE_LOTES: 'lotes-de-dispersion',
  lotesDeDispersionApi: { candidatos: m.candidatos, listar: m.listar, ver: vi.fn(), armar: vi.fn() },
}));

import { GirosDelMes } from './GirosDelMes';

const fila = (estado: string, dispersiones: { id: string; status: string; aGirarCop: number }[]) => ({
  propietarioId: Math.random().toString(),
  propietarioName: 'Ana',
  estado,
  mes: {},
  generado: null,
  pendiente: null,
  dispersiones,
  cuentaDeDestino: { banco: null, cuenta: null },
});
const candidato = (id: string, netoCop: number, motivoDeExclusion: string | null = null, tipoDeExclusion: string | null = null) => ({
  dispersionId: id,
  propietarioId: `p-${id}`,
  nombre: 'Ana',
  month: '2026-10',
  netoCop,
  acumuladoCop: netoCop,
  entraEnElCupo: true,
  motivoDeExclusion,
  tipoDeExclusion,
});

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  soyAdmin = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  m.listar.mockResolvedValue([]);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

async function montar() {
  await act(async () => {
    root.render(<GirosDelMes />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}
const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`);

describe('GirosDelMes — el paso a paso del mes en una pantalla', () => {
  it('🔴 con el mes liquidado: el paso «Girar» es el actual, con el botón grande y lo que no va', async () => {
    m.liquidacionDelMes.mockResolvedValue({
      propietarios: [
        fila('GENERADA', [{ id: 'd1', status: 'DISP_PENDING', aGirarCop: 2_000_000 }]),
        fila('GENERADA', [{ id: 'd2', status: 'DISP_PENDING', aGirarCop: 1_000_000 }]),
        fila('GENERADA', [{ id: 'd3', status: 'DISP_PENDING', aGirarCop: 500_000 }]),
      ],
    });
    m.candidatos.mockResolvedValue({
      candidatos: [candidato('d1', 2_000_000), candidato('d2', 1_000_000), candidato('d3', 500_000, 'Falta la cuenta.', 'SIN_CUENTA')],
      sugeridos: [],
      totalCop: 3_000_000,
      cantidad: 2,
    });
    await montar();

    expect(q('pasos-de-los-giros-liquidar')?.getAttribute('data-estado')).toBe('hecho');
    expect(q('pasos-de-los-giros-girar')?.getAttribute('data-estado')).toBe('actual');
    expect(q('girar')?.textContent).toContain('2 propietarios');
    expect(q('no-van-en-el-giro')?.textContent).toContain('1 sin cuenta bancaria');
    expect(q('giros-sueltos')).toBeNull();
  });

  it('🔴 los giros aprobados sueltos (los 488 de Nico) se avisan con «Pasarlos al lote»', async () => {
    m.liquidacionDelMes.mockResolvedValue({
      propietarios: [
        fila('GENERADA', [{ id: 'd1', status: 'PROCESSING', aGirarCop: 2_000_000 }]),
        fila('GENERADA', [{ id: 'd2', status: 'PROCESSING', aGirarCop: 1_000_000 }]),
      ],
    });
    m.candidatos.mockResolvedValue({ candidatos: [], sugeridos: [], totalCop: 0, cantidad: 0 });
    await montar();

    expect(q('giros-sueltos')?.textContent).toContain('2 giros quedaron fuera del lote');
    expect(q('pasar-sueltos-al-lote')).not.toBeNull();
  });

  it('con el liquidar pendiente, «Girar» espera y dice por qué', async () => {
    m.liquidacionDelMes.mockResolvedValue({
      propietarios: [{ ...fila('POR_GENERAR', []), pendiente: { aGirarCop: 1_500_000 } }],
    });
    m.candidatos.mockResolvedValue({ candidatos: [], sugeridos: [], totalCop: 0, cantidad: 0 });
    await montar();

    expect(q('pasos-de-los-giros-liquidar')?.getAttribute('data-estado')).toBe('actual');
    expect(q('liquidar-el-mes')).not.toBeNull();
    expect(q('pasos-de-los-giros-girar')?.textContent).toContain('Primero liquida a los que faltan.');
  });

  it('un lote con el archivo en el banco ofrece «Ya el banco pagó»', async () => {
    m.liquidacionDelMes.mockResolvedValue({
      propietarios: [fila('GENERADA', [{ id: 'd1', status: 'DISP_PENDING', aGirarCop: 2_000_000 }])],
    });
    m.candidatos.mockResolvedValue({ candidatos: [], sugeridos: [], totalCop: 0, cantidad: 0 });
    m.listar.mockResolvedValue([{ id: 'l-1', month: '2026-10', estado: 'ARCHIVO_GENERADO', totalCop: 2_000_000, cantidad: 1 }]);
    await montar();

    expect(q('pasos-de-los-giros-banco')?.getAttribute('data-estado')).toBe('actual');
    expect(q('ya-pago-l-1')?.textContent).toContain('Ya el banco pagó');
  });

  it('quien no es administrador no ve «Autorizar el giro» en un lote que espera', async () => {
    soyAdmin = false;
    m.liquidacionDelMes.mockResolvedValue({
      propietarios: [fila('GENERADA', [{ id: 'd1', status: 'DISP_PENDING', aGirarCop: 2_000_000 }])],
    });
    m.candidatos.mockResolvedValue({ candidatos: [], sugeridos: [], totalCop: 0, cantidad: 0 });
    m.listar.mockResolvedValue([{ id: 'l-1', month: '2026-10', estado: 'ESPERANDO_APROBACION', totalCop: 2_000_000, cantidad: 1, creadoPorUserId: 'u-2' }]);
    await montar();

    expect(q('autorizar-l-1')).toBeNull();
    expect(q('lote-en-curso-l-1')?.textContent).toContain('Les avisamos a los administradores');
  });
});
