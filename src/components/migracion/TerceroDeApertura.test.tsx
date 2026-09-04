/**
 * El tercero de una línea de apertura: buscar, elegir, quitar.
 *
 * Lo que se protege es el id que viaja: un propietario va con `Propietario.id`
 * y un inquilino con su `tenantId` — los mismos que asienta el motor. Si acá
 * saliera otro id, el saldo migrado y los movimientos de mañana caerían en
 * auxiliares distintas y el estado de cuenta seguiría en cero.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

const { propietariosMock, inquilinosMock } = vi.hoisted(() => ({
  propietariosMock: { getAll: vi.fn() },
  inquilinosMock: { listar: vi.fn() },
}));

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  );
  return { ...actual, propietariosApi: { ...actual.propietariosApi, ...propietariosMock } };
});

vi.mock('@/lib/api/inquilinos.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inquilinos.service')>(
    '@/lib/api/inquilinos.service',
  );
  return { ...actual, inquilinosApi: { ...actual.inquilinosApi, ...inquilinosMock } };
});

import { TerceroDeApertura } from './TerceroDeApertura';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  inquilinosMock.listar.mockResolvedValue([
    { tenantId: 'u-ana', nombre: 'Ana Pérez', email: 'ana@x.co', telefono: null },
  ]);
  propietariosMock.getAll.mockResolvedValue([
    { id: 'po-1', name: 'Jorge Restrepo', documentType: 'CC', documentNumber: '71234567', email: null },
  ]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
});

function escribir(input: HTMLInputElement, texto: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, texto);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('TerceroDeApertura', () => {
  it('busca inquilinos y el elegido viaja con su tenantId', async () => {
    const onCambio = vi.fn();
    await act(async () => {
      root.render(<TerceroDeApertura valor={null} onCambio={onCambio} testId="t" />);
    });

    const buscar = document.querySelector('[data-testid="t-buscar"]') as HTMLInputElement;
    await act(async () => {
      escribir(buscar, 'ana');
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});

    expect(inquilinosMock.listar).toHaveBeenCalledWith({ buscar: 'ana' });
    const opcion = document.querySelector('[data-testid="t-opcion-u-ana"]') as HTMLButtonElement;
    expect(opcion?.textContent).toContain('Ana Pérez');
    await act(async () => {
      opcion.click();
    });
    expect(onCambio).toHaveBeenCalledWith({ tipo: 'ARRENDATARIO', id: 'u-ana', nombre: 'Ana Pérez' });
  });

  it('con un tercero elegido lo muestra y deja quitarlo', async () => {
    const onCambio = vi.fn();
    await act(async () => {
      root.render(
        <TerceroDeApertura
          valor={{ tipo: 'PROPIETARIO', id: 'po-1', nombre: 'Jorge Restrepo' }}
          onCambio={onCambio}
          testId="t"
        />,
      );
    });
    expect(document.querySelector('[data-testid="t-elegido"]')?.textContent).toContain('Jorge Restrepo');
    await act(async () => {
      (document.querySelector('[data-testid="t-quitar"]') as HTMLButtonElement).click();
    });
    expect(onCambio).toHaveBeenCalledWith(null);
  });

  it('menos de dos letras no busca nada', async () => {
    await act(async () => {
      root.render(<TerceroDeApertura valor={null} onCambio={vi.fn()} testId="t" />);
    });
    await act(async () => {
      escribir(document.querySelector('[data-testid="t-buscar"]') as HTMLInputElement, 'a');
      vi.advanceTimersByTime(300);
    });
    expect(inquilinosMock.listar).not.toHaveBeenCalled();
    expect(propietariosMock.getAll).not.toHaveBeenCalled();
  });
});
