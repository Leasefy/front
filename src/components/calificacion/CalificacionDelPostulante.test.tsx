/**
 * La Calificación de quien se postuló, en el cajón del candidato sin estudio
 * (19-10-2026). Lo que sostiene: dice de dónde sale (todo Leasefy o sólo esta
 * inmobiliaria) y, si no se puede leer, no pinta nada.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// La tarjeta escribe la plata con el idioma del panel: se usa el proveedor de prueba del repo.
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

const deLaPostulacion = vi.fn();
vi.mock('@/lib/api/calificacion-leasefy.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/calificacion-leasefy.service')>(
    '@/lib/api/calificacion-leasefy.service',
  );
  return {
    ...real,
    calificacionLeasefyApi: { ...real.calificacionLeasefyApi, deLaPostulacion: (id: string) => deLaPostulacion(id) },
  };
});

import { CalificacionDelPostulante } from './CalificacionDelPostulante';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<CalificacionDelPostulante applicationId="app-1" />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => deLaPostulacion.mockReset());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

const RESULTADO = {
  persona: { userId: 'u1', nombre: 'Iván Pérez' },
  calificacion: {
    version: 'leasefy-v1',
    estado: 'CALIFICADO' as const,
    puntaje: 61,
    letra: 'B' as const,
    pesoDelHistorial: 0,
    mesesObservados: 0,
    historial: null,
    documentos: null,
    frenos: [],
    revisiones: [],
    veredicto: 'CON_CONDICIONES' as const,
    condiciones: [],
    canonMaximoCop: null,
    explicacion: ['Sin historial en Leasefy todavía: la calificación sale de sus documentos.'],
  },
  historial: {
    mesesObservados: 0,
    cuotasContadas: 0,
    porcentajeATiempo: null,
    peorAtrasoDias24m: null,
    contratos: 0,
    inmobiliarias: 0,
    contratosTerminados: 0,
    terminaronSinDeuda: 0,
  },
  documentos: { tieneEstudioVigente: false, estudioDel: null },
  calculadaEl: '2026-10-19T00:00:00.000Z',
};

const texto = () => document.body.textContent ?? '';

describe('La Calificación de quien se postuló (cajón del candidato)', () => {
  it('pide la de ESTA postulación y dice que es con todo Leasefy si autorizó', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: true, resultado: { ...RESULTADO, alcance: 'TODO_LEASEFY' } });
    await montar();
    expect(deLaPostulacion).toHaveBeenCalledWith('app-1');
    expect(document.querySelector('[data-testid="calificacion-del-postulante"]')).not.toBeNull();
    expect(texto()).toContain('Con todo su historial en Leasefy.');
  });

  it('sin autorización dice que es sólo lo de esta inmobiliaria', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: true, resultado: { ...RESULTADO, alcance: 'SOLO_ESTA_INMOBILIARIA' } });
    await montar();
    expect(texto()).toContain('Sólo lo que pasó con tu inmobiliaria: no autorizó compartir su calificación.');
  });

  it('sin las tablas del buró, o sin resultado, no pinta nada', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: false, resultado: null });
    await montar();
    expect(document.querySelector('[data-testid="calificacion-del-postulante"]')).toBeNull();
    expect(texto()).toBe('');
  });
});
