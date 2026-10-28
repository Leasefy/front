/**
 * @vitest-environment happy-dom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ComisionCompartida as Comision } from '@/lib/api/comisiones-compartidas.service';

const api = vi.hoisted(() => ({
  listar: vi.fn(),
  colegas: vi.fn(async () => ({ colegas: [] })),
  proponer: vi.fn(),
  editar: vi.fn(),
  responder: vi.fn(async () => ({ id: 'c1', estado: 'aceptada' })),
  retirar: vi.fn(),
}));
vi.mock('@/lib/api/comisiones-compartidas.service', () => ({ comisionesCompartidasApi: api }));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({ consignaciones: [] }),
  useInmueblesSinConsignacion: () => ({ inmuebles: [] }),
}));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

import { ComisionCompartida } from './ComisionCompartida';

const comision = (o: Partial<Comision>): Comision => ({
  id: 'c1',
  lado: 'trae',
  estado: 'propuesta',
  porcentajeCapta: 60,
  tuParte: 40,
  suParte: 60,
  nota: null,
  motivo: null,
  acciones: ['aceptar', 'rechazar'],
  creadaEn: '2026-10-28T15:00:00Z',
  editadaEn: null,
  respondidaEn: null,
  retiradaEn: null,
  quienPropone: 'Ana Gómez',
  quienResponde: null,
  inmueble: { id: 'p1', titulo: 'Apartamento en Laureles', barrio: 'Laureles', ciudad: 'Medellín', canon: 2_500_000, venta: null, foto: null, disponible: true, codigo: null },
  otra: { id: 'a2', nombre: 'Inmobiliaria Nogal', logo: null, ciudad: 'Medellín' },
  ...o,
});

let raiz: Root | null = null;
let caja: HTMLDivElement | null = null;
async function montar() {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  await act(async () => {
    raiz!.render(<ComisionCompartida />);
  });
  for (let i = 0; i < 3; i++) await act(async () => {});
}
afterEach(() => {
  act(() => raiz?.unmount());
  caja?.remove();
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
const por = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

describe('Comisión compartida en pantalla', () => {
  it('sin ninguna todavía: explica los tres pasos con su 3D y que Leasefy no cobra', async () => {
    api.listar.mockResolvedValue({ disponible: true, migracion: null, comisiones: [] });
    await montar();
    const como = por('comision-como-funciona');
    expect(como?.textContent).toContain('Propones el reparto');
    expect(como?.textContent).toContain('Leasefy no cobra nada');
  });

  it('sin la migración lo dice y no ofrece proponer', async () => {
    api.listar.mockResolvedValue({ disponible: false, migracion: 'x', comisiones: [] });
    await montar();
    expect(document.body.textContent).toContain('todavía no está activa');
    expect(por('proponer-comision')).toBeNull();
  });

  it('🔴 la que te propusieron sale «Por responder» con TU parte primero, y se acepta desde la tarjeta', async () => {
    api.listar.mockResolvedValue({ disponible: true, migracion: null, comisiones: [comision({})] });
    await montar();
    const tarjeta = por('comision-c1');
    expect(tarjeta?.textContent).toContain('Por responder');
    expect(tarjeta?.textContent).toContain('Tú 40 %');
    expect(tarjeta?.textContent).toContain('Inmobiliaria Nogal 60 %');
    await act(async () => por('aceptar-c1')!.click());
    expect(api.responder).toHaveBeenCalledWith('c1', { acepta: true });
  });

  it('la constancia dice quién propuso y, aceptada, deja mandarla en una colección', async () => {
    api.listar.mockResolvedValue({
      disponible: true,
      migracion: null,
      comisiones: [comision({ estado: 'aceptada', acciones: [], respondidaEn: '2026-10-28T16:00:00Z', quienResponde: 'Luis Pérez' })],
    });
    await montar();
    await act(async () => (por('comision-c1')!.querySelector('button') as HTMLButtonElement).click());
    for (let i = 0; i < 2; i++) await act(async () => {});
    const hitos = por('hitos-de-la-comision');
    expect(hitos?.textContent).toContain('Inmobiliaria Nogal propuso 60 / 40');
    expect(hitos?.textContent).toContain('La aceptaste');
    expect(por('ya-la-puedes-mostrar')?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/pipeline/colecciones?nueva=1&inmueble=p1');
  });
});
