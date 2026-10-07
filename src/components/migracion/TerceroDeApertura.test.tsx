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
import { ApiError } from '@/lib/api/client';

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

/**
 * Una búsqueda que falla ya no se ve igual que «no hay nadie con ese nombre»
 * (02-10-2026): el motivo va debajo del campo, con la regla de oro.
 */
describe('TerceroDeApertura — cuando la búsqueda falla', () => {
  async function buscarCon(texto: string) {
    await act(async () => {
      root.render(<TerceroDeApertura valor={null} onCambio={vi.fn()} testId="t" />);
    });
    const buscar = document.querySelector('[data-testid="t-buscar"]') as HTMLInputElement;
    await act(async () => {
      escribir(buscar, texto);
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    return buscar;
  }

  it('🔴 un 5xx dice «de nuestro lado» con la referencia, debajo del campo', async () => {
    inquilinosMock.listar.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'abcd1234',
      }),
    );
    const buscar = await buscarCon('ana');
    const error = document.getElementById('t-buscar-error');
    expect(error?.textContent).toMatch(/^No pudimos buscar el tercero: algo falló de nuestro lado/);
    expect(error?.textContent).toContain('abcd1234');
    expect(buscar.getAttribute('aria-invalid')).toBe('true');
    expect(buscar.getAttribute('aria-describedby')).toBe('t-buscar-error');
  });

  it('sin respuesta habla de la conexión; al volver a escribir el aviso se va', async () => {
    inquilinosMock.listar.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const buscar = await buscarCon('ana');
    expect(document.getElementById('t-buscar-error')?.textContent).toMatch(/conexión/);

    await act(async () => {
      escribir(buscar, 'anab');
    });
    expect(buscar.getAttribute('aria-invalid')).toBeNull();
  });
});
