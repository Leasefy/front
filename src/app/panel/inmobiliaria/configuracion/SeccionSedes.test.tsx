/**
 * Sedes: lo que esta pantalla dice y nadie más dice es cuántos inmuebles y
 * contratos quedaron SIN asignar — mientras haya, el consolidado y la suma de
 * las sedes no cuadran, y esa diferencia no es del negocio.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { Sede, Sedes } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ sedes: vi.fn(), crear: vi.fn(), editar: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { sedes: h.sedes, crearSede: h.crear, editarSede: h.editar },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { SeccionSedes } from './SeccionSedes';

function sede(extra: Partial<Sede> = {}): Sede {
  return {
    id: 's-1',
    nombre: 'Poblado',
    codigo: 'POB',
    ciudad: 'Medellín',
    direccion: 'Cra 43A #1-50',
    esPorDefecto: true,
    activa: true,
    inmuebles: 1_200,
    contratos: 900,
    ...extra,
  };
}

function datos(extra: Partial<Sedes> = {}): Sedes {
  return {
    disponible: true,
    motivo: null,
    sedes: [sede(), sede({ id: 's-2', nombre: 'Laureles', codigo: 'LAU', esPorDefecto: false, inmuebles: 800, contratos: 640 })],
    sinAsignar: { inmuebles: 824, contratos: 296 },
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.sedes.mockReset().mockResolvedValue(datos());
  h.crear.mockReset().mockResolvedValue(sede({ id: 's-3', nombre: 'Envigado', codigo: 'ENV' }));
  h.editar.mockReset().mockResolvedValue(sede());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<SeccionSedes />);
  });
}

function boton(texto: string): HTMLButtonElement {
  const b = [...document.body.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b as HTMLButtonElement;
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('sedes', () => {
  it('lista cada sede con sus inmuebles y contratos, y marca la de por defecto', async () => {
    await pintar();
    const fila = document.body.querySelector('[data-testid="sede-POB"]')!;
    expect(fila.textContent).toContain('Poblado');
    expect(fila.textContent).toContain('Por defecto');
    expect(fila.textContent).toContain('1.200');
    expect(fila.textContent).toContain('900');
  });

  it('🔴 dice cuántos quedaron sin asignar y por qué importa', async () => {
    await pintar();
    const aviso = document.body.querySelector('[data-testid="sin-asignar"]')!;
    expect(aviso.textContent).toContain('824');
    expect(aviso.textContent).toContain('296');
    expect(aviso.textContent).toContain('no es del negocio');
  });

  it('sin nada suelto no inventa una alarma', async () => {
    h.sedes.mockResolvedValue(datos({ sinAsignar: { inmuebles: 0, contratos: 0 } }));
    await pintar();
    expect(document.body.querySelector('[data-testid="sin-asignar"]')).toBeNull();
  });

  it('crear una sede manda nombre y código y no exige más', async () => {
    await pintar();
    await act(async () => boton('Crear una sede').click());
    escribir(document.body.querySelector<HTMLInputElement>('#sede-nombre')!, 'Envigado');
    escribir(document.body.querySelector<HTMLInputElement>('#sede-codigo')!, 'ENV');
    await act(async () => {
      boton('Guardar').click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.crear).toHaveBeenCalledWith({
      nombre: 'Envigado',
      codigo: 'ENV',
      ciudad: undefined,
      direccion: undefined,
      esPorDefecto: false,
    });
  });

  it('la de por defecto no ofrece «hacerla por defecto»; la otra sí', async () => {
    await pintar();
    const poblado = document.body.querySelector('[data-testid="sede-POB"]')!;
    const laureles = document.body.querySelector('[data-testid="sede-LAU"]')!;
    expect(poblado.textContent).not.toContain('Hacerla por defecto');
    expect(laureles.textContent).toContain('Hacerla por defecto');

    await act(async () => {
      boton('Hacerla por defecto').click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.editar).toHaveBeenCalledWith('s-2', { esPorDefecto: true });
  });

  it('sin la migración lo explica y no deja crear', async () => {
    h.sedes.mockResolvedValue(
      datos({
        disponible: false,
        motivo: 'Falta la migración 20260917222000_sedes_como_centro_de_costo.',
        sedes: [],
        sinAsignar: { inmuebles: 0, contratos: 0 },
      }),
    );
    await pintar();
    // 🔴 El identificador de la migración es para quien despliega, no para la
    // inmobiliaria (Nico, 18-09-2026). Lo que queda es el aviso.
    const cartel =
      document.body.querySelector('[data-testid="sin-la-migracion"]')?.textContent ?? '';
    expect(cartel).not.toContain('sedes_como_centro_de_costo');
    expect(cartel).toContain('todavía no está disponible');
    expect(boton('Crear una sede').disabled).toBe(true);
    expect(document.body.textContent).toContain('Todavía no hay sedes');
  });
});
