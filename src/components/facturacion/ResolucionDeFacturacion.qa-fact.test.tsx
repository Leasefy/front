/**
 * «Resolución» con el QA de Facturación (QA-FACT, 03-10-2026):
 *
 *  · Q12 (Nico, la recomendada): anular una resolución, SÓLO el administrador
 *    (el back responde 403 SOLO_EL_ADMINISTRADOR al contador): al contador no
 *    se le ofrece el botón;
 *  · Nico (19:4x): la resolución de PRUEBA se marca con una casilla al cargarla.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { resolucionesMock, crearMock, permisos } = vi.hoisted(() => ({
  resolucionesMock: vi.fn(),
  crearMock: vi.fn(),
  permisos: { valor: { isAdmin: false, agencyRole: 'CONTADOR' as string | null } },
}));

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/facturacion-por-mes.service')>(
    '@/lib/api/facturacion-por-mes.service',
  );
  return {
    ...real,
    facturacionPorMesService: {
      resoluciones: (...a: unknown[]) => resolucionesMock(...a),
      crearResolucion: (...a: unknown[]) => crearMock(...a),
      anularResolucion: vi.fn(),
      sugerenciaDeLaResolucion: () => Promise.reject(new Error('404')),
    },
  };
});

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('./CampoDeFecha', async () => {
  const R = await import('react');
  return {
    CampoDeFecha: ({ value, onChange, testid, id }: { value: string; onChange: (v: string) => void; testid?: string; id: string }) =>
      R.createElement('input', {
        id,
        'data-testid': testid,
        value,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      }),
  };
});

import { ResolucionDeFacturacion } from './ResolucionDeFacturacion';

function respuesta(): ResolucionesDeLaAgencia {
  return {
    resoluciones: [
      {
        id: 'res-1',
        numero: '18764000000001',
        fechaResolucion: '2026-09-01T00:00:00.000Z',
        prefijo: 'LABQA',
        tipoDeDocumento: null,
        tipoNombre: 'Cualquier tipo de documento',
        desde: 1,
        hasta: 5000,
        vigenteDesde: '2026-09-01T00:00:00.000Z',
        vigenteHasta: '2027-09-01T00:00:00.000Z',
        ultimoNumeroUsado: 7,
        anulada: false,
        esDePrueba: true,
        usados: 7,
        disponibles: 4993,
        puedeNumerar: true,
        motivo: null,
        explicacion: null,
        siguiente: 'LABQA-8',
      },
    ],
    vigente: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '18764000000001',
      prefijo: 'LABQA',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2027-09-01T00:00:00.000Z',
      disponibles: 4993,
      siguiente: 'LABQA-8',
    },
    porTipoDisponible: false,
    porTipo: [],
    umbrales: { numeros: 100, dias: 30 },
    avisos: [],
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<ResolucionDeFacturacion />);
  });
}

const q = (s: string) => document.querySelector(s);

function escribir(testid: string, valor: string) {
  const input = document.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  resolucionesMock.mockReset().mockResolvedValue(respuesta());
  crearMock.mockReset().mockResolvedValue({});
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('ResolucionDeFacturacion · QA-FACT', () => {
  it('🔴 Q12: al contador no se le ofrece anular la resolución', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR' };
    await montar();
    expect(q('[data-testid="resolucion-res-1"]')).not.toBeNull();
    expect(q('[data-testid="acciones-res-1"]')).toBeNull();
  });

  it('al administrador sí', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    expect(q('[data-testid="acciones-res-1"]')).not.toBeNull();
  });

  it('la resolución de prueba se marca en la lista', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    expect(q('[data-testid="resolucion-res-1"]')!.textContent).toContain('De prueba');
  });

  it('🔴 la casilla «Es una resolución de prueba» viaja como `esDePrueba` sólo marcada', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'ADMIN' };
    await montar();
    await act(async () => {
      (q('[data-testid="resolucion-abrir-carga"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      escribir('resolucion-campo-numero', 'PRUEBA-LAB-0002');
      escribir('resolucion-campo-fecha', '2026-10-01');
      escribir('resolucion-campo-prefijo', 'LABP');
      escribir('resolucion-campo-desde', '1');
      escribir('resolucion-campo-hasta', '40');
      escribir('resolucion-campo-vigente-desde', '2026-10-01');
      escribir('resolucion-campo-vigente-hasta', '2026-12-31');
    });
    await act(async () => {
      (q('[data-testid="resolucion-campo-de-prueba"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(crearMock).toHaveBeenCalledTimes(1);
    expect(crearMock.mock.calls[0][0]).toMatchObject({ prefijo: 'LABP', esDePrueba: true });
  });
});
