/**
 * Los fondos de la marca sin puntos (la ola en papel y las curvas de nivel del home, 30-10): son decoración. Sin
 * WebGL (como en happy-dom) no pintan nada y no rompen la página; siempre van escondidos del lector de pantalla. Y
 * ninguna pantalla pública vuelve a los píxeles de `CorrienteDeVoltaje`.
 */
import * as React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { CurvasDeNivel, OlaEnPapel } from './CamposDeLaMarca';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  host = null;
  root = null;
});

function pintar(el: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

describe('los fondos de la marca', () => {
  it('la ola en papel (también la interactiva) es un canvas decorativo que no se anuncia y no rompe sin WebGL', () => {
    const h = pintar(<OlaEnPapel className="absolute" interactivo />);
    const cv = h.querySelector('[data-testid="ola-en-papel"]');
    expect(cv?.tagName).toBe('CANVAS');
    expect(cv?.getAttribute('aria-hidden')).toBe('true');
    expect(cv?.className).toContain('pointer-events-none');
  });

  it('las curvas de nivel también', () => {
    const h = pintar(<CurvasDeNivel className="absolute" />);
    const cv = h.querySelector('[data-testid="curvas-de-nivel"]');
    expect(cv?.tagName).toBe('CANVAS');
    expect(cv?.getAttribute('aria-hidden')).toBe('true');
  });

  it('el marketplace, «Publicar», el publicado y el avalúo ya no usan los puntos ni las estrías (Nico 30-10)', () => {
    const raiz = process.cwd();
    for (const archivo of [
      'src/components/marketplace/InicioDelMarketplace.tsx',
      'src/components/marketplace/GaleriaDelMarketplace.tsx',
      'src/components/marketplace/inmobiliaria/PaginaDeLaInmobiliaria.tsx',
      'src/components/marketplace/inmobiliaria/piezas.tsx',
      'src/components/marketplace/ConversacionDelMarketplace.tsx',
      'src/components/marketplace/PublicarDesdeElMarketplace.tsx',
      'src/components/publish/PublishSuccess.tsx',
      'src/app/avaluo/PaginaDelAvaluo.tsx',
    ]) {
      const codigo = readFileSync(join(raiz, archivo), 'utf8');
      expect(codigo, archivo).not.toMatch(/<CorrienteDeVoltaje\b|<FotoEnEstrias\b/);
    }
  });
});
