import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { CompartirLaFicha, enlaceDeWhatsapp } from './CompartirLaFicha';
import { IdiomaDeLaPagina } from '@/lib/idioma/use-idioma';
import type { InmuebleParaCompartir } from '@/lib/inmuebles/ficha-para-compartir';

const FICHA: InmuebleParaCompartir = {
  titulo: 'Casa Finca (Kachotis)',
  canon: 2_900_000,
  ciudad: 'CALDAS',
  barrio: 'PRIMAVERA',
  area: 100,
  habitaciones: 2,
  banos: 1,
};
const ENLACE = 'http://localhost:3000/propiedades/p1';

let contenedor: HTMLDivElement;
let raiz: Root;
const writeText = vi.fn();

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  toast.success.mockClear();
  toast.error.mockClear();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.restoreAllMocks();
});

function pintar(props: Partial<React.ComponentProps<typeof CompartirLaFicha>> = {}, idioma: 'es' | 'en' = 'es') {
  act(() => {
    raiz.render(
      <IdiomaDeLaPagina idioma={idioma}>
        <CompartirLaFicha propertyId="p1" ficha={FICHA} {...props} />
      </IdiomaDeLaPagina>,
    );
  });
}

const boton = (id: string) => contenedor.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;

async function clic(b: HTMLButtonElement | null) {
  await act(async () => {
    b!.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<CompartirLaFicha>', () => {
  it('«Copiar ficha» copia el texto de la ficha con el enlace al final y lo dice', async () => {
    pintar();
    await clic(boton('copiar-ficha'));
    expect(writeText).toHaveBeenCalledWith(
      [
        'CASA FINCA (KACHOTIS)',
        'Primavera, Caldas',
        'Precio: $ 2.900.000 / mes',
        '100 m²',
        '2 habitaciones',
        '1 baño',
        '',
        'Conoce más detalles aquí:',
        ENLACE,
      ].join('\n'),
    );
    expect(toast.success).toHaveBeenCalledWith('Copiamos la ficha del inmueble', {
      description: 'Pégala en el chat: el enlace suma la vista previa con la foto.',
    });
  });

  it('«WhatsApp» abre wa.me con la ficha escrita, en otra pestaña', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    pintar();
    await clic(boton('enviar-por-whatsapp'));
    expect(abrir).toHaveBeenCalledTimes(1);
    const [url, destino, opciones] = abrir.mock.calls[0];
    expect(String(url).startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(String(url).slice('https://wa.me/?text='.length))).toContain(`Conoce más detalles aquí:\n${ENLACE}`);
    expect(destino).toBe('_blank');
    expect(opciones).toContain('noopener');
  });

  it('«Copiar enlace» sólo con `conEnlace` y copia sólo el enlace', async () => {
    pintar();
    expect(boton('copiar-enlace')).toBeNull();
    pintar({ conEnlace: true });
    await clic(boton('copiar-enlace'));
    expect(writeText).toHaveBeenCalledWith(ENLACE);
    expect(toast.success).toHaveBeenCalledWith('Copiamos el enlace del inmueble');
  });

  it('si el navegador no deja copiar, lo dice en vez de callarse', async () => {
    writeText.mockRejectedValue(new Error('NotAllowedError'));
    pintar();
    await clic(boton('copiar-ficha'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No pudimos copiarla', expect.anything());
  });

  it('en la página en inglés, la ficha y los botones en inglés', async () => {
    pintar({}, 'en');
    expect(boton('copiar-ficha')?.textContent).toContain('Copy card');
    await clic(boton('copiar-ficha'));
    expect(String(writeText.mock.calls[0][0])).toContain('Price: $ 2,900,000 / month');
  });

  it('enlaceDeWhatsapp codifica el texto entero (saltos de línea, $ y tildes)', () => {
    expect(enlaceDeWhatsapp('Hola\n$ 1 · baño')).toBe('https://wa.me/?text=Hola%0A%24%201%20%C2%B7%20ba%C3%B1o');
  });
});
