/**
 * @vitest-environment happy-dom
 *
 * 🔴 ARREGLOS-2 punto 5 (03-10-2026, visto por MOV-A5 a 390 px): «Mis
 * propiedades» pintaba el VACÍO («Aún no tienes propiedades») y los contadores
 * en 0 mientras cargaba (y también si la carga fallaba), el botón «Nueva
 * Propiedad» se montaba sobre el encabezado y el filtro de estado se salía de
 * la pantalla.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hook = vi.hoisted(() => ({ valor: {} as Record<string, unknown> }));
vi.mock('@/lib/hooks/useLandlord', () => ({ useLandlordProperties: () => hook.valor }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/link', () => ({
  default: ({ children, ...p }: { children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', p, children),
}));

import es from '@/lib/i18n/locales/es.json';
import PropiedadesPage from './page';

const T = es.landlord.properties;

const base = {
  properties: [],
  summary: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const pintar = (valor: Record<string, unknown>) => {
  hook.valor = { ...base, ...valor };
  act(() => root.render(<PropiedadesPage />));
};

const $ = (sel: string) => container.querySelector(sel);

describe('Mis propiedades — carga, error y vacío', () => {
  it('🔴 mientras carga: el esqueleto, NO el vacío ni los contadores en 0', () => {
    pintar({ isLoading: true });
    expect($('[data-testid="esqueleto-de-las-propiedades"]')?.getAttribute('aria-busy')).toBe('true');
    expect(container.textContent).not.toContain(T.emptyTitle);
    expect(container.textContent).not.toContain(T.totalProperties);
  });

  it('si falla: el error con su reintento, NO «aún no tienes propiedades»', () => {
    const refetch = vi.fn();
    pintar({ error: 'No pudimos cargar tus inmuebles.', refetch });
    const alerta = $('[data-testid="propiedades-error"]');
    expect(alerta?.textContent).toContain('No pudimos cargar tus inmuebles.');
    expect(container.textContent).not.toContain(T.emptyTitle);
    act(() => (alerta?.querySelector('button') as HTMLButtonElement).click());
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('cargado y sin propiedades: el vacío de verdad', () => {
    pintar({});
    expect(container.textContent).toContain(T.emptyTitle);
    expect($('[data-testid="esqueleto-de-las-propiedades"]')).toBeNull();
  });
});

describe('Mis propiedades — a 390 px', () => {
  it('«Nueva Propiedad» lleva su nombre y en pantallas chicas sólo el «+» (el texto, desde sm)', () => {
    pintar({});
    const boton = $('[data-testid="nueva-propiedad"]') as HTMLAnchorElement;
    expect(boton.getAttribute('aria-label')).toBe(T.newProperty);
    const texto = boton.querySelector('span');
    expect(texto?.className).toContain('hidden');
    expect(texto?.className).toContain('sm:inline');
  });

  it('el filtro de estado se desplaza dentro de su riel, no la página', () => {
    pintar({});
    const riel = $('[data-testid="filtro-de-estado"]') as HTMLElement;
    expect(riel.className).toContain('overflow-x-auto');
    expect(riel.className).toContain('min-w-0');
    expect(riel.querySelector('[role="radiogroup"]')).toBeTruthy();
  });
});
