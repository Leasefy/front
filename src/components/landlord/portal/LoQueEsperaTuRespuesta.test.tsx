/**
 * «Lo que espera tu respuesta» del Inicio del propietario (GLOW UP, 21-10-2026).
 *
 * 🔴 SO-10 (QA 04-10) sigue valiendo: el Inicio dice que tiene una reparación
 * por aprobar, con su valor y el enlace a «Aprobar reparaciones». Ahora la misma
 * tarjeta junta lo demás que espera su decisión (giro devuelto, sobrecostos,
 * escoger inquilino, revisar el canon), y una fuente caída no apaga las otras.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apis = vi.hoisted(() => ({
  reparaciones: { delPortal: vi.fn() },
  elecciones: { delPortal: vi.fn() },
  canon: { delPortal: vi.fn() },
  portal: { cuentaDeGiro: vi.fn(), sobrecostos: vi.fn() },
}));
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({ aprobacionesDeReparacionApi: apis.reparaciones }));
vi.mock('@/lib/api/elecciones-de-inquilino.service', () => ({ eleccionesDeInquilinoApi: apis.elecciones }));
vi.mock('@/lib/api/revisiones-del-canon.service', () => ({ revisionesDelCanonApi: apis.canon }));
vi.mock('@/lib/api/portal-del-propietario.service', () => ({ portalDelPropietarioApi: apis.portal }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));

import { LoQueEsperaTuRespuesta, usePendientesDelPropietario } from './LoQueEsperaTuRespuesta';

function Inicio() {
  const pendientes = usePendientesDelPropietario();
  return <LoQueEsperaTuRespuesta pendientes={pendientes} />;
}

let container: HTMLDivElement;
let root: Root;
const vacio = { pendientes: [], historial: [] };

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  apis.reparaciones.delPortal.mockReset().mockResolvedValue(vacio);
  apis.elecciones.delPortal.mockReset().mockResolvedValue(vacio);
  apis.canon.delPortal.mockReset().mockResolvedValue(vacio);
  apis.portal.cuentaDeGiro.mockReset().mockResolvedValue({ fichas: [] });
  apis.portal.sobrecostos.mockReset().mockResolvedValue({ disponible: true, pendientes: [], historial: [] });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function montar() {
  await act(async () => {
    root.render(<Inicio />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

const fila = (testid: string) => document.body.querySelector(`[data-testid="${testid}"]`);

describe('🔴 SO-10 — el Inicio avisa la reparación por aprobar', () => {
  it('con una pendiente: el aviso con el valor y el enlace a «Aprobar reparaciones»', async () => {
    apis.reparaciones.delPortal.mockResolvedValue({
      pendientes: [{ id: 'a-1', valorCop: 180_000, estado: 'PENDIENTE', reparacion: { titulo: 'Fuga en el lavamanos', descripcion: '' } }],
      historial: [],
    });
    await montar();
    const aviso = fila('reparaciones-por-aprobar')!;
    expect(aviso.getAttribute('href')).toBe('/panel/aprobaciones');
    expect(aviso.textContent).toContain('Tienes una reparación por aprobar');
    expect(aviso.textContent).toMatch(/180\.000/);
    expect(aviso.textContent).toContain('Fuga en el lavamanos');
  });

  it('sin pendientes (o sin respuesta) no dibuja nada', async () => {
    await montar();
    expect(fila('lo-que-espera-tu-respuesta')).toBeNull();
    apis.reparaciones.delPortal.mockRejectedValue(new Error('caído'));
    await montar();
    expect(fila('reparaciones-por-aprobar')).toBeNull();
  });
});

describe('Lo que espera tu respuesta — todo lo pendiente en una tarjeta', () => {
  it('junta el giro devuelto, la elección del inquilino y el canon, cada uno con su enlace y la cuenta arriba', async () => {
    apis.portal.cuentaDeGiro.mockResolvedValue({
      fichas: [
        {
          propietarioId: 'p-1',
          inmobiliaria: 'Inmobiliaria Lab',
          cuenta: null,
          giroDevuelto: { valorCop: 2_466_800, fecha: '2026-10-05', motivo: 'Cuenta cancelada', cuenta: null },
          cambioEnCurso: null,
        },
      ],
    });
    apis.elecciones.delPortal.mockResolvedValue({
      pendientes: [{ id: 'e-1', inmueble: 'Apto 402, Laureles', candidatos: [{}, {}, {}] }],
      historial: [],
    });
    apis.canon.delPortal.mockResolvedValue({
      pendientes: [{ id: 'r-1', inmueble: 'Casa 12', diasVacante: 45, canonActualCop: 1_500_000, costoDeLaVacanciaCop: 2_250_000 }],
      historial: [],
    });
    await montar();

    const tarjeta = fila('lo-que-espera-tu-respuesta')!;
    expect(tarjeta.textContent).toContain('Lo que espera tu respuesta');
    expect(tarjeta.textContent).toContain('3');

    const giro = fila('pendiente-giro-devuelto')!;
    expect(giro.getAttribute('href')).toBe('/panel/giros');
    expect(giro.textContent).toMatch(/devolvió tu giro de \$\s?2\.466\.800/);
    expect(giro.textContent).toContain('Cambiar mi cuenta');

    const eleccion = fila('pendiente-escoger-inquilino')!;
    expect(eleccion.getAttribute('href')).toBe('/panel/escoger-inquilino');
    expect(eleccion.textContent).toContain('Escoge el inquilino de Apto 402, Laureles');
    expect(eleccion.textContent).toContain('3 candidatos');

    const canon = fila('pendiente-revisar-canon')!;
    expect(canon.getAttribute('href')).toBe('/panel/revisar-canon');
    expect(canon.textContent).toContain('45 días');
    expect(canon.textContent).toMatch(/2\.250\.000/);

    // El giro devuelto va primero: es plata suya detenida.
    const orden = [...tarjeta.querySelectorAll('a')].map((a) => a.getAttribute('data-testid'));
    expect(orden[0]).toBe('pendiente-giro-devuelto');
  });

  it('una fuente caída no apaga las demás', async () => {
    apis.portal.cuentaDeGiro.mockRejectedValue(new Error('caído'));
    apis.elecciones.delPortal.mockRejectedValue(new Error('caído'));
    apis.portal.sobrecostos.mockResolvedValue({
      disponible: true,
      pendientes: [{ id: 's-1', diferenciaCop: 90_000 }],
      historial: [],
    });
    await montar();
    expect(fila('pendiente-sobrecostos')?.textContent).toMatch(/costó más de lo aprobado/);
    expect(fila('pendiente-escoger-inquilino')).toBeNull();
    expect(fila('pendiente-giro-devuelto')).toBeNull();
  });

  it('los sobrecostos sin la migración del back (disponible: false) no se pintan', async () => {
    apis.portal.sobrecostos.mockResolvedValue({ disponible: false, pendientes: [{ id: 's-1', diferenciaCop: 90_000 }], historial: [] });
    await montar();
    expect(fila('pendiente-sobrecostos')).toBeNull();
  });
});
