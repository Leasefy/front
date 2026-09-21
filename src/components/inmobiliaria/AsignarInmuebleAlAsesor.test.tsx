/**
 * Darle un inmueble a un asesor desde su ficha (21-09-2026).
 *
 * Lo que fija:
 * - lo que se manda es el `userId`, no el id de miembro: mandar el otro no
 *   falla ni avisa, asigna a nadie;
 * - no se ofrece lo que el asesor ya lleva;
 * - si el inmueble lo lleva otro, se dice ANTES del clic: asignar es quitárselo
 *   a alguien;
 * - un asesor sin usuario enlazado no llega al back;
 * - con un portafolio grande (la agencia migrada tiene 2.824 inmuebles) se dice
 *   cuántos quedaron sin pintar, en vez de cortar en silencio.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children, ...props }: { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/* El doble respeta los tres finales que importan: cargando, vacío y con datos. */
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({
    cargando,
    vacio,
    esqueleto,
    cuandoVacio,
    children,
  }: {
    cargando: boolean;
    vacio?: boolean;
    esqueleto?: React.ReactNode;
    cuandoVacio?: React.ReactNode;
    children: React.ReactNode;
  }) => <>{cargando ? esqueleto : vacio ? cuandoVacio : children}</>,
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ toast }));

const api = vi.hoisted(() => ({ assignAgent: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: api }));

const datos = vi.hoisted(() => ({
  consignaciones: [] as unknown[],
  agentes: [] as unknown[],
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({
    consignaciones: datos.consignaciones,
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
  useAgentes: () => ({ agentes: datos.agentes, isLoading: false, errorCrudo: null, refetch: vi.fn() }),
}));

import { AsignarInmuebleAlAsesor } from './AsignarInmuebleAlAsesor';

function consignacion(id: string, titulo: string, agenteId = ''): Consignacion {
  return {
    id,
    propertyTitle: titulo,
    propertyAddress: `Calle ${id}`,
    propertyCity: 'Medellín',
    propertyZone: 'El Poblado',
    agenteId,
  } as unknown as Consignacion;
}

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  api.assignAgent.mockReset();
  api.assignAgent.mockResolvedValue({});
  toast.success.mockReset();
  toast.error.mockReset();
  datos.consignaciones = [
    consignacion('c-1', 'Apto 101 — ya es suyo', 'usuario-1'),
    consignacion('c-2', 'Apto 202 — libre'),
    consignacion('c-3', 'Apto 303 — de otro', 'usuario-9'),
  ];
  datos.agentes = [
    { id: 'm-1', userId: 'usuario-1', name: 'Ana Pérez', status: 'active' },
    { id: 'm-9', userId: 'usuario-9', name: 'Beto Gómez', status: 'active' },
  ];
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

/*
 * Los argumentos van por `...args` y no por valor por defecto: en JS un
 * parámetro con defecto se llena TAMBIÉN cuando le pasan `undefined`, así que
 * `montar(undefined)` habría montado el caso normal y la prueba del asesor sin
 * usuario enlazado habría pasado sin probar nada. Se cayó primero, que es lo
 * único bueno de esa trampa.
 */
async function montar(...args: [string | undefined] | []) {
  const agenteUserId = args.length > 0 ? args[0] : 'usuario-1';
  const onAsignado = vi.fn();
  await act(async () => {
    raiz.render(
      <AsignarInmuebleAlAsesor
        abierto
        onCerrar={() => undefined}
        agenteUserId={agenteUserId}
        agenteNombre="Ana Pérez"
        onAsignado={onAsignado}
      />,
    );
  });
  return onAsignado;
}

function filas() {
  return [...contenedor.querySelectorAll('li button')] as HTMLButtonElement[];
}

async function pulsar(textoIncluido: string) {
  const boton = filas().find((b) => b.textContent?.includes(textoIncluido))!;
  await act(async () => {
    boton.click();
  });
}

describe('<AsignarInmuebleAlAsesor>', () => {
  it('manda el id de USUARIO del asesor, no el de miembro', async () => {
    const onAsignado = await montar();
    await pulsar('Apto 202');
    expect(api.assignAgent).toHaveBeenCalledWith('c-2', 'usuario-1');
    expect(onAsignado).toHaveBeenCalledTimes(1);
  });

  it('no ofrece lo que el asesor ya lleva', async () => {
    await montar();
    const textos = filas().map((b) => b.textContent ?? '');
    expect(textos.some((t) => t.includes('Apto 202'))).toBe(true);
    expect(textos.some((t) => t.includes('Apto 101'))).toBe(false);
  });

  it('dice quién lo lleva hoy, antes del clic', async () => {
    await montar();
    const deOtro = filas().find((b) => b.textContent?.includes('Apto 303'))!;
    expect(deOtro.textContent).toContain('Hoy lo lleva Beto Gómez');
  });

  it('un asesor sin usuario enlazado no llega al back', async () => {
    await montar(undefined);
    await pulsar('Apto 202');
    expect(api.assignAgent).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it('con un portafolio grande dice cuántos quedaron sin pintar', async () => {
    datos.consignaciones = Array.from({ length: 45 }, (_, i) =>
      consignacion(`c-${i}`, `Apto ${i}`),
    );
    await montar();
    expect(filas()).toHaveLength(30);
    const aviso = contenedor.querySelector('[data-testid="asignar-inmueble-hay-mas"]');
    expect(aviso?.textContent).toContain('15');
  });

  it('el buscador filtra por dirección, no sólo por título', async () => {
    await montar();
    const buscador = contenedor.querySelector<HTMLInputElement>('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        buscador,
        'Calle c-3',
      );
      buscador.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const textos = filas().map((b) => b.textContent ?? '');
    expect(textos).toHaveLength(1);
    expect(textos[0]).toContain('Apto 303');
  });

  it('si el back falla, no dice que asignó', async () => {
    api.assignAgent.mockRejectedValue(new Error('403'));
    const onAsignado = await montar();
    await pulsar('Apto 202');
    expect(onAsignado).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
