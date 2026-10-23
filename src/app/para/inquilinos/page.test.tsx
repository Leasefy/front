/**
 * /para/inquilinos con la identidad nueva: el héroe ya no es la foto negra
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

import InquilinosPage from './page';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  act(() => raiz.render(<InquilinosPage />));
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('/para/inquilinos · identidad nueva', () => {
  it('el héroe es de papel: sin velos negros, sin degradados y con la corriente de píxeles', () => {
    const heroe = contenedor.querySelector('[data-testid="heroe-de-para"]')!;
    expect(heroe).toBeTruthy();
    expect(clasesProhibidas(heroe)).toEqual([]);
    expect(heroe.querySelector('[data-testid="corriente"]')).toBeTruthy();
    expect(heroe.querySelector('h1')?.textContent).toContain('Encuentra tu hogar');
    expect(botonesAzules(heroe)).toBe(1);
  });

  it('ninguna clase del diseño viejo en toda la página', () => {
    expect(clasesProhibidas(contenedor)).toEqual([]);
  });

  it('los CTA siguen con sus textos y destinos', () => {
    const todos = enlaces(contenedor);
    // Ronda 30 (a propósito): «Ver inmuebles» (antes «Ver propiedades»).
    expect(todos).toContain('Ver inmuebles → /propiedades');
    expect(todos).toContain('Crear perfil gratis → /auth');
    expect(todos).toContain('Empezar gratis → /auth?mode=register&role=agency');
    expect(todos).toContain('Ver precios → /pricing');
  });

  // Ronda 30 (a propósito): sólo cifras que se pueden sostener y sin testimonios (eran inventados).
  it('las cifras van en DM Mono y no hay testimonios inventados', () => {
    const heroe = contenedor.querySelector('[data-testid="heroe-de-para"]')!;
    const fila = heroe.querySelector('[data-testid="cifras"]')!;
    const cifras = Array.from(fila.querySelectorAll('dd')).map((d) => d.textContent);
    expect(cifras).toEqual(['$0', 'Ley 820']);
    fila.querySelectorAll('dd').forEach((d) => expect(d.className).toContain('font-mono'));
    expect(contenedor.querySelector('[aria-label="Siguiente testimonio"]')).toBeNull();
  });
});
