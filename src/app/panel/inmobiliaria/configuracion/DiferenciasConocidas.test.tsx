/**
 * La tarjeta de las diferencias conocidas (02-10-2026, S2-D), con el API
 * mockeado: carga, valida con las frases del back, manda lo exacto, reparte
 * los errores del back por fila y se apaga sin la migración.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type { DiferenciasConocidasDeLaInmobiliaria } from '@/lib/api/conciliacion-bancaria.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  leer: vi.fn(),
  guardar: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  reducido: { valor: false },
}));

vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({
  conciliacionBancariaApi: { diferenciasConocidas: h.leer, guardarDiferenciasConocidas: h.guardar },
}));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => h.reducido.valor,
}));

import { DiferenciasConocidas } from './DiferenciasConocidas';

function respuesta(x: Partial<DiferenciasConocidasDeLaInmobiliaria> = {}): DiferenciasConocidasDeLaInmobiliaria {
  return {
    sePuedeGuardar: true,
    diferencias: [{ nombre: 'Retención arrendamientos', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'empresas' }],
    gmf: { porMil: 4, politica: 'proponer' },
    maximo: 10,
    ...x,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<DiferenciasConocidas />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

async function escribir(id: string, valor: string) {
  const input = q(id) as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function clic(id: string) {
  await act(async () => {
    q(id)!.click();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reducido.valor = false;
  h.leer.mockResolvedValue(respuesta());
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('las diferencias conocidas de la conciliación', () => {
  it('carga lo guardado y dice que el 4×1000 no se configura', async () => {
    await montar();
    expect((q('diferencia-0-nombre') as HTMLInputElement).value).toBe('Retención arrendamientos');
    expect((q('diferencia-0-valor') as HTMLInputElement).value).toBe('3,5');
    expect(q('diferencias-gmf')!.textContent).toContain('4 por mil');
    expect(q('diferencias-conocidas')!.textContent).toContain('Nunca la concilia sola');
  });

  it('valida con las frases del back y no manda nada si algo está mal', async () => {
    await montar();
    await clic('diferencias-agregar');
    await clic('diferencias-guardar');
    expect(h.guardar).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Ponle un nombre a la diferencia.');
    expect(host.textContent).toContain('Escribe el porcentaje de la retención.');
  });

  it('manda lo exacto: «3,5» viaja como 3.5', async () => {
    h.guardar.mockImplementation(async (ds: unknown) => respuesta({ diferencias: ds as never }));
    await montar();
    await clic('diferencias-agregar');
    await escribir('diferencia-1-nombre', 'Retención aseguradoras');
    await escribir('diferencia-1-valor', '2,5');
    await clic('diferencias-guardar');
    expect(h.guardar).toHaveBeenCalledWith([
      { nombre: 'Retención arrendamientos', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'empresas' },
      { nombre: 'Retención aseguradoras', tipo: 'RETENCION', porcentaje: 2.5, aQuien: 'empresas' },
    ]);
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('reconoce 2 diferencias'));
  });

  it('un error del back va a SU fila y SU campo', async () => {
    h.guardar.mockRejectedValue(
      new ApiError(400, ['x'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos: [{ campo: 'diferencias.0.porcentaje', regla: 'max', mensaje: 'El porcentaje va hasta 100.' }],
      }),
    );
    await montar();
    await clic('diferencias-guardar');
    expect(q('diferencia-0')!.textContent).toContain('El porcentaje va hasta 100.');
    expect(q('diferencias-aviso')).toBeNull();
  });

  it('quitar una fila y guardar vacío: «no reconoce ninguna»', async () => {
    h.guardar.mockResolvedValue(respuesta({ diferencias: [] }));
    await montar();
    await clic('diferencia-0-quitar');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    await clic('diferencias-guardar');
    expect(h.guardar).toHaveBeenCalledWith([]);
    expect(h.toast.success).toHaveBeenCalledWith(expect.stringContaining('no reconoce ninguna'));
  });

  it('🔴 sin la migración: se ve, pero no se edita ni se guarda', async () => {
    h.leer.mockResolvedValue(respuesta({ sePuedeGuardar: false, diferencias: [] }));
    await montar();
    expect(q('diferencias-sin-la-migracion')).not.toBeNull();
    expect((q('diferencias-guardar') as HTMLButtonElement).disabled).toBe(true);
    expect((q('diferencias-agregar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('el PUT responde 503 FALTA_UNA_MIGRACION: aparece el aviso y se apaga', async () => {
    h.guardar.mockRejectedValue(new ApiError(503, 'Falta 20261002204000_…', 'FALTA_UNA_MIGRACION'));
    await montar();
    await clic('diferencias-guardar');
    expect(q('diferencias-sin-la-migracion')).not.toBeNull();
    expect(host.textContent).not.toContain('20261002204000');
    expect((q('diferencias-guardar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('con 10 no deja agregar otra', async () => {
    h.leer.mockResolvedValue(
      respuesta({
        diferencias: Array.from({ length: 10 }, (_, i) => ({ nombre: `C${i}`, tipo: 'COMISION' as const, valorCop: 100 + i, aQuien: 'todos' as const })),
      }),
    );
    await montar();
    expect((q('diferencias-agregar') as HTMLButtonElement).disabled).toBe(true);
    expect(q('diferencias-agregar')!.textContent).toContain('Máximo 10');
  });

  it('con movimiento reducido todo se pinta igual', async () => {
    h.reducido.valor = true;
    await montar();
    await clic('diferencias-agregar');
    expect(q('diferencia-1')).not.toBeNull();
  });
});
