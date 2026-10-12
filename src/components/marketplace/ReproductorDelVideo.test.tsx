/**
 * El reproductor propio (Nico, 09-10-2026): nuestra ventana con el reproductor
 * oficial de la red adentro, pasar de un video a otro, y cerrar.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/providers/SmoothScroll', () => ({ useLenis: () => ({ stop: vi.fn(), start: vi.fn() }) }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import { ReproductorDelVideo, type VideoParaVer } from './ReproductorDelVideo';

const VIDEOS: VideoParaVer[] = [
  {
    id: 'p1',
    enlace: 'https://www.youtube.com/watch?v=YpMt97uAkHo',
    red: 'youtube',
    foto: null,
    titulo: 'Apartamento en Laureles',
    lugar: 'Laureles, Medellín',
    href: '/propiedades/p1',
    precio: '$ 3.200.000 al mes',
    inmobiliaria: { nombre: 'Nogal Inmobiliaria', logoUrl: null, href: '/i/nogal' },
  },
  {
    id: 'p2',
    enlace: 'https://vm.tiktok.com/ZMabc123/',
    red: 'tiktok',
    foto: null,
    titulo: 'Casa en Belén',
    lugar: 'Belén, Medellín',
  },
];

let container: HTMLDivElement;
let root: Root;
const cambiar = vi.fn();

function montar(indice: number | null) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ReproductorDelVideo videos={VIDEOS} indice={indice} alCambiar={cambiar} />));
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  cambiar.mockReset();
});

const enElCuerpo = (sel: string) => document.body.querySelector<HTMLElement>(sel);

describe('<ReproductorDelVideo>', () => {
  it('cerrado no pinta nada', () => {
    montar(null);
    expect(enElCuerpo('[data-testid="reproductor-del-video"]')).toBeNull();
  });

  it('abre el reproductor oficial de la red dentro de nuestra ventana, con el inmueble', () => {
    montar(0);
    const iframe = enElCuerpo('[data-testid="reproductor-de-la-red"]') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toContain('youtube-nocookie.com/embed/YpMt97uAkHo');
    const ventana = enElCuerpo('[data-testid="reproductor-del-video"]')!;
    expect(ventana.textContent).toContain('Apartamento en Laureles');
    expect(ventana.textContent).toContain('$ 3.200.000 al mes');
    expect(ventana.textContent).toContain('Nogal Inmobiliaria');
    expect(enElCuerpo('[data-testid="ver-el-inmueble"]')!.getAttribute('href')).toBe('/propiedades/p1');
    expect(ventana.textContent).toContain('1 / 2');
  });

  it('un enlace que no dice qué video es se ofrece abrir en la red', () => {
    montar(1);
    expect(enElCuerpo('[data-testid="reproductor-de-la-red"]')).toBeNull();
    expect(enElCuerpo('[data-testid="reproductor-del-video"]')!.textContent).toContain('Este video sólo se puede ver en TikTok');
  });

  it('las flechas del teclado pasan de video y Escape cierra', () => {
    montar(0);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(cambiar).toHaveBeenLastCalledWith(1);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' })));
    expect(cambiar).toHaveBeenLastCalledWith(1);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(cambiar).toHaveBeenLastCalledWith(null);
  });
});
