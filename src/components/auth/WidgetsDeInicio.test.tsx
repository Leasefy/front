/**
 * @vitest-environment happy-dom
 *
 * Los widgets del inicio de sesión: la hora de Colombia y tres widgets vivos que llevan a algún lado (Nico 29-10-2026:
 * «uno que sea widget de blogs que vaya pasando entre blogs, otro de noticias sobre proptech, otro sobre novedades de
 * nosotros […] si doy clic que me lleven a algún lado»). 🔴 La pantalla es pública: nada que parezca de una
 * inmobiliaria («deben de ser widgets de cosas que no muestren información que está dentro de la inmobiliaria»).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (p: Record<string, unknown>) => <img src={String(p.src)} alt="" />,
}));

import { WidgetsDeInicio } from './WidgetsDeInicio';

const DATOS = {
  blog: [
    { titulo: 'Qué verificar antes de firmar un contrato de arriendo', categoria: 'Contratos', fecha: 'Dic 22, 2025', imagen: 'https://images.pexels.com/a.jpeg', href: '/blog/verificar-contrato-arriendo' },
    { titulo: 'Cómo preparar tu apartamento para arrendar', categoria: 'Propietarios', fecha: 'Oct 3, 2025', imagen: 'https://images.pexels.com/b.jpeg', href: '/blog/preparar-apartamento-arriendo' },
  ],
  noticias: [
    { titulo: 'PropTech invisible: las soluciones que no se ven', medio: 'Forbes Centroamérica', url: 'https://news.google.com/rss/articles/abc', fecha: '2026-10-29T08:51:00.000Z' },
  ],
};

let caja: HTMLDivElement;
let raiz: Root;

async function pintar(respuesta: unknown, ok = true) {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok, json: async () => respuesta }) as unknown as typeof fetch;
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => raiz.render(<WidgetsDeInicio />));
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
  vi.useRealTimers();
});

const q = (id: string) => caja.querySelector<HTMLAnchorElement>(`[data-testid="${id}"]`);

describe('WidgetsDeInicio', () => {
  it('la hora de Colombia y los tres widgets, cada uno con su enlace en otra pestaña', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T11:51:00.000Z')); // 6:51 a. m. en Bogotá
    await pintar(DATOS);
    expect(caja.textContent).toMatch(/6:51/);
    expect(caja.textContent).toContain('Colombia');

    expect(q('widget-blog')!.getAttribute('href')).toBe('/blog/verificar-contrato-arriendo');
    expect(q('widget-blog')!.textContent).toContain('Qué verificar antes de firmar');
    expect(q('widget-noticias')!.getAttribute('href')).toBe('https://news.google.com/rss/articles/abc');
    expect(q('widget-noticias')!.textContent).toContain('Forbes Centroamérica');
    expect(q('widget-noticias')!.textContent).toContain('hace 3 h');
    expect(q('widget-novedades')!.getAttribute('href')).toMatch(/^\/productos\//);
    for (const id of ['widget-blog', 'widget-noticias', 'widget-novedades']) {
      expect(q(id)!.getAttribute('target')).toBe('_blank');
      expect(q(id)!.getAttribute('rel')).toContain('noopener');
    }
  });

  it('sin noticias (Google no respondió), el widget lleva a la búsqueda: no se inventa un titular', async () => {
    await pintar({ ...DATOS, noticias: [] });
    expect(q('widget-noticias')!.getAttribute('href')).toContain('news.google.com/search?q=proptech');
    expect(q('widget-noticias')!.textContent).toContain('Google Noticias');
  });

  it('🔴 nada que parezca de una inmobiliaria: ni plata, ni recaudo, ni inquilinos, ni contratos firmados, ni visitas', async () => {
    await pintar(DATOS);
    const texto = caja.textContent ?? '';
    expect(texto).not.toMatch(/\$|recaudo|pagos|inquilinos|firmados|visita|Cl \d|# \d|ejemplo/i);
  });
});
