/**
 * Revisora r25: «Por decidir» no le habla de «tu inmobiliaria» al propietario
 * independiente, y el vacío no deja una raya colgando a 390.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/components/landlord/portal/LoQueEsperaTuRespuesta', () => ({
  LoQueEsperaTuRespuesta: () => <div data-testid="lista-por-decidir" />,
  usePendientesDelPropietarioConEstado: () => ({ pendientes: [], cargando: false }),
}));

import { PropietarioDeInmobiliariaProvider } from '@/lib/context/PropietarioDeInmobiliariaContext';
import PorDecidirPage from './page';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Por decidir', () => {
  it('con inmobiliaria, dice que es lo que ella le pregunta', () => {
    act(() =>
      root.render(
        <PropietarioDeInmobiliariaProvider value>
          <PorDecidirPage />
        </PropietarioDeInmobiliariaProvider>,
      ),
    );
    expect(host.textContent).toContain('Lo que tu inmobiliaria te pregunta. Cada fila te lleva a decidirlo.');
    expect(host.querySelector('[data-testid="por-decidir-vacio"]')?.textContent).toContain('las preguntas de tu inmobiliaria');
  });

  it('al independiente no le nombra una inmobiliaria que no tiene', () => {
    act(() => root.render(<PorDecidirPage />));
    const texto = host.textContent ?? '';
    expect(texto).not.toContain('inmobiliaria');
    expect(texto).toContain('Lo que espera tu respuesta sobre tus inmuebles.');
    expect(host.querySelector('[data-testid="por-decidir-vacio"]')?.textContent).not.toContain('—');
  });
});
