/**
 * El logo de Leasefy en carga (pedido de Nico, 30-09): azul en claro para casi
 * todo, negro para lo discreto, blanco en oscuro y sobre fondos llenos; quieto
 * con movimiento reducido; el texto que acompaña se queda, en mono y en
 * mayúsculas; y nada grande.
 *
 * Y su frontera (Nico, 01-10): «los spinners sí van dentro de los botones, no
 * el logo; el logo sólo queda en cargas que son de pantalla total o
 * transiciones». El `Spinner` compartido y el `isLoading` del `Button` pintan
 * el spinner del DS, nunca el logo.
 */
import * as React from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';

import { ALTO_DE_CARGA, CargaDeMarca, anchoDeCarga } from './carga-de-marca';
import { Spinner } from './spinner';
import { Button } from './button';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const montados: Array<{ raiz: Root; contenedor: HTMLDivElement }> = [];

function render(nodo: React.ReactNode) {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const raiz = createRoot(contenedor);
  act(() => raiz.render(nodo));
  montados.push({ raiz, contenedor });
}

afterEach(() => {
  for (const { raiz, contenedor } of montados.splice(0)) {
    act(() => raiz.unmount());
    contenedor.remove();
  }
});

/** Nombre accesible simple: aria-label o el texto. */
function nombre(el: Element): string {
  return el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';
}

const screen = {
  getByTestId(id: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!el) throw new Error(`sin data-testid=${id}`);
    return el;
  },
  getByRole(role: string, opts?: { name?: string | RegExp }): HTMLElement {
    const candidatos = Array.from(
      document.querySelectorAll<HTMLElement>(
        role === 'button' ? 'button' : role === 'link' ? 'a[href]' : `[role="${role}"]`
      )
    );
    const el = candidatos.find((c) => {
      if (!opts?.name) return true;
      const n = nombre(c);
      return typeof opts.name === 'string' ? n === opts.name : opts.name.test(n);
    });
    if (!el) throw new Error(`sin role=${role} ${String(opts?.name ?? '')}`);
    return el;
  },
  getByText(texto: string): HTMLElement {
    const el = Array.from(document.querySelectorAll<HTMLElement>('body *')).find(
      (e) => e.children.length === 0 && e.textContent === texto
    );
    if (!el) throw new Error(`sin texto ${texto}`);
    return el;
  },
};

/** Colores que pinta cada <picture>, en orden: [claro, oscuro] o [siempre]. */
function colores(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('picture')).map(
    (p) => p.getAttribute('data-carga-color') ?? ''
  );
}

describe('CargaDeMarca', () => {
  it('es un role="status" con nombre accesible «Cargando» por defecto', () => {
    render(<CargaDeMarca />);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
  });

  it('azul por defecto en claro y blanco en oscuro (conmuta con la clase .dark)', () => {
    render(<CargaDeMarca data-testid="c" />);
    const el = screen.getByTestId('c');
    expect(colores(el)).toEqual(['azul', 'blanco']);
    const [claro, oscuro] = Array.from(el.querySelectorAll('picture'));
    expect(claro.className).toContain('dark:hidden');
    expect(oscuro.className).toContain('hidden');
    expect(oscuro.className).toContain('dark:block');
  });

  it('negro en claro, blanco en oscuro', () => {
    render(<CargaDeMarca tono="negro" data-testid="c" />);
    expect(colores(screen.getByTestId('c'))).toEqual(['negro', 'blanco']);
  });

  it('sobre-color es blanco siempre; sobre-blanco es azul siempre', () => {
    render(
      <>
        <CargaDeMarca tono="sobre-color" data-testid="a" />
        <CargaDeMarca tono="sobre-blanco" data-testid="b" />
      </>
    );
    expect(colores(screen.getByTestId('a'))).toEqual(['blanco']);
    expect(colores(screen.getByTestId('b'))).toEqual(['azul']);
  });

  it('pinta el WebP animado con <img> plano y el PNG quieto para movimiento reducido', () => {
    render(<CargaDeMarca tono="negro" data-testid="c" />);
    const picture = screen.getByTestId('c').querySelector('picture')!;
    const source = picture.querySelector('source')!;
    expect(source.getAttribute('media')).toBe('(prefers-reduced-motion: reduce)');
    expect(source.getAttribute('srcset')).toBe('/brand/carga/carga-negro-quieta.png');
    const img = picture.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/brand/carga/carga-negro.webp');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('el tamaño es por alto y el ancho sale de la proporción 240×130; nada pasa de 40 px', () => {
    render(<CargaDeMarca tamano="lg" data-testid="c" />);
    const img = screen.getByTestId('c').querySelector('img')!;
    expect(img.getAttribute('height')).toBe(String(ALTO_DE_CARGA.lg));
    expect(img.getAttribute('width')).toBe(String(anchoDeCarga('lg')));
    expect(Object.values(ALTO_DE_CARGA).every((alto) => alto <= 40)).toBe(true);
    expect(anchoDeCarga('md')).toBe(44);
  });

  it('el texto se queda, en mono y en mayúsculas, y le da nombre al status', () => {
    render(<CargaDeMarca texto="Abriendo tu registro…" />);
    const status = screen.getByRole('status', { name: 'Abriendo tu registro…' });
    const texto = screen.getByText('Abriendo tu registro…');
    expect(status.contains(texto)).toBe(true);
    expect(texto.className).toContain('font-mono');
    expect(texto.className).toContain('uppercase');
    expect(texto.className).toContain('text-caption');
    expect(texto.className).not.toContain('text-xs');
  });
});

