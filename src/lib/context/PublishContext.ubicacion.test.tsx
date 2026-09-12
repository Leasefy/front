/**
 * El inmueble que publica un propietario por su cuenta también se ubica.
 *
 * 🔴 2026-09-12. Es el mismo defecto del panel, en la otra puerta: lo único
 * que había acá era la tabla de 32 ciudades, y por eso 1.442 inmuebles del
 * portafolio migrado quedaron sin punto — Caldas, La Estrella y Amagá no
 * están en la lista, y no hay lista que cubra los 1.103 municipios del país.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { ubicarDireccion, crear, subirImagen } = vi.hoisted(() => ({
  ubicarDireccion: vi.fn(),
  crear: vi.fn(),
  subirImagen: vi.fn(),
}));

vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({ ubicarDireccion }));
vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: { create: crear, uploadImage: subirImagen },
}));

import { PublishProvider, usePublish } from './PublishContext';

/**
 * Rellena el borrador y publica, sin pasar por las 10 pantallas. Son DOS
 * botones a propósito: `submitProperty` se rearma con el borrador, así que
 * llenarlo y publicar en el mismo clic publicaría el borrador vacío. En la
 * pantalla real eso no pasa —la persona llena en un paso y publica en otro—
 * pero acá hay que respetarlo.
 */
function Publicar({ conCoordenadas }: { conCoordenadas: boolean }) {
  const { updateDraft, submitProperty } = usePublish();
  return (
    <>
      <button
        data-testid="llenar"
        onClick={() =>
          updateDraft({
            title: 'Apartamento',
            description: 'Uno',
            city: 'Caldas',
            neighborhood: 'La Inmaculada',
            address: 'CR 50 CL 138 SUR -22',
            ...(conCoordenadas ? { latitude: 6.2442, longitude: -75.5812 } : {}),
          })
        }
      />
      <button data-testid="publicar" onClick={() => void submitProperty()} />
    </>
  );
}

let container: HTMLDivElement;
let root: Root | null = null;

async function publicar(conCoordenadas = false) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <PublishProvider>
        <Publicar conCoordenadas={conCoordenadas} />
      </PublishProvider>,
    );
  });
  await act(async () => {
    (container.querySelector('[data-testid="llenar"]') as HTMLButtonElement).click();
  });
  await act(async () => {
    (container.querySelector('[data-testid="publicar"]') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  ubicarDireccion.mockReset().mockResolvedValue({ lat: 6.0918, lng: -75.6356, precision: 'municipio' });
  crear.mockReset().mockResolvedValue({ id: 'prop-1' });
  subirImagen.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('PublishContext — la ubicación al publicar', () => {
  it('🔴 un municipio que ninguna tabla conoce igual queda ubicado', async () => {
    ubicarDireccion.mockResolvedValue({ lat: 6.0917, lng: -75.6363, precision: 'direccion' });

    await publicar();

    expect(ubicarDireccion).toHaveBeenCalledWith({
      direccion: 'CR 50 CL 138 SUR -22',
      ciudad: 'Caldas',
    });
    expect(crear.mock.calls[0][0].latitude).toBe(6.0917);
    expect(crear.mock.calls[0][0].longitude).toBe(-75.6363);
  });

  /* Lo que la persona eligió en el buscador manda: no se vuelve a buscar. */
  it('con coordenadas elegidas NO se busca de nuevo', async () => {
    await publicar(true);

    expect(ubicarDireccion).not.toHaveBeenCalled();
    expect(crear.mock.calls[0][0].latitude).toBe(6.2442);
  });

  it('sin poder ubicarla se publica igual, sin coordenadas inventadas', async () => {
    ubicarDireccion.mockResolvedValue({ precision: 'ninguna' });

    await publicar();

    expect(crear).toHaveBeenCalledTimes(1);
    expect(crear.mock.calls[0][0].latitude).toBeUndefined();
  });
});
