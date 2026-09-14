/**
 * La barra del inventario sin subir es lo ÚNICO que la persona ve de toda la
 * maquinaria offline. Si dice lo que no es —«subí» cuando no subió, o
 * «subir» cuando no hay señal— el trabajo se pierde y nadie se entera.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { BarraDeBorradorDeInventario } from './BarraDeBorradorDeInventario';
import type { AvanceDeSubida } from '@/lib/inventario/subir-borrador';

const base = {
  hayPendientes: true,
  actualizadoEn: new Date('2026-09-12T20:12:00Z').getTime(),
  fotosSinSubir: 0,
  senal: true as boolean | null,
  subiendo: false,
  avance: null as AvanceDeSubida | null,
  errorDeSubida: null as string | null,
  onSubir: () => {},
  onDescartar: () => {},
};

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function pintar(props: Partial<typeof base>) {
  act(() => {
    root.render(React.createElement(BarraDeBorradorDeInventario, { ...base, ...props }));
  });
}

const boton = (test: string) =>
  container.querySelector<HTMLButtonElement>(`[data-testid="${test}"]`);

describe('BarraDeBorradorDeInventario', () => {
  it('sin nada pendiente no se ve: con señal la subida es sola y nadie tiene que enterarse', () => {
    pintar({ hayPendientes: false });
    expect(container.querySelector('[data-testid="borrador-de-inventario"]')).toBeNull();
  });

  it('con un borrador dice de cuándo es y ofrece subirlo', () => {
    pintar({});
    expect(container.textContent).toContain('sin subir de este inmueble');
    expect(boton('borrador-subir')?.disabled).toBe(false);
  });

  it('sin señal el botón no engaña: queda apagado y lo explica', () => {
    pintar({ senal: false });
    expect(boton('borrador-subir')?.disabled).toBe(true);
    expect(container.textContent).toContain('apenas haya señal');
  });

  /**
   * Con la señal todavía sin medir el botón se deja tocar: el propio botón
   * vuelve a medirla antes de intentar, y apagarlo «por las dudas» dejaría a
   * alguien mirando un botón muerto teniendo señal de sobra.
   */
  it('con la señal todavía sin medir, el botón se deja tocar', () => {
    pintar({ senal: null });
    expect(boton('borrador-subir')?.disabled).toBe(false);
  });

  it('subiendo cuenta las fotos y esconde los botones', () => {
    pintar({ subiendo: true, avance: { fotosSubidas: 2, fotosTotales: 5 } });
    expect(container.textContent).toContain('2 de 5 fotos');
    expect(boton('borrador-subir')).toBeNull();
    expect(boton('borrador-descartar')).toBeNull();
  });

  it('cuenta las fotos que faltan por subir', () => {
    pintar({ fotosSinSubir: 3 });
    expect(container.textContent).toContain('Faltan 3 fotos');
    pintar({ fotosSinSubir: 1 });
    expect(container.textContent).toContain('Falta 1 foto');
  });

  it('un fallo de subida se dice, no se esconde', () => {
    pintar({ errorDeSubida: 'La foto no puede pesar más de 5 MB.' });
    expect(container.textContent).toContain('La foto no puede pesar más de 5 MB.');
  });

  it('los dos botones llaman a lo suyo', () => {
    const onSubir = vi.fn();
    const onDescartar = vi.fn();
    pintar({ onSubir, onDescartar });
    act(() => {
      boton('borrador-subir')?.click();
      boton('borrador-descartar')?.click();
    });
    expect(onSubir).toHaveBeenCalledTimes(1);
    expect(onDescartar).toHaveBeenCalledTimes(1);
  });
});
