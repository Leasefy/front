/**
 * AvisoIpcQueFalta — el aviso de /contratos/renovaciones (N3, P0).
 *
 * Sin el IPC de 2026, toda renovación que rige en 2027 salía con el mismo
 * canon y nadie lo veía. Lo que se protege acá: el aviso dice CUÁNTOS
 * contratos (lo que contó el back), QUÉ IPC falta y A DÓNDE ir a cargarlo;
 * no inventa ninguna cifra del IPC; y no afirma nada cuando no sabe.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { ipcQueFaltaMock } = vi.hoisted(() => ({ ipcQueFaltaMock: vi.fn() }));
vi.mock('@/lib/api/renovacion-automatica.service', () => ({
  renovacionAutomaticaApi: { ipcQueFalta: ipcQueFaltaMock },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}));

import { AvisoIpcQueFalta } from './AvisoIpcQueFalta';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  ipcQueFaltaMock.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function montar() {
  await act(async () => {
    root.render(<AvisoIpcQueFalta />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const aviso = () => container.querySelector('[data-testid="aviso-ipc-que-falta"]');

describe('AvisoIpcQueFalta', () => {
  it('🔴 con contratos afectados dice cuántos, qué IPC falta y a dónde ir a cargarlo', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 12 });
    await montar();

    expect(aviso()?.textContent).toContain('12 contratos se renuevan sin incremento: falta el IPC 2026');
    expect(aviso()?.textContent).toContain('Rigen en 2027');
    const enlace = container.querySelector<HTMLAnchorElement>('[data-testid="aviso-ipc-que-falta-enlace"]');
    expect(enlace?.getAttribute('href')).toBe('/panel/inmobiliaria/configuracion#ipc-por-anio');
  });

  it('en singular con un solo contrato', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 1 });
    await montar();
    expect(aviso()?.textContent).toContain('1 contrato se renueva sin incremento: falta el IPC 2026');
    expect(aviso()?.textContent).toContain('Rige en 2027');
  });

  it('🔴 no inventa la cifra del IPC: el aviso no trae ningún porcentaje', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 12 });
    await montar();
    expect(aviso()?.textContent).not.toMatch(/%|\d+,\d/);
  });

  it('es un aviso de la casa en tono warning', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 3 });
    await montar();
    expect(aviso()?.className).toContain('bg-warning-soft');
  });

  it('sin IPC que falte no pinta nada', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: null, anioQueRige: null, contratos: 0 });
    await montar();
    expect(aviso()).toBeNull();
  });

  it('falta el IPC pero ningún contrato rige ese año: no hay a quién avisarle', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 0 });
    await montar();
    expect(aviso()).toBeNull();
  });

  it('🔴 si la consulta falla no afirma nada, ni revienta', async () => {
    ipcQueFaltaMock.mockRejectedValue(new Error('Failed to fetch'));
    await montar();
    expect(aviso()).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('si la respuesta viene con otra forma, no pinta «NaN contratos»', async () => {
    ipcQueFaltaMock.mockResolvedValue({ anioDelIpc: 2026, anioQueRige: 2027, contratos: 'muchos' });
    await montar();
    expect(aviso()).toBeNull();
  });
});
