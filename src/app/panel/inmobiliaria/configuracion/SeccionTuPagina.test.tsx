/**
 * Configuración → «Tu página en Leasefy» (Nico, 09-10-2026): el nombre corto
 * con la regla del back, el lema, las redes (con YouTube) y los atajos para
 * publicar uno o muchos.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { updateAgency, uploadAgencyPortada, refetch, toastOk, toastError, agencia } = vi.hoisted(() => ({
  updateAgency: vi.fn(),
  uploadAgencyPortada: vi.fn(),
  refetch: vi.fn(),
  toastOk: vi.fn(),
  toastError: vi.fn(),
  agencia: {
    actual: {
      id: 'agencia-1',
      name: 'Nogal Inmobiliaria',
      slug: 'nogal',
      lema: 'Arriendos en Laureles',
      portadaUrl: null,
      branding: { primaryColor: '#0B5', socials: { instagram: '@nogal', youtube: '@nogaltv' } },
    } as Record<string, unknown>,
  },
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useInmobiliariaConfig: () => ({ config: { agency: agencia.actual }, isLoading: false, errorCrudo: null, refetch }),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ agencyApi: { updateAgency, uploadAgencyPortada } }));
vi.mock('@/components/ui/toast', () => ({ toast: { success: toastOk, error: toastError } }));
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span data-imagen={p.alt} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { SeccionTuPagina } from './SeccionTuPagina';

let container: HTMLDivElement;
let root: Root;

function montar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<SeccionTuPagina />));
}

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => container.querySelector<T>(sel)!;
const boton = (texto: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;

function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  updateAgency.mockReset().mockResolvedValue({});
  refetch.mockReset();
  toastOk.mockReset();
  toastError.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('<SeccionTuPagina>', () => {
  it('muestra la dirección de la página y lo guardado', () => {
    montar();
    expect(container.textContent).toContain('leasefy.co/i/nogal');
    expect($<HTMLInputElement>('#nombre-corto').value).toBe('nogal');
    expect($<HTMLInputElement>('#lema').value).toBe('Arriendos en Laureles');
    const redes = [...container.querySelectorAll<HTMLInputElement>('input[placeholder]')].map((i) => i.value);
    expect(redes).toContain('@nogaltv');
    expect($<HTMLAnchorElement>('a[href="/i/nogal"]').textContent).toContain('Ver mi página');
  });

  it('el nombre corto se lleva a la forma y se guarda con el lema y TODAS las redes', async () => {
    montar();
    await act(async () => escribir($<HTMLInputElement>('#nombre-corto'), 'Nogal Inmobiliaria'));
    expect(container.textContent).toContain('leasefy.co/i/nogal-inmobiliaria');

    await act(async () => boton('Guardar mi página').click());

    expect(updateAgency).toHaveBeenCalledWith({
      slug: 'nogal-inmobiliaria',
      lema: 'Arriendos en Laureles',
      branding: { socials: { instagram: '@nogal', tiktok: '', youtube: '@nogaltv', facebook: '' } },
    });
    expect(toastOk).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
  });

  it('sin cambiar el nombre corto, no lo manda (no choca consigo mismo)', async () => {
    montar();
    await act(async () => boton('Guardar mi página').click());
    expect(updateAgency.mock.calls[0][0]).not.toHaveProperty('slug');
  });

  it('una palabra reservada se dice bajo el campo y no se guarda', async () => {
    montar();
    await act(async () => escribir($<HTMLInputElement>('#nombre-corto'), 'panel'));
    await act(async () => boton('Guardar mi página').click());
    expect(updateAgency).not.toHaveBeenCalled();
    expect($('#nombre-corto-ayuda').textContent).toContain('reservado');
    expect($<HTMLInputElement>('#nombre-corto').getAttribute('aria-invalid')).toBe('true');
  });

  it('el nombre corto que ya tiene otra inmobiliaria (409) va bajo el campo, no a un toast', async () => {
    updateAgency.mockRejectedValue(new Error('Ese nombre corto ya lo tiene otra inmobiliaria. Prueba con otro.'));
    montar();
    await act(async () => escribir($<HTMLInputElement>('#nombre-corto'), 'ceiba'));
    await act(async () => boton('Guardar mi página').click());
    expect($('#nombre-corto-ayuda').textContent).toContain('ya lo tiene otra inmobiliaria');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('tiene a la mano publicar uno o muchos', () => {
    montar();
    expect($<HTMLAnchorElement>('a[href="/panel/inmobiliaria/inmuebles/nuevo"]').textContent).toContain('Publicar un inmueble');
    expect($<HTMLAnchorElement>('a[href="/panel/inmobiliaria/inmuebles/importar"]').textContent).toContain(
      'Cargar muchos desde un archivo',
    );
  });
});
