/**
 * El resumen del estado de cuenta en la ficha, con las palabras de SU lado.
 *
 * 🔴 P-16 (QA-PROP, 03-10): la ficha del propietario decía «Resta por pagar ·
 * Próxima cuota · En mora · 64 días» en rojo —las palabras del inquilino—
 * mientras su estado de cuenta decía «Por girar · Giro atrasado». Para el
 * propietario el número es lo que la inmobiliaria le GIRA: nunca «en mora».
 * El lado del inquilino queda como estaba.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ resumen: vi.fn(), propietario: vi.fn(), inquilino: vi.fn() }));
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({
  estadoDeCuentaApi: api,
  rutaDelEstadoDeCuenta: (tipo: string, id: string) => `/panel/inmobiliaria/estado-de-cuenta/${tipo}/${id}`,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}));

import { ResumenEnLaFicha } from './ResumenEnLaFicha';

const RESUMEN = {
  restaPorPagar: 51_538_500,
  pendiente: 23_698_900,
  proximaCuota: { fecha: '2026-11-01', monto: 1_982_250 },
  enMora: { dias: 64, monto: 23_698_900 },
  contratos: 9,
  interesDeMora: 120_000,
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  api.resumen.mockReset().mockResolvedValue(RESUMEN);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function pintar(tipo: 'propietario' | 'inquilino') {
  await act(async () => {
    root.render(<ResumenEnLaFicha tipo={tipo} id="x1" />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  return host.querySelector('[data-testid="resumen-en-la-ficha"]')?.textContent ?? '';
}

describe('<ResumenEnLaFicha> — las palabras de cada lado', () => {
  it('🔴 del lado PROPIETARIO: «Por girar», «Próximo giro» y «Giro atrasado», nunca «en mora» ni «resta por pagar»', async () => {
    const texto = await pintar('propietario');
    expect(texto).toContain('Por girar');
    expect(texto).toContain('Próximo giro');
    expect(texto).toContain('Giro atrasado · 64 días');
    expect(texto).not.toMatch(/en mora/i);
    expect(texto).not.toContain('Resta por pagar');
    expect(texto).not.toContain('Próxima cuota');
  });

  it('🔴 al propietario el atraso se le avisa en ámbar, no en el rojo de «debes»', async () => {
    await pintar('propietario');
    const estado = host.querySelector('[data-testid="ficha-estado"]')!;
    expect(estado.className).toContain('text-warning');
    expect(estado.className).not.toContain('text-danger');
  });

  it('el interés de mora es de la inmobiliaria: no sale en la ficha del propietario', async () => {
    await pintar('propietario');
    expect(host.querySelector('[data-testid="ficha-intereses"]')).toBeNull();
  });

  it('del lado INQUILINO todo sigue igual: «Resta por pagar», «Próxima cuota», «En mora» en rojo y sus intereses', async () => {
    const texto = await pintar('inquilino');
    expect(texto).toContain('Resta por pagar');
    expect(texto).toContain('Próxima cuota');
    expect(texto).toContain('En mora · 64 días');
    expect(host.querySelector('[data-testid="ficha-estado"]')!.className).toContain('text-danger');
    expect(host.querySelector('[data-testid="ficha-intereses"]')).not.toBeNull();
  });

  it('la cifra de la próxima es la que manda el resumen (la suma del próximo mes la calcula el back)', async () => {
    const texto = await pintar('propietario');
    expect(texto).toContain('1.982.250');
  });
});
