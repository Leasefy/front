/**
 * 🔴 QA-FACT-CONTA-95 r2 · CB-B-25: «cerrar con documentos sin asiento: el diálogo
 * dice cuántos y cuánto antes». El aviso vivía sólo en la tarjeta, contado para el
 * último día cerrable y sin la plata; el diálogo de cierre no decía nada.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Cierre } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, permisoMock } = vi.hoisted(() => ({
  api: { asientos: { cerrar: vi.fn(), reabrir: vi.fn(), reaperturas: vi.fn(), cierre: vi.fn() } },
  permisoMock: { puede: true, motivo: null as string | null, usuarioId: 'u-1' },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: api };
});
vi.mock('../use-puede-escribir', async () => {
  const actual = await vi.importActual<typeof import('../use-puede-escribir')>(
    '../use-puede-escribir',
  );
  return { ...actual, usePuedeReabrir: () => permisoMock };
});
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
// CB-04 (03-10-2026): «Hasta el día» es el selector de fecha del DS
// (`CampoDeDia`, un botón con calendario), que no se escribe. Este doble lo
// vuelve un campo de texto con el MISMO `data-testid`, valor, `disabled`,
// `aria-invalid` y `aria-describedby`: lo que estas pruebas miran del cierre no
// cambió. El campo de verdad se prueba en `CampoDeDia.test.tsx`.
vi.mock('../CampoDeDia', () => ({
  CampoDeDia: ({
    id,
    value,
    onChange,
    disabled,
    invalido,
    describedBy,
    testid,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    invalido?: boolean;
    describedBy?: string;
    testid?: string;
  }) => (
    <input
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={invalido || undefined}
      aria-describedby={describedBy}
      data-testid={testid}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

import { CierreDePeriodo } from './CierreDePeriodo';


let host: HTMLDivElement;
let root: Root;
const q = (t: string) => document.querySelector<HTMLElement>(`[data-testid="${t}"]`);

beforeEach(() => {
  api.asientos.reaperturas.mockReset().mockResolvedValue({ disponible: true, motivo: null, reaperturas: [] });
  api.asientos.cierre.mockReset().mockImplementation(async (hasta?: string) => ({
    cerradaHasta: null,
    sePuedeCerrarHasta: '2026-09-30',
    sinAsentar: hasta === '2026-09-30' ? { recibos: 1, lotes: 0, cobros: 1, total: 2, valorCop: 1_120_000 } : { recibos: 0, lotes: 0, cobros: 0, total: 0, valorCop: 0 },
  }));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

async function esperar() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

describe('🔴 QA-FACT-CONTA-95 r2 · CB-B-25: cerrar con documentos sin asiento', () => {
  it('el diálogo dice, antes de confirmar, cuántos quedan sin asiento hasta esa fecha y cuánta plata es', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<CierreDePeriodo cierre={{ cerradaHasta: null, sePuedeCerrarHasta: '2026-09-30' } as Cierre} />);
    });
    await esperar();
    const fecha = q('cierre-hasta') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(fecha, '2026-09-30');
      fecha.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      q('abrir-cierre')!.click();
    });
    await esperar();
    expect(api.asientos.cierre).toHaveBeenCalledWith('2026-09-30');
    const aviso = q('sin-asentar-en-el-dialogo')
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toMatch(/Hay 2 movimientos sin asiento hasta el .*30.*sep.*2026 \(1 recibo, 1 cobro\) por \$\s?1\.120\.000: asiéntalos/);
  });

  it('sin nada por asentar, el diálogo no avisa', async () => {
    api.asientos.cierre.mockResolvedValue({ cerradaHasta: null, sePuedeCerrarHasta: '2026-09-30', sinAsentar: { recibos: 0, lotes: 0, cobros: 0, total: 0, valorCop: 0 } });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<CierreDePeriodo cierre={{ cerradaHasta: null, sePuedeCerrarHasta: '2026-09-30' } as Cierre} />);
    });
    await esperar();
    await act(async () => {
      q('abrir-cierre')!.click();
    });
    await esperar();
    expect(q('sin-asentar-en-el-dialogo')).toBeNull();
  });
});
