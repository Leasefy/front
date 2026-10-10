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
  inmuebles: { lista: [] as Array<{ id: string; title: string }> },
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
const { atras } = vi.hoisted(() => ({ atras: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: atras, push: vi.fn() }) }));
vi.mock('next/image', () => ({ default: (p: { alt: string }) => <span data-imagen={p.alt} /> }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

import { ApiError } from '@/lib/api/client';
import { PaginaDeLaInmobiliaria } from './PaginaDeLaInmobiliaria';

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
