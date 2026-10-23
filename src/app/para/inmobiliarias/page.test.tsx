/**
 * /para/inmobiliarias con la identidad nueva: el héroe ya no es la foto negra
 * con velos y degradados, los CTA siguen con sus destinos y no vuelve ninguna
 * clase del diseño viejo (vidrio, negrilla, letra de menos de 13 px).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { botonesAzules, clasesProhibidas, enlaces } from '../identidad-de-para';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/landing-v2/LandingChrome', () => ({
  LandingChrome: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/landing-v2/LandingFooterV2', () => ({ LandingFooterV2: () => null }));
vi.mock('@/components/home/FAQSection', () => ({ FAQSection: () => null }));
vi.mock('@/components/landing-v2/CorrienteDeVoltaje', () => ({
  CorrienteDeVoltaje: () => <canvas data-testid="corriente" />,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>
      {children}
    </a>
  ),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import InmobiliariasPage from './page';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  act(() => raiz.render(<InmobiliariasPage />));
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('/para/inmobiliarias · identidad nueva', () => {
  it('el héroe es de papel: sin velos negros, sin degradados y con la corriente de píxeles', () => {
    const heroe = contenedor.querySelector('[data-testid="heroe-de-para"]')!;
    expect(heroe).toBeTruthy();
    expect(clasesProhibidas(heroe)).toEqual([]);
    expect(heroe.querySelector('[data-testid="corriente"]')).toBeTruthy();
    expect(heroe.querySelector('h1')?.textContent).toContain('Escala tu operación');
    expect(botonesAzules(heroe)).toBe(1);
  });

  it('ninguna clase del diseño viejo en toda la página', () => {
    expect(clasesProhibidas(contenedor)).toEqual([]);
  });

  it('los CTA siguen con sus textos y destinos', () => {
    const todos = enlaces(contenedor);
    expect(todos).toContain('Empezar prueba gratis → /auth');
    expect(todos).toContain('Ver planes → /pricing');
    expect(todos).toContain('Empezar gratis → /auth?mode=register&role=agency');
    expect(todos).toContain('Ver precios → /pricing');
  });

  it('las cifras van en DM Mono y los testimonios se recorren con sus puntos', () => {
    const heroe = contenedor.querySelector('[data-testid="heroe-de-para"]')!;
    const fila = heroe.querySelector('[data-testid="cifras"]')!;
    const cifras = Array.from(fila.querySelectorAll('dd')).map((d) => d.textContent);
    expect(cifras).toEqual(['92%', '500+', '10x']);
    fila.querySelectorAll('dd').forEach((d) => expect(d.className).toContain('font-mono'));
    const siguiente = contenedor.querySelector('[aria-label="Siguiente testimonio"]') as HTMLButtonElement;
    expect(contenedor.textContent).toContain('Inmobiliaria Santafé');
    act(() => siguiente.click());
    expect(contenedor.textContent).toContain('02 / 04');
    const actual = contenedor.querySelector('[aria-current="true"]');
    expect(actual?.getAttribute('aria-label')).toBe('Testimonio 2: Grupo Inmobiliario Antioquia');
  });
});
