/**
 * El logo de Leasefy en carga en lugar de los spinners (pedido de Nico, 30-09):
 * azul en claro para casi todo, negro para lo discreto, blanco en oscuro y
 * sobre fondos llenos; quieto con movimiento reducido; el texto que acompaña
 * se queda, en mono y en mayúsculas; y nada grande.
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

describe('Spinner (adapter sobre CargaDeMarca)', () => {
  it('conserva role="status" y el label que se le pase', () => {
    render(<Spinner label="Cargando contratos" />);
    expect(screen.getByRole('status', { name: 'Cargando contratos' })).toBeTruthy();
  });

  it.each([
    ['default', ['azul', 'blanco']],
    ['info', ['azul', 'blanco']],
    ['muted', ['negro', 'blanco']],
    ['white', ['blanco']],
    ['current', ['azul', 'blanco']],
  ] as const)('variant=%s → %j', (variant, esperado) => {
    render(<Spinner variant={variant} data-testid="s" />);
    expect(colores(screen.getByTestId('s'))).toEqual(esperado);
  });

  it('size legacy → alto del logo (xs 14 · sm 18 · default 24 · 2xl tope 36)', () => {
    render(
      <>
        <Spinner size="xs" data-testid="xs" />
        <Spinner size="sm" data-testid="sm" />
        <Spinner data-testid="def" />
        <Spinner size="2xl" data-testid="xxl" />
      </>
    );
    const alto = (id: string) => screen.getByTestId(id).querySelector('img')!.getAttribute('height');
    expect([alto('xs'), alto('sm'), alto('def'), alto('xxl')]).toEqual(['14', '18', '24', '36']);
  });

  it('quita las clases del círculo viejo (animate-spin, h-4, w-4) y deja las demás', () => {
    render(<Spinner className="h-4 w-4 animate-spin mr-2" data-testid="s" />);
    const cls = screen.getByTestId('s').className;
    expect(cls).not.toContain('animate-spin');
    expect(cls).not.toMatch(/\b[hw]-4\b/);
    expect(cls).toContain('mr-2');
  });
});

describe('Button cargando', () => {
  it('pinta el logo blanco sobre el primario, deshabilita y anuncia aria-busy', () => {
    render(<Button isLoading>Guardar</Button>);
    const boton = screen.getByRole('button', { name: /Guardar/ });
    expect(boton.hasAttribute('disabled')).toBe(true);
    expect(boton.getAttribute('aria-busy')).toBe('true');
    expect(colores(boton)).toEqual(['blanco']);
    // sin el CircleNotch girando del DS
    expect(boton.querySelector('.animate-spin')).toBeNull();
  });

  it.each([
    ['destructive', ['blanco']],
    ['outline', ['azul', 'blanco']],
    ['secondary', ['azul', 'blanco']],
    ['ghost', ['negro', 'blanco']],
    ['white', ['azul']],
  ] as const)('variant=%s → %j', (variant, esperado) => {
    render(
      <Button isLoading variant={variant}>
        Enviar
      </Button>
    );
    expect(colores(screen.getByRole('button', { name: /Enviar/ }))).toEqual(esperado);
  });

  it('un <Spinner variant="current"> dentro del botón toma el tono del botón', () => {
    render(
      <Button>
        <Spinner variant="current" data-testid="s" />
        Procesando
      </Button>
    );
    expect(colores(screen.getByTestId('s'))).toEqual(['blanco']);
  });

  it('sin cargar no pinta logo y respeta disabled', () => {
    render(<Button disabled>Listo</Button>);
    const boton = screen.getByRole('button', { name: 'Listo' });
    expect(boton.querySelector('picture')).toBeNull();
    expect(boton.hasAttribute('disabled')).toBe(true);
    expect(boton.hasAttribute('aria-busy')).toBe(false);
  });

  it('con asChild la carga entra dentro del hijo', () => {
    render(
      <Button asChild isLoading>
        <a href="/x">Ir</a>
      </Button>
    );
    const enlace = screen.getByRole('link', { name: /Ir/ });
    expect(colores(enlace)).toEqual(['blanco']);
  });
});
