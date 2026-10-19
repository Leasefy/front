/**
 * `leasefy.co/i/<nombre>` (Nico, 09-10-2026): la cabecera con lo que se sabe
 * de verdad (sello, seguidores, recomendación), su chat, lo que dicen de ella,
 * sus videos y sus inmuebles; y un nombre que no existe no rompe nada.
 */
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { pagina, visto, sesion, inmuebles } = vi.hoisted(() => ({
  pagina: vi.fn(),
  visto: vi.fn(),
  sesion: { autenticado: false },
  inmuebles: { lista: [] as Array<{ id: string; title: string; latitude?: number; longitude?: number; neighborhood?: string }> },
}));

vi.mock('@/lib/api/marketplace.service', () => ({
  marketplaceApi: { pagina, visto },
  paginaDe: (i: { slug?: string | null; id: string }) => `/i/${i.slug ?? i.id}`,
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ isAuthenticated: sesion.autenticado }) }));
vi.mock('@/lib/hooks/useProperties', () => ({
  useProperties: () => ({ properties: inmuebles.lista, meta: { total: inmuebles.lista.length }, isLoading: false }),
}));
vi.mock('@/lib/marketplace/use-inmobiliarias', () => ({
  useSeguir: (_id: string, seguidores: number) => ({
    siguiendo: false,
    seguidores,
    cambiar: vi.fn(),
    ocupado: false,
    error: null,
    conCuenta: sesion.autenticado,
    pideCuenta: false,
    setPideCuenta: vi.fn(),
  }),
  useAqui: () => '/i/nogal',
}));
vi.mock('./ChatDeLaInmobiliaria', () => ({
  ChatDeLaInmobiliaria: ({ inmobiliaria }: { inmobiliaria: { nombre: string } }) => (
    <div data-testid="chat-de-la-inmobiliaria">{inmobiliaria.nombre}</div>
  ),
}));
vi.mock('@/components/property/PropertyCard', () => ({
  PropertyCard: ({ property }: { property: { title: string } }) => <article data-testid="tarjeta">{property.title}</article>,
}));
vi.mock('@/components/agentes/OrbeDeAgente', () => ({ OrbeDeAgente: () => <span /> }));
// MapLibre no corre aquí: el mapa dice qué pines recibió y deja tocar uno.
vi.mock('@/components/map', () => ({
  PropertyMap: ({ properties, onPropertySelect }: { properties: Array<{ id: string }>; onPropertySelect?: (id: string) => void }) => (
    <div data-testid="mapa" data-pines={properties.map((p) => p.id).join(',')}>
      {properties.map((p) => (
        <button key={p.id} type="button" data-pin={p.id} onClick={() => onPropertySelect?.(p.id)} />
      ))}
    </div>
  ),
}));
const { atras, ir } = vi.hoisted(() => ({ atras: vi.fn(), ir: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: atras, push: ir }) }));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span data-imagen={p.alt} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import { ApiError } from '@/lib/api/client';
import { muestrasDeLasOpiniones, PaginaDeLaInmobiliaria } from './PaginaDeLaInmobiliaria';

const NOGAL = {
  id: 'agencia-1',
  slug: 'nogal',
  nombre: 'Nogal Inmobiliaria',
  logoUrl: null,
  color: '#0B6E4F',
  portadaUrl: null,
  lema: 'Arriendos en Laureles desde 1998',
  ciudad: 'Medellín',
  zonas: ['Laureles', 'Belén'],
  verificada: true,
  inmuebles: 2,
  seguidores: 37,
  recomendacion: { votos: 8, si: 6, porcentaje: 75, inquilinos: { si: 4, no: 1 }, propietarios: { si: 2, no: 1 } },
  redes: { instagram: 'https://www.instagram.com/nogal', tiktok: null, youtube: null, facebook: null },
  whatsapp: '573001234567',
  opiniones: [
    { id: 'o1', nombre: 'Laura', rol: 'INQUILINO', recomienda: true, comentario: 'Respondieron rápido.', fecha: '2026-09-01' },
  ],
  videos: [],
};

let container: HTMLDivElement;
let root: Root;

async function montar(nombre = 'nogal') {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<PaginaDeLaInmobiliaria nombre={nombre} />);
  });
}

