import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DominioPropio } from '@/lib/api/dominio-propio.service';

void React; // jsx-preserve

const ver = vi.fn();
const guardar = vi.fn();
const verificar = vi.fn();
const quitar = vi.fn();
vi.mock('@/lib/api/dominio-propio.service', () => ({
  dominioPropioApi: {
    ver: (...a: unknown[]) => ver(...a),
    guardar: (...a: unknown[]) => guardar(...a),
    verificar: (...a: unknown[]) => verificar(...a),
    quitar: (...a: unknown[]) => quitar(...a),
  },
}));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { SeccionTuDominio } from './SeccionTuDominio';

let contenedor: HTMLDivElement;
let raiz: Root;

const BASE: DominioPropio = {
  disponible: true,
  motivo: null,
  puedeUsarlo: true,
  dominio: null,
  estado: 'SIN_DOMINIO',
  registros: [],
  enlace: null,
  revisadoEl: null,
};

const ESPERANDO: DominioPropio = {
  ...BASE,
  dominio: 'inmuebles.loza.co',
  estado: 'ESPERANDO_DNS',
  registros: [{ tipo: 'CNAME', nombre: 'inmuebles', valor: 'cname.vercel-dns.com', para: 'apuntar' }],
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  for (const f of [ver, guardar, verificar, quitar]) f.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  document.body.innerHTML = '';
});

async function montar(d: DominioPropio) {
  ver.mockResolvedValue(d);
  await act(async () => {
    raiz.render(<SeccionTuDominio />);
  });
}

const porId = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

function escribir(valor: string) {
  const campo = document.getElementById('dominio-propio') as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('<SeccionTuDominio> (Nico, 31-10-2026)', () => {
  it('sin un plan de pago lo dice y lleva a los planes, sin ofrecer conectar', async () => {
    await montar({ ...BASE, puedeUsarlo: false });
    expect(porId('tu-dominio-plan')?.textContent).toContain('planes de pago');
    expect(porId('tu-dominio-plan')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/upgrade');
    expect(porId('conectar-dominio')).toBeNull();
  });

  it('sin la migración o sin Vercel dice que falta una actualización', async () => {
    await montar({ ...BASE, disponible: false, motivo: 'SIN_VERCEL' });
    expect(porId('tu-dominio-no-disponible')).not.toBeNull();
  });

  it('un dominio mal escrito se dice bajo el campo y no se manda', async () => {
    await montar(BASE);
    escribir('mi inmobiliaria');
    await act(async () => porId('conectar-dominio-boton')!.click());
    expect(guardar).not.toHaveBeenCalled();
    expect(contenedor.textContent).toContain('no parece un dominio');
  });

  it('conectar manda el dominio limpio y muestra los registros, cada uno con su «Copiar»', async () => {
    guardar.mockResolvedValue(ESPERANDO);
    await montar(BASE);
    escribir('https://Inmuebles.Loza.co/');
    await act(async () => porId('conectar-dominio-boton')!.click());
    expect(guardar).toHaveBeenCalledWith('inmuebles.loza.co');
    expect(porId('dominio-conectado-nombre')?.textContent).toBe('inmuebles.loza.co');
    expect(contenedor.textContent).toContain('Esperando el DNS');
    const registro = porId('registro-CNAME')!;
    expect(registro.textContent).toContain('cname.vercel-dns.com');
    expect(registro.querySelectorAll('button[aria-label^="Copiar"]').length).toBe(2);
  });

  it('«Ya los creé, revisar» vuelve a mirar y, activo, ofrece ver la página', async () => {
    verificar.mockResolvedValue({ ...ESPERANDO, estado: 'ACTIVO', registros: [], enlace: 'https://inmuebles.loza.co' });
    await montar(ESPERANDO);
    await act(async () => porId('dominio-revisar')!.click());
    expect(verificar).toHaveBeenCalled();
    expect(contenedor.textContent).toContain('Activo');
    expect(contenedor.querySelector('a[href="https://inmuebles.loza.co"]')).not.toBeNull();
    expect(porId('dominio-registros')).toBeNull();
  });

  it('quitar pide confirmar y vuelve a dejar conectar', async () => {
    quitar.mockResolvedValue(BASE);
    await montar({ ...ESPERANDO, estado: 'ACTIVO', registros: [], enlace: 'https://inmuebles.loza.co' });
    await act(async () => porId('dominio-quitar')!.click());
    expect(quitar).not.toHaveBeenCalled();
    await act(async () => porId('dominio-quitar-confirmar')!.click());
    expect(quitar).toHaveBeenCalled();
    expect(porId('conectar-dominio')).not.toBeNull();
  });
});
