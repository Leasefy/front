/**
 * El portal del propietario no dice «0 contratos» a quien tiene contratos con
 * su inmobiliaria (QA 22-09). La fuente es su estado de cuenta.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mio = vi.fn();
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { mio: () => mio() } }));

import { ContratosConLaInmobiliaria, useContratosAdministrados } from './ContratosConLaInmobiliaria';
import { contrato, estadoDeCuenta } from '@/components/estado-de-cuenta/ejemplo-de-prueba';

let host: HTMLDivElement;
let root: Root;

function Sonda() {
  const { doc, cargando } = useContratosAdministrados();
  if (cargando) return <p>cargando</p>;
  return doc ? <ContratosConLaInmobiliaria doc={doc} /> : <p>sin contratos de inmobiliaria</p>;
}

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<Sonda />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  mio.mockReset();
});

describe('ContratosConLaInmobiliaria', () => {
  it('con contratos del lado PROPIETARIO dice cuántos y enlaza al estado de cuenta', async () => {
    mio.mockResolvedValue(
      estadoDeCuenta({
        cliente: { nombre: 'Iván', documento: null, tipo: 'PROPIETARIO' },
        contratos: [contrato({ id: 'c1', numero: '49', rol: 'PROPIETARIO', vigente: true }), contrato({ id: 'c2', numero: '81', rol: 'PROPIETARIO', vigente: true })],
      }),
    );
    await montar();
    const texto = host.textContent ?? '';
    expect(texto).toContain('2 contratos');
    expect(texto).toContain('Contrato 49');
    expect(host.querySelector('a[href="/panel/estado-de-cuenta"]')).not.toBeNull();
  });

  it('un fallo NO se vuelve «tienes contratos»: la pantalla sigue con lo suyo', async () => {
    mio.mockRejectedValue(new Error('403'));
    await montar();
    expect(host.textContent).toContain('sin contratos de inmobiliaria');
  });

  it('sólo cuenta los del lado PROPIETARIO', async () => {
    mio.mockResolvedValue(estadoDeCuenta({ contratos: [contrato({ rol: 'INQUILINO' })] }));
    await montar();
    expect(host.textContent).toContain('sin contratos de inmobiliaria');
  });
});
