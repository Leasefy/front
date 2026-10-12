/**
 * «¿Recomendarías a Nogal para arrendar?» (Nico, 09-10-2026): sí o no, un
 * comentario opcional que se publica, «Ahora no» que la guarda en este
 * navegador, y nada si no hay pregunta pendiente.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { pendientes, votar } = vi.hoisted(() => ({ pendientes: vi.fn(), votar: vi.fn() }));

vi.mock('@/lib/api/marketplace.service', () => ({
  marketplaceApi: { pendientes, votar },
  paginaDe: (i: { slug?: string | null; id: string }) => `/i/${i.slug ?? i.id}`,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import { PreguntaDeLaRecomendacion } from './PreguntaDeLaRecomendacion';

const PREGUNTA = {
  contractId: 'contrato-1',
  momento: 'TRES_MESES',
  rol: 'INQUILINO',
  inmueble: 'Apto 302',
  inmobiliaria: { id: 'agencia-1', slug: 'nogal', nombre: 'Nogal Inmobiliaria', logoUrl: null },
};

let container: HTMLDivElement;
let root: Root;

async function montar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<PreguntaDeLaRecomendacion />);
  });
}

const $ = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T & HTMLElement>(sel);
const botonQueDice = (texto: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement | undefined;

function escribir(el: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
  setter.call(el, valor);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  pendientes.mockReset();
  votar.mockReset();
  try {
    window.localStorage.clear();
  } catch {
    // sin almacenamiento
  }
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('<PreguntaDeLaRecomendacion>', () => {
  it('sin pregunta pendiente no pinta nada', async () => {
    pendientes.mockResolvedValue([]);
    await montar();
    expect($('[data-testid="pregunta-de-la-recomendacion"]')).toBeNull();
  });

  it('pregunta por la inmobiliaria, con el momento y el inmueble', async () => {
    pendientes.mockResolvedValue([PREGUNTA]);
    await montar();
    const texto = container.textContent ?? '';
    expect(texto).toContain('¿Recomendarías a Nogal Inmobiliaria para arrendar?');
    expect(texto).toContain('Ya cumpliste 3 meses de contrato (Apto 302)');
    expect(botonQueDice('Enviar')!.disabled).toBe(true);
  });

  it('«Sí» con un comentario lo manda, y da las gracias con el enlace a su página', async () => {
    pendientes.mockResolvedValue([PREGUNTA]);
    votar.mockResolvedValue({ ok: true });
    await montar();

    await act(async () => botonQueDice('Sí')!.click());
    const comentario = $<HTMLTextAreaElement>('#comentario-de-la-recomendacion')!;
    await act(async () => escribir(comentario, '  Respondieron rápido  '));
    await act(async () => botonQueDice('Enviar')!.click());

    expect(votar).toHaveBeenCalledWith({ contractId: 'contrato-1', recomienda: true, comentario: 'Respondieron rápido' });
    expect(container.textContent).toContain('Gracias');
    expect($<HTMLAnchorElement>('a')!.getAttribute('href')).toBe('/i/nogal');
  });

  it('«No» sin comentario manda `null`', async () => {
    pendientes.mockResolvedValue([PREGUNTA]);
    votar.mockResolvedValue({ ok: true });
    await montar();

    await act(async () => botonQueDice('No')!.click());
    await act(async () => botonQueDice('Enviar')!.click());

    expect(votar).toHaveBeenCalledWith({ contractId: 'contrato-1', recomienda: false, comentario: null });
  });

  it('si no se pudo guardar, lo dice y no da las gracias', async () => {
    pendientes.mockResolvedValue([PREGUNTA]);
    votar.mockRejectedValue(new Error('Ya calificaste a esta inmobiliaria por este contrato.'));
    await montar();

    await act(async () => botonQueDice('Sí')!.click());
    await act(async () => botonQueDice('Enviar')!.click());

    expect(container.textContent).not.toContain('Gracias');
    expect(container.textContent).toContain('Ya calificaste a esta inmobiliaria por este contrato.');
  });

  it('«Ahora no» la esconde y no vuelve a salir en este navegador para ese momento', async () => {
    pendientes.mockResolvedValue([PREGUNTA]);
    await montar();
    await act(async () => botonQueDice('Ahora no')!.click());
    expect($('[data-testid="pregunta-de-la-recomendacion"]')).toBeNull();

    act(() => root.unmount());
    container.remove();
    await montar();
    expect($('[data-testid="pregunta-de-la-recomendacion"]')).toBeNull();

    // Al terminar el contrato es otro momento: vuelve a salir.
    act(() => root.unmount());
    container.remove();
    pendientes.mockResolvedValue([{ ...PREGUNTA, momento: 'FIN' }]);
    await montar();
    expect(container.textContent).toContain('Tu contrato terminó');
  });
});