describe('Spinner: el del DS, no el logo', () => {
  it('es un role="status" con el label que se le pase y gira, sin <picture>', () => {
    render(<Spinner label="Cargando contratos" data-testid="s" />);
    const status = screen.getByRole('status', { name: 'Cargando contratos' });
    expect(status.querySelector('picture')).toBeNull();
    expect(status.querySelector('.animate-spin')).not.toBeNull();
  });

  it.each(['default', 'muted', 'white', 'current', 'info'] as const)(
    'variant=%s tampoco pinta el logo',
    (variant) => {
      render(<Spinner variant={variant} data-testid="s" />);
      expect(screen.getByTestId('s').querySelector('picture')).toBeNull();
    }
  );
});

describe('Button cargando: el spinner del DS, no el logo', () => {
  it('gira, deshabilita y anuncia aria-busy, sin <picture>', () => {
    render(<Button isLoading>Guardar</Button>);
    const boton = screen.getByRole('button', { name: /Guardar/ });
    expect(boton.hasAttribute('disabled')).toBe(true);
    expect(boton.getAttribute('aria-busy')).toBe('true');
    expect(boton.querySelector('.animate-spin')).not.toBeNull();
    expect(boton.querySelector('picture')).toBeNull();
  });

  it.each(['default', 'destructive', 'outline', 'secondary', 'ghost', 'white'] as const)(
    'variant=%s cargando: spinner y nunca logo',
    (variant) => {
      render(
        <Button isLoading variant={variant}>
          Enviar
        </Button>
      );
      const boton = screen.getByRole('button', { name: /Enviar/ });
      expect(boton.querySelector('.animate-spin')).not.toBeNull();
      expect(boton.querySelector('picture')).toBeNull();
    }
  );

  it('un <Spinner> dentro del botón es el spinner, no el logo', () => {
    render(
      <Button>
        <Spinner variant="current" data-testid="s" />
        Procesando
      </Button>
    );
    expect(screen.getByTestId('s').querySelector('picture')).toBeNull();
    expect(screen.getByTestId('s').querySelector('.animate-spin')).not.toBeNull();
  });

  it('sin cargar no gira, respeta disabled y no anuncia aria-busy', () => {
    render(<Button disabled>Listo</Button>);
    const boton = screen.getByRole('button', { name: 'Listo' });
    expect(boton.querySelector('.animate-spin')).toBeNull();
    expect(boton.hasAttribute('disabled')).toBe(true);
    expect(boton.hasAttribute('aria-busy')).toBe(false);
  });

  it('con asChild el spinner entra dentro del hijo', () => {
    render(
      <Button asChild isLoading>
        <a href="/x">Ir</a>
      </Button>
    );
    const enlace = screen.getByRole('link', { name: /Ir/ });
    expect(enlace.querySelector('.animate-spin')).not.toBeNull();
    expect(enlace.querySelector('picture')).toBeNull();
    expect(enlace.getAttribute('aria-busy')).toBe('true');
  });
});