beforeEach(() => {
  pagina.mockReset();
  visto.mockReset().mockResolvedValue({});
  sesion.autenticado = false;
  inmuebles.lista = [
    { id: 'p1', title: 'Apto en Laureles' },
    { id: 'p2', title: 'Casa en Belén' },
  ];
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('<PaginaDeLaInmobiliaria>', () => {
  it('pinta la cabecera, su chat, lo que dicen de ella y sus inmuebles', async () => {
    pagina.mockResolvedValue(NOGAL);
    await montar();

    expect(pagina).toHaveBeenCalledWith('nogal');
    const texto = container.textContent ?? '';
    expect(container.querySelector('[data-testid="nombre-de-la-inmobiliaria"]')!.textContent).toContain('Nogal Inmobiliaria');
    expect(texto).toContain('leasefy.co/i/nogal');
    expect(texto).toContain('Arriendos en Laureles desde 1998');
    expect(container.querySelector('[data-testid="seguidores"]')!.textContent).toContain('37');
    expect(texto).toContain('Laureles · Belén');
    expect(texto).toContain('Pregúntale a Nogal Inmobiliaria');
    expect(container.querySelector('[data-testid="chat-de-la-inmobiliaria"]')).not.toBeNull();
    expect(texto).toContain('Respondieron rápido.');
    expect(container.querySelectorAll('[data-testid="tarjeta"]')).toHaveLength(2);
    // Sin videos, esa sección no se pinta (nada inventado).
    expect(texto).not.toContain('Sus videos');
    // ARCO-1 (Nico 19-10-2026): su formulario de Habeas Data, por su nombre corto.
    expect(container.querySelector('[data-testid="enlace-habeas-data"]')!.getAttribute('href')).toBe('/arco/nogal');
  });

  describe('lo que dicen de ella (Nico, 16-10-2026: dos muestras y el resto si se quiere)', () => {
    const op = (id: string, recomienda: boolean, fecha: string) => ({
      id,
      nombre: id,
      rol: 'INQUILINO',
      recomienda,
      comentario: `Opinión ${id}.`,
      fecha,
    });
    const CUATRO = [op('a', true, '2026-09-20'), op('b', false, '2026-09-10'), op('c', true, '2026-08-30'), op('d', true, '2026-08-01')];
    const tarjetas = () => [...container.querySelectorAll('[data-testid="opinion"]')].map((t) => t.textContent ?? '');

    it('muestra una que la recomienda y una que no, y «Ver las 4 opiniones» las abre TODAS en un cajón', async () => {
      pagina.mockResolvedValue({ ...NOGAL, opiniones: CUATRO });
      await montar();
      expect(tarjetas()).toHaveLength(2);
      expect(tarjetas()[0]).toContain('Opinión a.');
      expect(tarjetas()[1]).toContain('Opinión b.');
      expect(tarjetas()[1]).toContain('No la recomienda');

      const boton = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Ver las 4 opiniones')!;
      await act(async () => {
        boton.click();
      });
      // En la página siguen las dos: el cajón no empuja nada.
      expect(tarjetas()).toHaveLength(2);
      const cajon = document.body.querySelector('[role="dialog"]')!;
      expect(cajon.textContent).toContain('Lo que dicen de Nogal Inmobiliaria');
      expect(cajon.querySelectorAll('[data-testid="opinion"]')).toHaveLength(4);
    });

    it('sin ninguna en contra, las dos más nuevas', () => {
      const tres = [op('a', true, '2026-09-20'), op('c', true, '2026-08-30'), op('d', true, '2026-08-01')];
      expect(muestrasDeLasOpiniones(tres).map((o) => o.id)).toEqual(['a', 'c']);
    });

    it('con dos o menos no ofrece «Ver las…»', async () => {
      pagina.mockResolvedValue({ ...NOGAL, opiniones: CUATRO.slice(0, 2) });
      await montar();
      expect(tarjetas()).toHaveLength(2);
      expect(container.textContent).not.toContain('Ver las');
    });
  });

  describe('debajo del chat, dónde están sus inmuebles (Nico, 16-10-2026)', () => {
    it('pone en el mapa sólo los que tienen ubicación, con sus barrios', async () => {
      inmuebles.lista = [
        { id: 'p1', title: 'Apto en Laureles', latitude: 6.245, longitude: -75.59, neighborhood: 'Laureles' },
        { id: 'p2', title: 'Casa en Belén' },
      ];
      pagina.mockResolvedValue(NOGAL);
      await montar();
      // El mapa se carga aparte (sólo en el navegador).
      await vi.waitFor(() => expect(container.querySelector('[data-testid="mapa"]')).not.toBeNull());
      const seccion = container.querySelector('[data-testid="mapa-de-sus-inmuebles"]')!;
      expect(seccion.textContent).toContain('Dónde están sus inmuebles');
      expect(seccion.textContent).toContain('Laureles');
      expect(seccion.querySelector('[data-testid="mapa"]')?.getAttribute('data-pines')).toBe('p1');
    });

    it('tocar un precio marca su tarjeta en «Sus inmuebles»', async () => {
      inmuebles.lista = [{ id: 'p1', title: 'Apto en Laureles', latitude: 6.245, longitude: -75.59, neighborhood: 'Laureles' }];
      pagina.mockResolvedValue(NOGAL);
      await montar();
      // El mapa se carga aparte (sólo en el navegador).
      await vi.waitFor(() => expect(container.querySelector('[data-testid="mapa"]')).not.toBeNull());
      const tarjeta = container.querySelector('#inmueble-p1') as HTMLElement;
      tarjeta.scrollIntoView = vi.fn();
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[data-pin="p1"]')!.click();
      });
      expect(tarjeta.scrollIntoView).toHaveBeenCalled();
      expect(tarjeta.className).toContain('ring-primary');
    });

    it('un precio cuya tarjeta no está en la página abre su ficha', async () => {
      inmuebles.lista = Array.from({ length: 10 }, (_, k) => ({ id: `p${k}`, title: `Inmueble ${k}`, latitude: 6.245, longitude: -75.59 }));
      pagina.mockResolvedValue(NOGAL);
      await montar();
      await vi.waitFor(() => expect(container.querySelector('[data-testid="mapa"]')).not.toBeNull());
      ir.mockReset();
      await act(async () => {
        container.querySelector<HTMLButtonElement>('[data-pin="p9"]')!.click();
      });
      expect(ir).toHaveBeenCalledWith('/propiedades/p9');
    });

    it('«Sus inmuebles» ya no ofrece «Ver los N con mapa»; con más de 9, «Ver los N» va debajo', async () => {
      pagina.mockResolvedValue(NOGAL);
      await montar();
      expect(container.textContent).not.toContain('con mapa');
      expect(container.textContent).not.toContain('Ver los 2 inmuebles');

      act(() => root.unmount());
      container.remove();
      inmuebles.lista = Array.from({ length: 10 }, (_, k) => ({ id: `p${k}`, title: `Inmueble ${k}` }));
      await montar();
      expect(container.querySelectorAll('[data-testid="tarjeta"]')).toHaveLength(9);
      const todos = [...container.querySelectorAll('a')].find((a) => a.textContent?.includes('Ver los 10 inmuebles de Nogal Inmobiliaria'));
      expect(todos?.getAttribute('href')).toContain('/propiedades?');
    });

    it('sin ninguno ubicado no hay mapa', async () => {
      pagina.mockResolvedValue(NOGAL);
      await montar();
      expect(container.querySelector('[data-testid="mapa-de-sus-inmuebles"]')).toBeNull();
    });
  });

  it('«Volver» regresa a donde estaba; llegando directo, lleva al buscador', async () => {
    pagina.mockResolvedValue(NOGAL);
    await montar();
    const volver = container.querySelector<HTMLAnchorElement>('[data-testid="volver"]')!;
    expect(volver.getAttribute('href')).toBe('/propiedades');
    // happy-dom arranca con una sola entrada: llegó directo.
    if (window.history.length <= 1) expect(volver.textContent).toContain('Ir al buscador');
    window.history.pushState({}, '', '/i/nogal');
    act(() => root.unmount());
    container.remove();
    await montar();
    const conHistoria = container.querySelector<HTMLAnchorElement>('[data-testid="volver"]')!;
    expect(conHistoria.textContent).toContain('Volver');
    act(() => conHistoria.click());
    expect(atras).toHaveBeenCalled();
  });

  it('sin sesión no marca «visto»; con sesión, sí', async () => {
    pagina.mockResolvedValue(NOGAL);
    await montar();
    expect(visto).not.toHaveBeenCalled();

    act(() => root.unmount());
    container.remove();
    sesion.autenticado = true;
    await montar();
    expect(visto).toHaveBeenCalledWith('agencia-1');
  });

  it('sin inmuebles publicados lo dice e invita a seguirla', async () => {
    pagina.mockResolvedValue({ ...NOGAL, inmuebles: 0 });
    inmuebles.lista = [];
    await montar();
    expect(container.textContent).toContain('no tiene inmuebles publicados ahora');
  });

  it('un nombre que no existe (404) dice «No encontramos esa inmobiliaria» y lleva al buscador', async () => {
    pagina.mockRejectedValue(new ApiError(404, 'No existe'));
    await montar('no-existe');
    const vacio = container.querySelector('[data-testid="inmobiliaria-no-existe"]')!;
    expect(vacio.textContent).toContain('No encontramos esa inmobiliaria');
    expect(vacio.querySelector('a')!.getAttribute('href')).toBe('/propiedades');
  });

  it('otro error no se disfraza de «no existe»', async () => {
    pagina.mockRejectedValue(new ApiError(500, 'boom'));
    await montar();
    expect(container.textContent).toContain('No pudimos abrir esta página');
  });
});
