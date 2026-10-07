/**
 * T-0141 — publicar un inmueble por cuenta propia es idempotente.
 *
 * Una sola clave `Idempotency-Key` por sesión de publicación, reutilizada en
 * cada reintento, y un inmueble ya creado nunca se vuelve a crear.
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

function Panel() {
  const { updateDraft, submitProperty, addPhotoFiles, submissionError, resetDraft } = usePublish();
  return (
    <>
      <button
        data-testid="llenar"
        onClick={() => {
          updateDraft({
            title: 'Apartamento',
            description: 'Uno',
            city: 'Caldas',
            neighborhood: 'La Inmaculada',
            address: 'CR 50 CL 138 SUR -22',
            latitude: 6.2442,
            longitude: -75.5812,
          });
          addPhotoFiles([new File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
        }}
      />
      <button data-testid="publicar" onClick={() => void submitProperty()} />
      <button data-testid="reiniciar" onClick={() => resetDraft()} />
      <p data-testid="error">{submissionError ?? ''}</p>
    </>
  );
}

let container: HTMLDivElement;
let root: Root | null = null;

const click = async (id: string) => {
  await act(async () => {
    (container.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
  });
};

const llave = (n: number): string | undefined => crear.mock.calls[n]?.[1]?.idempotencyKey;

beforeEach(async () => {
  ubicarDireccion.mockReset().mockResolvedValue({ lat: 6.0918, lng: -75.6356, precision: 'municipio' });
  crear.mockReset().mockResolvedValue({ id: 'prop-1' });
  subirImagen.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <PublishProvider>
        <Panel />
      </PublishProvider>,
    );
  });
  await click('llenar');
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('PublishContext — Idempotency-Key (T-0141)', () => {
  it('envía una clave UUID v4 con POST /properties', async () => {
    await click('publicar');

    expect(llave(0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('reintenta con la MISMA clave si crear falló', async () => {
    crear.mockRejectedValueOnce(new Error('sin red')).mockResolvedValueOnce({ id: 'prop-1' });

    await click('publicar');
    await click('publicar');

    expect(crear).toHaveBeenCalledTimes(2);
    expect(llave(0)).toBe(llave(1));
  });

  it('empezar de nuevo (resetDraft) genera una clave nueva', async () => {
    await click('publicar');
    const primera = llave(0);

    await click('reiniciar');
    await click('llenar');
    await click('publicar');

    expect(crear).toHaveBeenCalledTimes(2);
    expect(llave(1)).not.toBe(primera);
  });
});
