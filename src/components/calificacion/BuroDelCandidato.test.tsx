/**
 * El buró completo del postulante en el cajón (Nico, 31-10-2026: «todo lo del buró completo»): la letra, si el canon
 * de ESTE inmueble le cabe, su historial en Leasefy (meses, cuotas a tiempo, contratos, cómo terminaron, peor atraso),
 * su estudio de documentos y el desglose. Sin calificación, lo dice con su ilustración.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

const deLaPostulacion = vi.fn();
vi.mock('@/lib/api/calificacion-leasefy.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/calificacion-leasefy.service')>('@/lib/api/calificacion-leasefy.service');
  return { ...real, calificacionLeasefyApi: { ...real.calificacionLeasefyApi, deLaPostulacion: (id: string) => deLaPostulacion(id) } };
});

import { BuroDelCandidato } from './BuroDelCandidato';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

async function montar(canon?: number) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(<BuroDelCandidato applicationId="app-1" canonDelInmueble={canon} />);
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
    puntaje: 82,
    letra: 'A' as const,
    pesoDelHistorial: 0.55,
    mesesObservados: 18,
    historial: null,
    documentos: null,
    frenos: [],
    revisiones: [],
    veredicto: 'FACIL' as const,
    condiciones: [],
    canonMaximoCop: 2_600_000,
    explicacion: [],
  },
  historial: {
    mesesObservados: 18,
    cuotasContadas: 18,
    porcentajeATiempo: 94.4,
    peorAtrasoDias24m: 6,
    contratos: 2,
    inmobiliarias: 2,
    contratosTerminados: 1,
    terminaronSinDeuda: 1,
  },
  documentos: { tieneEstudioVigente: true, estudioDel: '2026-10-20' },
  calculadaEl: '2026-10-31T00:00:00.000Z',
  alcance: 'TODO_LEASEFY' as const,
};

const texto = () => document.body.textContent ?? '';
const porId = (id: string) => document.querySelector(`[data-testid="${id}"]`);

describe('El buró completo del postulante (cajón del candidato)', () => {
  it('la letra, el puntaje y que el canon de este inmueble le cabe en su tope', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: true, resultado: RESULTADO });
    await montar(2_400_000);
    expect(deLaPostulacion).toHaveBeenCalledWith('app-1');
    expect(texto()).toContain('82');
    expect(porId('buro-canon')?.textContent).toContain('le cabe');
  });

  it('si el canon pasa su tope, lo dice', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: true, resultado: RESULTADO });
    await montar(3_000_000);
    expect(porId('buro-canon')?.textContent).toContain('pasa su tope');
  });

  it('su historial en Leasefy: meses, cuotas a tiempo, contratos, cómo terminaron y el peor atraso', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: true, resultado: RESULTADO });
    await montar();
    const franja = porId('buro-historial')?.textContent ?? '';
    expect(franja).toContain('18 meses');
    expect(franja).toContain('94 %');
    expect(franja).toContain('con 2 inmobiliarias');
    expect(franja).toContain('1 / 1');
    expect(porId('buro-peor-atraso')?.textContent).toContain('6 días');
    expect(porId('buro-documentos')?.textContent).toContain('20 de octubre de 2026');
  });

  it('sin historial lo dice, sin cifras en cero', async () => {
    deLaPostulacion.mockResolvedValue({
      disponible: true,
      resultado: { ...RESULTADO, historial: { ...RESULTADO.historial, mesesObservados: 0, porcentajeATiempo: null, contratos: 0 } },
    });
    await montar();
    expect(porId('buro-historial')).toBeNull();
    expect(porId('buro-sin-historial')).not.toBeNull();
  });

  it('sin calificación (no autorizó o sin datos), lo dice con su ilustración', async () => {
    deLaPostulacion.mockResolvedValue({ disponible: false, resultado: null });
    await montar();
    expect(porId('buro-sin-dato')?.textContent).toContain('Sin calificación de Leasefy');
  });
});
