/**
 * @vitest-environment happy-dom
 *
 * Configuración → la asegurabilidad manual: cómo le pagan (Nico 28-10-2026: «las dos formas»; 29-10-2026: «se la
 * giramos con su liquidación»). Lo que sostiene:
 *   1. sin el pago en línea en el back, no se ofrece (todo como antes: comprobante y su cuenta);
 *   2. con él, «Cómo te pagan»; sólo en línea no pide cuenta y guarda `formas: ['WOMPI']` con `cuentaId: null`.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConfiguracionDeLaAsegurabilidadManual } from '@/lib/api/asegurabilidad-manual.service';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ configuracion: vi.fn(), guardarConfiguracion: vi.fn() }));
vi.mock('@/lib/api/asegurabilidad-manual.service', () => ({ asegurabilidadManualApi: api }));
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: () => true }) }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ConfigDeLaAsegurabilidadManual } from './ConfigDeLaAsegurabilidadManual';

const SURA = '11111111-1111-4111-8111-111111111111';
const CUENTA = '22222222-2222-4222-8222-222222222222';
const config = (o: Partial<ConfiguracionDeLaAsegurabilidadManual> = {}): ConfiguracionDeLaAsegurabilidadManual => ({
  disponible: true,
  activa: true,
  precioCop: 85_000,
  cuentaId: CUENTA,
  formas: ['COMPROBANTE'],
  aseguradoraIds: [SURA],
  formasDisponibles: ['COMPROBANTE'],
  cuentas: [{ id: CUENTA, nombre: 'Ahorros', tipoLegible: 'Transferencia bancaria', banco: 'Bancolombia', tipoDeCuenta: 'AHORROS', numeroEnmascarado: '•••• 8901' }],
  aseguradoras: [{ id: SURA, nombre: 'Sura', nit: '890903407', activa: true }],
  ...o,
});

let raiz: Root | null = null;
async function montar() {
  const caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz!.render(<ConfigDeLaAsegurabilidadManual />));
  for (let i = 0; i < 3; i++) await act(async () => {});
}
const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
async function tocar(el: HTMLElement | null) {
  await act(async () => el!.click());
  for (let i = 0; i < 3; i++) await act(async () => {});
}

afterEach(() => {
  act(() => raiz?.unmount());
  raiz = null;
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('ConfigDeLaAsegurabilidadManual — cómo te pagan', () => {
  it('sin el pago en línea en el back, no se ofrece: comprobante y su cuenta, como antes', async () => {
    api.configuracion.mockResolvedValue(config());
    await montar();
    expect($('[data-testid="forma-WOMPI"]')).toBeNull();
    expect($('[data-testid="cuenta-del-estudio"]')).toBeTruthy();
  });

  it('con él: sólo en línea no pide cuenta y guarda formas WOMPI sin cuenta', async () => {
    api.configuracion.mockResolvedValue(config({ formasDisponibles: ['COMPROBANTE', 'WOMPI'] }));
    api.guardarConfiguracion.mockImplementation(async (d) => config({ ...d, formasDisponibles: ['COMPROBANTE', 'WOMPI'] }));
    await montar();
    expect(document.body.textContent).toContain('Cómo te pagan');
    await tocar($('[data-testid="forma-WOMPI"]'));
    await tocar($('[data-testid="forma-COMPROBANTE"]'));
    expect($('[data-testid="cuenta-del-estudio"]')).toBeNull();
    await tocar($('[data-testid="guardar-asegurabilidad-manual"]'));
    expect(api.guardarConfiguracion).toHaveBeenCalledWith(
      expect.objectContaining({ activa: true, formas: ['WOMPI'], cuentaId: null, precioCop: 85_000 }),
    );
  });

  it('sin ninguna forma no deja guardar y dice por qué', async () => {
    api.configuracion.mockResolvedValue(config({ formasDisponibles: ['COMPROBANTE', 'WOMPI'] }));
    await montar();
    await tocar($('[data-testid="forma-COMPROBANTE"]'));
    expect($<HTMLButtonElement>('[data-testid="guardar-asegurabilidad-manual"]')!.disabled).toBe(true);
    expect(document.body.textContent).toContain('Escoge cómo te pagan.');
  });
});
