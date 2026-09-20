/**
 * 🔴 17-09 (Nico): «la comisión de los asesores se paga por fuera de Leasefy».
 *
 * Lo que queda es el HECHO: quién trajo el mandato y quién cerró el arriendo.
 * Dos cosas que esta pantalla no puede hacer:
 *
 *   · mostrar un peso atribuido a una persona;
 *   · esconder lo que no tiene asesor —si todo está sin asignar, un equipo en
 *     ceros se leería como un equipo que no trabajó—.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ captacionesYArriendos: vi.fn() }));

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agentesApi: { captacionesYArriendos: h.captacionesYArriendos },
}));

import { CaptacionesYArriendos } from './CaptacionesYArriendos';

const DATOS = {
  desde: '2026-01-01',
  hasta: '2026-12-31',
  asesores: [
    { userId: 'u1', nombre: 'Ana', activo: true, captados: 3, arrendados: 2 },
    { userId: 'u2', nombre: 'Beto', activo: false, captados: 0, arrendados: 1 },
  ],
  sinAsesor: { captados: 12, arrendados: 4 },
  captaciones: [
    {
      consignacionId: 'c1',
      inmueble: 'Apto 101',
      propietario: 'Clara',
      fecha: '2026-03-04',
      agenteUserId: 'u1',
      agenteNombre: 'Ana',
    },
  ],
  arriendos: [
    {
      pipelineItemId: 'p1',
      consignacionId: 'c1',
      inmueble: 'Apto 101',
      inquilino: 'Diego',
      fecha: '2026-04-10',
      agenteUserId: 'u2',
      agenteNombre: 'Beto',
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.captacionesYArriendos.mockReset().mockResolvedValue(structuredClone(DATOS));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar(nodo: React.ReactNode) {
  await act(async () => {
    root.render(nodo);
  });
}

describe('CaptacionesYArriendos', () => {
  it('cuenta por asesor y no muestra un solo peso', async () => {
    await pintar(<CaptacionesYArriendos />);
    const texto = container.textContent ?? '';
    expect(container.querySelector('[data-testid="asesor-u1"]')?.textContent).toContain('Ana');
    expect(texto).toContain('Beto');
    expect(texto).toContain('ya no está en el equipo');
    expect(texto).not.toMatch(/\$\s?\d/);
  });

  it('lo que no tiene asesor se dice, no se esconde', async () => {
    await pintar(<CaptacionesYArriendos />);
    const fila = container.querySelector('[data-testid="sin-asesor"]');
    expect(fila?.textContent).toContain('Sin asesor asignado');
    expect(fila?.textContent).toContain('12');
  });

  it('la ficha de un asesor sólo muestra lo suyo', async () => {
    await pintar(<CaptacionesYArriendos userId="u1" />);
    expect(container.querySelector('[data-testid="asesor-u1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="asesor-u2"]')).toBeNull();
    // El arriendo es de Beto: no se le cuelga a Ana.
    expect(container.textContent).toContain('Arriendos cerrados (0)');
    expect(container.textContent).toContain('Captaciones (1)');
  });

  it('pide el rango al back tal cual', async () => {
    await pintar(<CaptacionesYArriendos />);
    const anio = new Date().getFullYear();
    expect(h.captacionesYArriendos).toHaveBeenCalledWith({
      desde: `${anio}-01-01`,
      hasta: `${anio}-12-31`,
    });
  });
});

/**
 * La guarda: ningún componente del equipo puede volver a pintar plata por
 * asesor. Es una regla de negocio, no de estilo — por eso se mide sobre el
 * código, no sobre un render.
 */
describe('ningún peso por asesor', () => {
  const RAIZ = join(__dirname, '..', '..');
  const PANTALLAS = [
    'components/inmobiliaria/AgenteMetrics.tsx',
    'components/inmobiliaria/AgenteCard.tsx',
    'components/inmobiliaria/AgenteTable.tsx',
    'components/inmobiliaria/AgenteLeaderboard.tsx',
    'components/inmobiliaria/AgenteFilters.tsx',
    'components/inmobiliaria/CaptacionesYArriendos.tsx',
  ];

  it.each(PANTALLAS)('%s no lee comisiones del asesor', (ruta) => {
    const codigo = readFileSync(join(RAIZ, ruta), 'utf8');
    // Las menciones en comentarios explican por qué no está; lo que no puede
    // haber es una lectura del dato.
    expect(codigo).not.toMatch(/metrics\.(commissionsThisMonth|totalCommissions)/);
    expect(codigo).not.toMatch(/formatCurrency\(\s*agente?\.metrics/);
  });
});
