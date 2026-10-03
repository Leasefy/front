/**
 * 🔴 El cierre del mes por cuenta (Nico, P9): firma el CONTADOR (con su
 * confirmación), reabre un ADMINISTRADOR con motivo, y exportar sale de la
 * foto guardada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos, exportar } = vi.hoisted(() => ({
  api: { meses: vi.fn(), bitacora: vi.fn(), borrador: vi.fn(), cierre: vi.fn(), cerrar: vi.fn(), reabrir: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: { agencyRole: 'CONTADOR' as string | null, canAccess: () => true, isLoading: false },
  exportar: { excel: vi.fn(), pdf: vi.fn() },
}));

vi.mock('@/lib/api/cierre-de-conciliacion', async (original) => {
  const real = await original<typeof import('@/lib/api/cierre-de-conciliacion')>();
  return { ...real, cierreDeConciliacionApi: api };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }));
vi.mock('./cierre-del-mes', async (original) => {
  const real = await original<typeof import('./cierre-del-mes')>();
  return { ...real, exportarElCierreAExcel: exportar.excel, exportarElCierreAPdf: exportar.pdf };
});

import { CierreDelMes } from './CierreDelMes';

const FOTO = {
  formato: 1,
  cuenta: { id: 'cta', nombre: 'Ahorros •••• 6789', numeroEnmascarado: '•••• 6789', banco: 'Bancolombia' },
  mes: '2026-09',
  mesEnPalabras: 'septiembre de 2026',
  periodo: { desde: '2026-09-01', hasta: '2026-09-30' },
  saldos: {
    extracto: { valorCop: 1_000, fuente: 'carga', detalle: 'del extracto' },
    libros: { valorCop: 1_000, cuentaPuc: null, compartida: false, detalle: 'de libros' },
    diferenciaCop: 0,
    efectoDeLasPartidasCop: 0,
    diferenciaSinExplicarCop: 0,
  },
  partidas: { lista: [], porTipoYRango: [], total: { n: 0, valorCop: 0, valorAbsolutoCop: 0 } },
  conciliado: { lineasDelMes: 2, conciliadas: 2, pendientes: 0, porNumeroPct: 100, valorDelMesCop: 1, conciliadoCop: 1, porValorPct: 100 },
  quien: [],
  ignoradas: { n: 0, valorCop: 0, entradas: 0, entradasCop: 0 },
  terceros: null,
  avisos: [],
  armadaAt: '2026-10-02T00:00:00.000Z',
  firma: null,
};

const CIERRE = {
  id: 'c1', cuentaId: 'cta', mes: '2026-08', version: 1, estado: 'CERRADO', saldoExtractoCop: 1, saldoLibrosCop: 1, diferenciaCop: 0,
  partidas: 0, partidasCop: 0, conciliadoPorNumeroPct: 100, conciliadoPorValorPct: 100, huella: 'b'.repeat(64),
  firma: { userId: 'u', nombre: 'Carla', rol: 'CONTADOR', tarjetaProfesional: null, firmadoAt: '2026-09-02T00:00:00.000Z' },
  reapertura: null,
};

let root: Root;
let contenedor: HTMLDivElement;

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
    root.render(<CierreDelMes cuentaId="cta" />);
  });
}
const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;
async function clic(el: HTMLElement | null) {
  expect(el).not.toBeNull();
  await act(async () => {
    el!.click();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  permisos.agencyRole = 'CONTADOR';
  api.meses.mockResolvedValue({
    disponible: true,
    sePuedeFirmar: true,
    motivo: null,
    cuenta: { id: 'cta', nombre: 'Ahorros •••• 6789', numeroEnmascarado: '•••• 6789', banco: 'Bancolombia' },
    meses: [
      { mes: '2026-10', mesEnPalabras: 'octubre de 2026', estado: 'ABIERTO', terminado: false, lineas: 3, pendientes: 1, cierre: null, versiones: 0 },
      { mes: '2026-09', mesEnPalabras: 'septiembre de 2026', estado: 'ABIERTO', terminado: true, lineas: 4, pendientes: 0, cierre: null, versiones: 0 },
      { mes: '2026-08', mesEnPalabras: 'agosto de 2026', estado: 'CERRADO', terminado: true, lineas: 4, pendientes: 0, cierre: CIERRE, versiones: 1 },
    ],
  });
  api.bitacora.mockResolvedValue({ disponible: true, eventos: [] });
  api.borrador.mockResolvedValue({ foto: FOTO, huella: 'c'.repeat(64) });
  api.cierre.mockResolvedValue({ ...CIERRE, foto: { ...FOTO, mes: '2026-08' }, integra: true });
  api.cerrar.mockResolvedValue({ ...CIERRE, mes: '2026-09' });
  api.reabrir.mockResolvedValue({ ...CIERRE, estado: 'REABIERTO' });
});
afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('🔴 cierre del mes', () => {
  it('lista los meses con su estado; el mes en curso no se cierra', async () => {
    await montar();
    expect($('mes-2026-10')?.textContent).toMatch(/En curso/);
    expect($('mes-2026-08')?.textContent).toMatch(/Cerrado y firmado/);
    expect($('ver-borrador-2026-09')?.textContent).toMatch(/Revisar y firmar/);
  });

  it('🔴 el mes se escribe con mayúscula sólo al principio («Septiembre de 2026», nunca «Septiembre De 2026»)', async () => {
    await montar();
    const fila = $('mes-2026-09');
    expect(fila?.textContent).toMatch(/Septiembre de 2026/);
    expect(fila?.querySelector('.capitalize')).toBeNull();
    await clic($('ver-borrador-2026-09'));
    const titulo = document.querySelector('[role="dialog"] h2');
    expect(titulo?.textContent).toMatch(/^Borrador del cierre de septiembre de 2026$/);
    expect(titulo?.classList.contains('capitalize')).toBe(false);
  });

  it('🔴 el contador firma sólo después de confirmar que revisó', async () => {
    await montar();
    await clic($('ver-borrador-2026-09'));
    expect($('foto-del-cierre')).not.toBeNull();
    expect(($('confirmar-firma') as HTMLButtonElement).disabled).toBe(true);
    await clic($('confirmo-el-cierre'));
    await clic($('confirmar-firma'));
    expect(api.cerrar).toHaveBeenCalledWith(expect.objectContaining({ cuentaId: 'cta', mes: '2026-09', confirmo: true }));
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/^Septiembre de 2026 quedó cerrado y firmado/));
  });

  it('🔴 el administrador no firma (ve el borrador) y reabre con motivo', async () => {
    permisos.agencyRole = 'ADMIN';
    await montar();
    expect($('ver-borrador-2026-09')?.textContent).toMatch(/Ver el borrador/);
    await clic($('ver-cierre-2026-08'));
    expect($('reabrir-el-cierre')).not.toBeNull();
    expect(($('confirmar-reabrir') as HTMLButtonElement).disabled).toBe(true);
    const textarea = document.getElementById('motivo-reabrir') as HTMLTextAreaElement;
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      set.call(textarea, 'El banco corrigió una línea del 14');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clic($('confirmar-reabrir'));
    expect(api.reabrir).toHaveBeenCalledWith('c1', 'El banco corrigió una línea del 14');
  });

  it('un asesor o un contador no reabren; exportar sale de la foto guardada', async () => {
    permisos.agencyRole = 'CONTADOR';
    await montar();
    await clic($('ver-cierre-2026-08'));
    expect($('reabrir-el-cierre')).toBeNull();
    expect($('huella-del-cierre')?.textContent).toContain('b'.repeat(64));
    await clic($('exportar-excel'));
    await clic($('exportar-pdf'));
    expect(exportar.excel).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1', huella: 'b'.repeat(64) }));
    expect(exportar.pdf).toHaveBeenCalledTimes(1);
  });

  it('un back sin la ruta: no se pinta nada', async () => {
    api.meses.mockRejectedValue(Object.assign(new Error('no'), { status: 404 }));
    await montar();
    expect($('cierre-del-mes')).toBeNull();
  });
});
