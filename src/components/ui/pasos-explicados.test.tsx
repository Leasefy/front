/**
 * `PasosExplicados` — lo que va DENTRO del cajón de «¿Cómo funciona?» (Nico,
 * 05-10-2026: «explica mejor cada cosa y más bonito»).
 *
 * Fija lo que la pieza promete: cada paso numerado en orden, quién lo hace
 * dicho en palabras, «Lo que haces tú» resaltado SÓLO donde hay algo que hacer,
 * y la nota al pie. Sin `I18nProvider` cae al español (las pruebas de pantalla
 * moquean `@/lib/i18n`).
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { Robot, ShareNetwork, SealCheck } from '@phosphor-icons/react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { PasosExplicados, type PasoExplicado } from './pasos-explicados';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

const PASOS: PasoExplicado[] = [
  {
    id: 'pides',
    icono: ShareNetwork,
    titulo: 'Pides el avalúo',
    explicacion: 'Abres el asistente o mandas el enlace.',
    quien: 'tu',
    tuParte: 'elige «Solicitar avalúo» arriba.',
  },
  { id: 'estima', icono: Robot, titulo: 'Se estima el valor', explicacion: 'El motor cruza datos del mercado.' },
  { id: 'firma', icono: SealCheck, titulo: 'Un revisor lo firma', explicacion: 'Lo firma Leasefy.', quien: 'leasefy' },
];

async function pintar(nota?: React.ReactNode) {
  await act(async () => {
    raiz.render(<PasosExplicados data-testid="pasos" pasos={PASOS} nota={nota} />);
  });
}

describe('<PasosExplicados>', () => {
  it('numera los pasos en orden, con su título y su explicación', async () => {
    await pintar();
    const pasos = [...contenedor.querySelectorAll('[data-testid="pasos-explicados"] > li')];
    expect(pasos).toHaveLength(3);
    expect(pasos.map((p) => p.getAttribute('data-paso'))).toEqual(['1', '2', '3']);
    expect(pasos[0].textContent).toContain('Paso 1');
    expect(pasos[0].textContent).toContain('Pides el avalúo');
    expect(pasos[0].textContent).toContain('Abres el asistente o mandas el enlace.');
    expect(pasos[2].textContent).toContain('Paso 3');
  });

  it('dice quién hace cada paso, y un paso sin `quien` no lleva marca', async () => {
    await pintar();
    const pasos = [...contenedor.querySelectorAll('[data-testid="pasos-explicados"] > li')];
    expect(pasos[0].querySelector('[data-quien="tu"]')?.textContent).toBe('Lo haces tú');
    expect(pasos[1].querySelector('[data-quien]')).toBeNull();
    expect(pasos[2].querySelector('[data-quien="leasefy"]')?.textContent).toBe('Lo hace Leasefy');
  });

  it('🔴 la marca de quién lo hace conserva su tamaño (13 px) junto al color', async () => {
    // `tailwind-merge` borraba `text-caption` al ver `text-primary`: salía en 16 px.
    await pintar();
    for (const marca of contenedor.querySelectorAll('[data-quien]')) {
      expect(marca.className).toContain('text-caption');
    }
    expect(contenedor.querySelector('[data-quien="tu"]')!.className).toContain('text-primary');
  });

  it('«Lo que haces tú» sale resaltado sólo donde hay algo que hacer', async () => {
    await pintar();
    const resaltados = contenedor.querySelectorAll('[data-testid="tu-parte"]');
    expect(resaltados).toHaveLength(1);
    expect(resaltados[0].textContent).toContain('Lo que haces tú:');
    expect(resaltados[0].textContent).toContain('elige «Solicitar avalúo» arriba.');
    expect(resaltados[0].closest('li')?.getAttribute('data-paso')).toBe('1');
  });

  it('la nota va al pie, y sin nota no hay caja vacía', async () => {
    await pintar('Firma un revisor de Leasefy. No hay visita.');
    expect(contenedor.querySelector('[data-testid="pasos-nota"]')?.textContent).toContain('Firma un revisor');
    await pintar();
    expect(contenedor.querySelector('[data-testid="pasos-nota"]')).toBeNull();
  });

  it('el contenido no se lee en 12 px: ningún `text-xs`', async () => {
    await pintar('nota');
    expect(contenedor.innerHTML).not.toMatch(/\btext-xs\b/);
  });
});
