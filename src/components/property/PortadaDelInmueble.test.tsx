import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { PortadaDelInmueble, primeraFoto } from './PortadaDelInmueble';

void React;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function render(ui: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe('primeraFoto', () => {
  it('salta entradas vacías o de puros espacios', () => {
    expect(primeraFoto({ images: ['', '   ', 'https://x.supabase.co/a.jpg'] })).toBe('https://x.supabase.co/a.jpg');
  });

  it('cae en thumbnailUrl y, sin nada usable, devuelve null', () => {
    expect(primeraFoto({ images: [], thumbnailUrl: 'https://x.supabase.co/t.jpg' })).toBe('https://x.supabase.co/t.jpg');
    expect(primeraFoto({ images: [], thumbnailUrl: '' })).toBeNull();
    expect(primeraFoto({})).toBeNull();
  });
});

describe('PortadaDelInmueble', () => {
  it('un inmueble migrado sin fotos dice «Sin fotos» y no pinta una imagen rota', () => {
    const el = render(<PortadaDelInmueble property={{ images: [], thumbnailUrl: '' }} alt="Apartamento en La Playita" />);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('[data-testid="inmueble-sin-fotos"]')?.textContent).toContain('Sin fotos');
  });

  it('con foto pinta la primera', () => {
    const el = render(<PortadaDelInmueble property={{ images: ['https://x.supabase.co/a.jpg'] }} alt="Casa" />);
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://x.supabase.co/a.jpg');
    expect(el.querySelector('[data-testid="inmueble-sin-fotos"]')).toBeNull();
  });
});
