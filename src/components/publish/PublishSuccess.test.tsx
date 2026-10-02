/**
 * Publicar del propietario — las fotos que no subieron, cada una con su motivo
 * (sistema de errores, 02-10-2026).
 *
 * El inmueble se publica aunque una foto falle. Antes eso vivía sólo en un
 * toast que se iba solo y decía el motivo de la primera; y la pantalla de
 * éxito se llevaba a la persona al panel a los 5 s. Ahora la pantalla lista
 * cada foto con lo que dijo el traductor de errores, y con fotos pendientes no
 * se va sola: la persona tiene que poder leerlo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { initialPropertyDraft } from '@/lib/types/publish';
import type { FotoQueNoSubio } from '@/lib/context/PublishContext';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { estado, empujar } = vi.hoisted(() => ({
  estado: { fotos: [] as FotoQueNoSubio[] },
  empujar: vi.fn(),
}));

vi.mock('@/lib/context/PublishContext', () => ({
  usePublish: () => ({
    draft: {
      ...initialPropertyDraft,
      title: 'Apartamento en Laureles',
      city: 'Medellín',
      neighborhood: 'Laureles',
      monthlyRent: 1_800_000,
      bedrooms: 2,
    },
    fotosQueNoSubieron: estado.fotos,
  }),
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: empujar, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
}));

import { PublishSuccess } from './PublishSuccess';

const PESADA = 'La foto pesa más de 5 MB. Súbela más liviana.';
const DE_NUESTRO_LADO =
  'No pudimos subir «cocina.jpg»: algo falló de nuestro lado. Si vuelve a pasar, comparte la referencia ab12cd34.';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function pintar(fotos: FotoQueNoSubio[]) {
  estado.fotos = fotos;
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(<PublishSuccess />);
  });
  return container;
}

beforeEach(() => {
  vi.useFakeTimers();
  empujar.mockReset();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  estado.fotos = [];
  vi.useRealTimers();
});

describe('PublishSuccess — las fotos que no subieron', () => {
  it('🔴 lista cada foto que no subió con su motivo', () => {
    const c = pintar([
      { nombre: 'sala.jpg', motivo: PESADA },
      { nombre: 'cocina.jpg', motivo: DE_NUESTRO_LADO },
    ]);

    const aviso = c.querySelector('[data-testid="fotos-que-no-subieron"]');
    expect(aviso).not.toBeNull();
    expect(aviso!.querySelector('h2')?.textContent).toBe('2 fotos no se subieron');

    const filas = Array.from(aviso!.querySelectorAll('li'));
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('sala.jpg');
    expect(filas[0].textContent).toContain(PESADA);
    expect(filas[1].textContent).toContain('cocina.jpg');
    expect(filas[1].textContent).toContain(DE_NUESTRO_LADO);
  });

  it('una sola foto lo dice en singular', () => {
    const c = pintar([{ nombre: 'sala.jpg', motivo: PESADA }]);
    expect(c.querySelector('[data-testid="fotos-que-no-subieron"] h2')?.textContent).toBe(
      'Una foto no se subió',
    );
  });

  it('con fotos que no subieron no se lleva a la persona sola al panel', () => {
    const c = pintar([{ nombre: 'sala.jpg', motivo: PESADA }]);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(empujar).not.toHaveBeenCalled();
    expect(c.textContent).not.toContain('Redirigiendo');
  });

  it('con todas las fotos arriba no hay aviso y se va al panel a los 5 s, como siempre', () => {
    const c = pintar([]);
    expect(c.querySelector('[data-testid="fotos-que-no-subieron"]')).toBeNull();
    expect(c.textContent).toContain('Redirigiendo en 5s');
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(empujar).toHaveBeenCalledWith('/panel/propiedades');
  });
});
