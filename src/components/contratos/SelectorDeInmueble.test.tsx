/**
 * SelectorDeInmueble.test.tsx — elegir a mano el inmueble de una fila.
 *
 * Lo que se congela:
 *
 *  - La etiqueta lleva código, dirección, título y ciudad: el filtro del
 *    `Combobox` mira `label`, así que es lo único que hace buscable cada uno.
 *  - «ocupado» se dice. Un inmueble con otro contrato vivo casi nunca es el
 *    que se busca; ofrecerlo callado es el error que el resolutor se niega a
 *    cometer con una dirección repetida.
 *  - El portafolio se pide UNA vez aunque monten veinticinco filas.
 *  - Un fallo al traerlo NO se puede leer como «no tienes inmuebles».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({ api: { buscarInmuebles: vi.fn() } }));

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  );
  return {
    ...actual,
    contractsApi: {
      ...actual.contractsApi,
      migracion: { ...actual.contractsApi.migracion, ...api },
    },
  };
});

import type { InmuebleCandidato } from '@/lib/api/contracts.service';
import {
  SelectorDeInmueble,
  etiquetaDeInmueble,
  olvidarPortafolio,
  usePortafolioDeLaAgencia,
} from './SelectorDeInmueble';

const UNO: InmuebleCandidato = {
  id: 'p1',
  address: 'CR 50 127 SUR 61',
  city: 'Caldas',
  title: 'Oficina en El Centro',
  externalId: '3',
  ocupado: false,
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(nodo: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(nodo);
  });
  await act(async () => {});
}

beforeEach(() => {
  olvidarPortafolio();
  api.buscarInmuebles.mockResolvedValue([UNO]);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('etiquetaDeInmueble', () => {
  it('junta código, dirección, título y ciudad: todo eso se busca', () => {
    expect(etiquetaDeInmueble(UNO)).toBe(
      '#3 · CR 50 127 SUR 61 · Oficina en El Centro · Caldas',
    );
  });

  it('sin «Código» del sistema viejo cae al consecutivo de Leasefy', () => {
    expect(
      etiquetaDeInmueble({ id: 'p', address: 'CL 1', city: null, code: 144 }),
    ).toBe('#144 · CL 1');
  });

  it('un inmueble con otro contrato vivo lo dice', () => {
    expect(
      etiquetaDeInmueble({ id: 'p', address: 'CL 1', city: null, ocupado: true }),
    ).toBe('CL 1 · ocupado');
  });
});

describe('<SelectorDeInmueble>', () => {
  it('sin inmuebles el control queda apagado: no hay nada que elegir', async () => {
    await pintar(<SelectorDeInmueble inmuebles={[]} onElegir={vi.fn()} />);
    const boton = container.querySelector('button') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  it('con inmuebles queda vivo', async () => {
    await pintar(<SelectorDeInmueble inmuebles={[UNO]} onElegir={vi.fn()} />);
    const boton = container.querySelector('button') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
  });
});

describe('usePortafolioDeLaAgencia', () => {
  function Sonda({ activo = true }: { activo?: boolean }) {
    const p = usePortafolioDeLaAgencia(activo);
    return (
      <div data-testid="sonda" data-error={p.error ?? ''}>
        {p.inmuebles.length}
      </div>
    );
  }

  it('veinticinco filas comparten UNA sola petición', async () => {
    await pintar(
      <>
        {Array.from({ length: 25 }, (_, i) => (
          <Sonda key={i} />
        ))}
      </>,
    );
    expect(api.buscarInmuebles).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="sonda"]')[0].textContent).toBe('1');
  });

  it('un fallo se dice — callarlo se leería como «no tienes inmuebles»', async () => {
    api.buscarInmuebles.mockRejectedValue(new Error('red caída'));
    await pintar(<Sonda />);
    await act(async () => {});
    const sonda = container.querySelector('[data-testid="sonda"]')!;
    expect(sonda.getAttribute('data-error')).toBe('red caída');
    expect(sonda.textContent).toBe('0');
  });

  it('un fallo NO se cachea: la siguiente fila vuelve a intentar', async () => {
    api.buscarInmuebles.mockRejectedValueOnce(new Error('red caída'));
    await pintar(<Sonda />);
    await act(async () => {});
    expect(api.buscarInmuebles).toHaveBeenCalledTimes(1);

    await act(async () => root?.render(<Sonda key="otra" />));
    await act(async () => {});
    expect(api.buscarInmuebles).toHaveBeenCalledTimes(2);
  });

  it('inactivo no pide nada', async () => {
    await pintar(<Sonda activo={false} />);
    expect(api.buscarInmuebles).not.toHaveBeenCalled();
  });
});
