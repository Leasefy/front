/**
 * Configuración de la conciliación, ola 3 (Nico): la alerta a los 30 días
 * (P10), el efectivo APAGADO por defecto (P12) y la cuenta contable de cada
 * cuenta bancaria (P9). Sin la migración se dice y no se guarda.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock } = vi.hoisted(() => ({
  api: { configuracion: vi.fn(), cuentasContables: vi.fn(), guardarConfiguracion: vi.fn(), asignarCuentaContable: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/cierre-de-conciliacion', async (original) => {
  const real = await original<typeof import('@/lib/api/cierre-de-conciliacion')>();
  return { ...real, cierreDeConciliacionApi: api };
});
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: () => true, isLoading: false, agencyRole: 'ADMIN' }) }));
vi.mock('@/components/contabilidad/use-cuentas', () => ({ useCuentas: () => ({ cuentas: [], cargando: false, error: null, recargar: () => {} }) }));

import { ConciliacionCierreYEfectivo, diasDeAlertaValidos } from './ConciliacionCierreYEfectivo';

let root: Root | undefined;
let contenedor: HTMLDivElement | undefined;
async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const r = createRoot(contenedor);
  root = r;
  await act(async () => {
    r.render(<ConciliacionCierreYEfectivo />);
  });
}
const $ = (testid: string) => document.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;

beforeEach(() => {
  vi.clearAllMocks();
  api.configuracion.mockResolvedValue({ disponible: true, diasDeAlerta: 30, efectivoActivo: false, porDefecto: true });
  api.cuentasContables.mockResolvedValue({ disponible: true, motivo: null, cuentaDeLosRecibos: null, cuentas: [] });
});
afterEach(() => {
  const r = root;
  if (r) act(() => r.unmount());
  root = undefined;
  contenedor?.remove();
});

describe('configuración de la conciliación (ola 3)', () => {
  it('los días de la alerta van de 1 a 365', () => {
    expect(diasDeAlertaValidos('30')).toBe(30);
    expect(diasDeAlertaValidos('0')).toBeNull();
    expect(diasDeAlertaValidos('366')).toBeNull();
    expect(diasDeAlertaValidos('3a')).toBeNull();
  });

  it('🔴 arranca en 30 días y con el efectivo APAGADO; prenderlo lo guarda', async () => {
    api.guardarConfiguracion.mockResolvedValue({ disponible: true, diasDeAlerta: 30, efectivoActivo: true, porDefecto: false });
    await montar();
    expect(($('dias-de-alerta') as HTMLInputElement).value).toBe('30');
    const sw = $('efectivo-activo')!;
    expect(sw.getAttribute('aria-checked')).toBe('false');
    await act(async () => sw.click());
    expect(api.guardarConfiguracion).toHaveBeenCalledWith({ efectivoActivo: true });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/planilla de caja/));
  });

  /** 🔴 Seguimiento 6 (Nico, D-CONC 2 a): cada recibo en la cuenta contable de SU cuenta bancaria. */
  it('dice que los recibos del extracto de cada cuenta se asientan en su cuenta contable, y cuándo no se puede', async () => {
    api.cuentasContables.mockResolvedValue({
      disponible: true,
      motivo: null,
      cuentaDeLosRecibos: { id: 'p-gen', codigo: '111005', nombre: 'Bancos nacionales' },
      cuentas: [
        { id: 'c-1', nombre: 'Ahorros Bancolombia', numeroEnmascarado: '•••• 6789', banco: 'Bancolombia', activa: true, cuentaPuc: { id: 'p-1', codigo: '11100501', nombre: 'Bancolombia' }, compartida: false, asientaLosRecibos: true, porQueNoAsientaLosRecibos: null },
        { id: 'c-2', nombre: 'Corriente Davivienda', numeroEnmascarado: null, banco: 'Davivienda', activa: true, cuentaPuc: { id: 'p-2', codigo: '1110', nombre: 'Bancos' }, compartida: false, asientaLosRecibos: false, porQueNoAsientaLosRecibos: 'La cuenta 1110 Bancos es una cuenta mayor: no admite movimientos, así que sus recibos se asientan en la de bancos del mapeo. Elige una subcuenta.' },
      ],
    });
    await montar();
    await act(async () => {});
    expect(document.body.textContent).toContain('aquí se asientan los recibos que se concilian desde el extracto de esa cuenta');
    expect(document.body.textContent).toContain('Sin cuenta contable, van a 111005 Bancos nacionales');
    expect($('cuenta-contable-sin-recibos-c-1')).toBeNull();
    expect($('cuenta-contable-sin-recibos-c-2')?.textContent).toContain('es una cuenta mayor');
  });

  /** 🔴 ARREGLOS-5 (Nico Q2 a): un solo interruptor de efectivo, el de los medios de recibo. */
  it('el efectivo dice que es el mismo de Medios de recibo y se guarda aun sin la migración del cierre', async () => {
    api.configuracion.mockResolvedValue({
      disponible: false,
      diasDeAlerta: 30,
      efectivoActivo: false,
      porDefecto: true,
      efectivoDesde: 'medios-de-recibo',
      efectivoSePuedeGuardar: true,
    });
    api.guardarConfiguracion.mockResolvedValue({
      disponible: false,
      diasDeAlerta: 30,
      efectivoActivo: true,
      porDefecto: false,
      efectivoDesde: 'medios-de-recibo',
      efectivoSePuedeGuardar: true,
    });
    await montar();
    expect($('efectivo-un-solo-interruptor')?.textContent).toContain('Medios de recibo');
    expect(($('dias-de-alerta') as HTMLInputElement).disabled).toBe(true);
    expect($('conciliacion-config-sin-migracion')?.textContent).toContain('Los días de la alerta todavía no se pueden guardar');
    const sw = $('efectivo-activo')!;
    expect(sw.hasAttribute('disabled')).toBe(false);
    await act(async () => sw.click());
    expect(api.guardarConfiguracion).toHaveBeenCalledWith({ efectivoActivo: true });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringMatching(/recibos en efectivo/));
  });

  it('sin la migración: lo dice y no deja guardar', async () => {
    api.configuracion.mockResolvedValue({ disponible: false, diasDeAlerta: 30, efectivoActivo: false, porDefecto: true });
    await montar();
    expect($('conciliacion-config-sin-migracion')).not.toBeNull();
    expect(($('dias-de-alerta') as HTMLInputElement).disabled).toBe(true);
    // Un back sin el campo nuevo: el efectivo sigue la migración, como antes.
    expect($('efectivo-activo')!.hasAttribute('disabled')).toBe(true);
  });
});
