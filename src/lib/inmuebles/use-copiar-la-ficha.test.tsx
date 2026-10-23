/**
 * «Copiar ficha» desde el menú de Inmuebles (Nico, 22-10-2026): copia el
 * texto de la ficha del marketplace; si el inmueble no se ve, no copia y lo
 * dice (con «Publicarlo» si no está publicado).
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/idioma/use-idioma', () => ({ useIdioma: () => 'es' }));
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: { getById: vi.fn() } }));
vi.mock('@/lib/api/marketplace-del-portafolio.service', () => ({ marketplaceDelPortafolioApi: { uno: vi.fn() } }));

import { toast } from '@/components/ui/toast';
import { propertiesApi } from '@/lib/api/properties.service';
import { marketplaceDelPortafolioApi } from '@/lib/api/marketplace-del-portafolio.service';
import { useCopiarLaFicha } from './use-copiar-la-ficha';

const getById = propertiesApi.getById as unknown as ReturnType<typeof vi.fn>;
const uno = marketplaceDelPortafolioApi.uno as unknown as ReturnType<typeof vi.fn>;
const t = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

const INMUEBLE = {
  title: 'Apartamento En Primitiva',
  listingType: 'rent',
  monthlyRent: 1_700_000,
  city: 'LA ESTRELLA',
  neighborhood: 'PRIMITIVA',
  area: 58,
  bedrooms: 2,
  bathrooms: 2,
  parkingSpaces: 0,
};

function marketplace(over: Record<string, unknown> = {}) {
  return {
    disponible: true,
    inmueble: { id: 'p1', publicado: true, seVe: true, porQueNoSeVe: null, ...over },
  };
}

let root: Root;
let container: HTMLDivElement;
let copiar: (id: string) => Promise<void>;
const publicar = vi.fn();
const writeText = vi.fn();

function Sonda() {
  copiar = useCopiarLaFicha(publicar);
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  container = document.createElement('div');
  root = createRoot(container);
  act(() => root.render(<Sonda />));
});

afterEach(() => act(() => root.unmount()));

describe('useCopiarLaFicha', () => {
  it('copia la ficha estilo Portofino con el enlace del marketplace al final', async () => {
    getById.mockResolvedValue(INMUEBLE);
    uno.mockResolvedValue(marketplace());
    await act(async () => copiar('p1'));
    const texto = writeText.mock.calls[0][0] as string;
    expect(texto).toContain('APARTAMENTO EN PRIMITIVA');
    expect(texto).toContain('Precio: $');
    expect(texto).toContain('1.700.000 / mes');
    expect(texto).toContain('58 m²');
    expect(texto).toContain('2 habitaciones');
    expect(texto).toContain('2 baños');
    // «0 garajes» no sale: un dato en cero no se escribe.
    expect(texto).not.toContain('0 parqueaderos');
    expect(texto).toMatch(/Conoce más detalles aquí:\n.*\/propiedades\/p1$/);
    expect(t.success).toHaveBeenCalledWith('Copiamos la ficha del inmueble', expect.anything());
  });

  it('🔴 sin publicar no copia un enlace que el cliente no puede abrir, y ofrece «Publicarlo»', async () => {
    getById.mockResolvedValue(INMUEBLE);
    uno.mockResolvedValue(marketplace({ publicado: false, seVe: false }));
    await act(async () => copiar('p1'));
    expect(writeText).not.toHaveBeenCalled();
    expect(t.success).not.toHaveBeenCalled();
    const [titulo, opciones] = t.error.mock.calls[0];
    expect(titulo).toBe('Este inmueble no se ve en el marketplace');
    expect(opciones.action.label).toBe('Publicarlo');
    opciones.action.onClick();
    expect(publicar).toHaveBeenCalledWith(['p1']);
  });

  it('publicado pero que no se ve (arrendado, sin fotos…) dice por qué, sin «Publicarlo»', async () => {
    getById.mockResolvedValue(INMUEBLE);
    uno.mockResolvedValue(marketplace({ seVe: false, porQueNoSeVe: 'Está arrendado: no sale en el marketplace.' }));
    await act(async () => copiar('p1'));
    expect(writeText).not.toHaveBeenCalled();
    const [, opciones] = t.error.mock.calls[0];
    expect(opciones.description).toContain('Está arrendado');
    expect(opciones.action).toBeUndefined();
  });

  it('sin la ruta del marketplace copia igual (no se sabe que no se vea)', async () => {
    getById.mockResolvedValue(INMUEBLE);
    uno.mockRejectedValue(new Error('404'));
    await act(async () => copiar('p1'));
    expect(writeText).toHaveBeenCalled();
    expect(t.success).toHaveBeenCalled();
  });

  it('si el inmueble no se puede leer, lo dice y no copia nada', async () => {
    getById.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));
    uno.mockResolvedValue(marketplace());
    await act(async () => copiar('p1'));
    expect(writeText).not.toHaveBeenCalled();
    expect(t.error.mock.calls[0][0]).toBe('No pudimos armar la ficha');
  });
});
