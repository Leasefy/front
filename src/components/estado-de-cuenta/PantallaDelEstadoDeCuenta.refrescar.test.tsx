/**
 * ARREGLOS-7 (de ARREGLOS-3, 03-10-2026) · Los totales del estado de cuenta no
 * se refrescaban tras las acciones de la sección del saldo a favor (registrar
 * la devolución, «Revisado»): la deuda cambiaba en el back y «Resta por pagar»
 * seguía con el número de antes hasta recargar la página.
 *
 * La pantalla da `useRefrescarElEstado()`: vuelve a pedir el documento SIN
 * desmontar nada, así la sección conserva el aviso de lo que acaba de pasar.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/toast', () => ({
  toast: { error: toastError, success: vi.fn(), info: vi.fn() },
}));

// El anticipo lee su propia API: acá no importa.
vi.mock('./AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => null }));

// La sección del saldo a favor, reducida a lo que importa: guarda un estado
// propio (como el aviso de «registrada») y, al terminar su acción, pide el
// refresco. Si la pantalla se desmontara, el estado volvería a cero.
vi.mock('./SaldoAFavorAlTerminar', async () => {
  const R = await import('react');
  const { useRefrescarElEstado } = await import('./refrescar-el-estado');
  return {
    SaldoAFavorAlTerminarSeccion: () => {
      const refrescar = useRefrescarElEstado();
      const [hecho, setHecho] = R.useState(false);
      return R.createElement(
        'div',
        null,
        R.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'accion-de-la-seccion',
            onClick: async () => {
              setHecho(true);
              await refrescar?.();
            },
          },
          'Registrar la devolución',
        ),
        hecho ? R.createElement('p', { 'data-testid': 'aviso-de-la-seccion' }, 'Devolución registrada') : null,
      );
    },
  };
});

import { PantallaDelEstadoDeCuenta } from './PantallaDelEstadoDeCuenta';
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

const HOY = '2026-10-03';

/** Un contrato terminado del inquilino: el panel le muestra la sección del saldo a favor. */
const terminado = (restaPorPagar: number): EstadoDeCuenta =>
  estadoDeCuenta({
    contratos: [contrato({ vigente: false })],
    totales: { cancelado: 3_153_902, pendiente: restaPorPagar, restaPorPagar },
  });

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  toastError.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar(cargar: () => Promise<EstadoDeCuenta>) {
  await act(async () => {
    root.render(<PantallaDelEstadoDeCuenta cargar={cargar} hoy={HOY} conAnticipoDelContrato />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function apretarLaAccion() {
  await act(async () => {
    host.querySelector<HTMLButtonElement>('[data-testid="accion-de-la-seccion"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('🔴 la sección cambia la deuda → los totales del documento también', () => {
  it('vuelve a pedir el documento y «Resta por pagar» cambia, sin desmontar la sección', async () => {
    const cargar = vi
      .fn<() => Promise<EstadoDeCuenta>>()
      .mockResolvedValueOnce(terminado(7_654_321))
      .mockResolvedValueOnce(terminado(1_234_567));
    await montar(cargar);
    expect(host.textContent).toContain('7.654.321');

    await apretarLaAccion();

    expect(cargar).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('1.234.567');
    expect(host.textContent).not.toContain('7.654.321');
    // La sección no se desmontó: su aviso sigue ahí.
    expect(host.querySelector('[data-testid="aviso-de-la-seccion"]')).not.toBeNull();
  });

  it('si el refresco falla, el documento de antes se queda y se dice', async () => {
    const cargar = vi
      .fn<() => Promise<EstadoDeCuenta>>()
      .mockResolvedValueOnce(terminado(7_654_321))
      .mockRejectedValueOnce(Object.assign(new Error('500'), {}));
    await montar(cargar);

    await apretarLaAccion();

    expect(host.textContent).toContain('7.654.321');
    expect(host.querySelector('[data-testid="aviso-de-la-seccion"]')).not.toBeNull();
    expect(toastError).toHaveBeenCalledWith(
      'No pudimos actualizar los totales del estado de cuenta',
      expect.objectContaining({ description: expect.stringMatching(/de nuestro lado/) }),
    );
  });
});
