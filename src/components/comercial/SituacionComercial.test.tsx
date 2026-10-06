/**
 * La línea de la lista de Inmuebles (COMERCIAL, Nico 04-10-2026): «Vacante hace
 * 42 días» (en ámbar si pasa de 30) y el mandato que se vence.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { SituacionComercialCorta } from './SituacionComercial';

let contenedor: HTMLDivElement;
let raiz: Root;
beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});
afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('SituacionComercialCorta', () => {
  it('vacante hace 42 días (larga) y mandato vencido', async () => {
    await act(async () => {
      raiz.render(
        <SituacionComercialCorta
          datos={{
            consignacionId: 'm1',
            agenteUserId: null,
            vacancia: { vacante: true, desde: '2026-08-23', dias: 42, fuente: 'FIN_DEL_CONTRATO' },
            mandato: { estado: 'VENCIDO', vence: '2026-10-01', dias: -3 },
          }}
        />,
      );
    });
    const dias = contenedor.querySelector('[data-testid="dias-vacante"]')!;
    expect(dias.textContent).toBe('Vacante hace 42 días');
    expect(dias.className).toContain('text-warning');
    expect(contenedor.querySelector('[data-testid="mandato-se-vence"]')?.textContent).toBe('Mandato vencido hace 3 días');
  });

  it('un mandato vigente lejos del vencimiento y sin vacancia no pinta nada', async () => {
    await act(async () => {
      raiz.render(
        <SituacionComercialCorta
          datos={{
            consignacionId: 'm1',
            agenteUserId: null,
            vacancia: { vacante: false, desde: null, dias: null, fuente: null },
            mandato: { estado: 'VIGENTE', vence: '2027-06-01', dias: 240 },
          }}
        />,
      );
    });
    expect(contenedor.querySelector('[data-testid="situacion-comercial"]')).toBeNull();
  });
});
