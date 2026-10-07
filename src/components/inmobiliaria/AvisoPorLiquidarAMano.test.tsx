/**
 * N-19 (QA-CONT-95 r3): la corrida aparta el inmueble «por liquidar a mano» y
 * la pantalla lo dice en voz alta, con el inmueble y el motivo.
 */
import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { AvisoPorLiquidarAMano } from './AvisoPorLiquidarAMano';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const MOTIVO =
  'La cuota de octubre de 2026 de «Local 3» no se reparte entre sus 2 dueños: lleva IVA o retenciones liquidados para un solo perfil tributario. Hay que decidir a nombre de quién queda cada retención y liquidarla a mano, por fuera de la corrida del mes.';

describe('<AvisoPorLiquidarAMano>', () => {
  it('🔴 dice qué inmueble queda por fuera y por qué', async () => {
    await act(async () => {
      root.render(
        React.createElement(AvisoPorLiquidarAMano, {
          cuotas: [{ cuotaId: 'q1', contractId: 'c1', propertyId: 'p1', propertyTitle: 'Local 3', mes: '2026-10', duenos: 2, motivo: MOTIVO }],
        }),
      );
    });
    const aviso = container.querySelector('[data-testid="aviso-por-liquidar-a-mano"]');
    expect(aviso?.textContent).toContain('1 inmueble queda por liquidar a mano');
    expect(container.querySelector('[data-testid="cuota-por-liquidar-a-mano"]')?.textContent).toContain('Local 3');
    expect(aviso?.textContent).toContain('liquidarla a mano');
  });

  it('sin cuotas apartadas no pinta nada', async () => {
    await act(async () => {
      root.render(React.createElement(AvisoPorLiquidarAMano, { cuotas: [] }));
    });
    expect(container.querySelector('[data-testid="aviso-por-liquidar-a-mano"]')).toBeNull();
  });
});
