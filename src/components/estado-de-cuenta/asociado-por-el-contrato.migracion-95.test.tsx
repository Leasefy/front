/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — CA-08, decisión de Nico (a):
 * el mes del sistema anterior pagado con un recibo migrado SIN el documento del
 * inquilino (colgado del contrato por su número o por el código del inmueble)
 * lo DICE en la fila: «Asociado por el número de contrato».
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./AnticipoDelContrato', () => ({ AnticipoDelContratoSeccion: () => <div /> }));
vi.mock('./SaldoAFavorAlTerminar', () => ({ SaldoAFavorAlTerminarSeccion: () => <div /> }));

import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { contrato, estadoDeCuenta, fila } from './ejemplo-de-prueba';

let host: HTMLDivElement;
let root: Root;
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function conElMesDeMayo(asociadoPor?: 'numero_contrato' | 'codigo_inmueble' | 'nombre', valor?: number) {
  const c = contrato();
  c.secciones = { ...c.secciones, arriendos: [
    fila({
      concepto: 'Canon de arrendamiento. Del 1 al 31 de mayo de 2026',
      estado: 'ANTERIOR',
      fechaDePago: '2026-05-05',
      documentoDePago: {
        numero: 'RC-9001',
        tipo: 'INGRESO',
        descripcion: 'RECAUDO CANON MAYO CONTRATO 9501 · asociado por el número de contrato',
        ...(asociadoPor ? { asociadoPor } : {}),
        ...(valor !== undefined ? { valor } : {}),
      },
      valorBruto: 2_350_000,
      valorNeto: 2_350_000,
      fechaVencimiento: '2026-05-01',
      periodoDesde: '2026-05-01',
      periodoHasta: '2026-05-31',
    }),
  ] };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<EstadoDeCuentaDocumento doc={estadoDeCuenta({ contratos: [c] })} hoy="2026-10-06" />));
}

describe('el mes pagado por un comprobante asociado por el contrato (CA-08)', () => {
  it('dice «Asociado por el número de contrato»', () => {
    conElMesDeMayo('numero_contrato');
    expect(host.querySelector('[data-testid="asociado-por"]')?.textContent).toBe('Asociado por el número de contrato');
  });
  it('dice «Asociado por el código del inmueble»', () => {
    conElMesDeMayo('codigo_inmueble');
    expect(host.querySelector('[data-testid="asociado-por"]')?.textContent).toBe('Asociado por el código del inmueble');
  });
  // QA de Portofino (14-10), Nico: el recibo con el nombre EXACTO del inquilino también paga.
  it('dice «Asociado por el nombre del inquilino»', () => {
    conElMesDeMayo('nombre');
    expect(host.querySelector('[data-testid="asociado-por"]')?.textContent).toBe('Asociado por el nombre del inquilino');
  });
  // QA de Portofino (14-10), Nico: «el valor del comprobante», nunca el canon de hoy.
  it('el mes del sistema anterior dice «—» en su plata y el valor va junto a su comprobante', () => {
    conElMesDeMayo('nombre', 1_665_000);
    const fila = [...host.querySelectorAll('tr')].find((tr) => tr.textContent?.includes('RC-9001'))!;
    expect(fila.textContent).toContain('RC-9001 · INGRESO · $\u00a01.665.000');
    expect(fila.textContent).not.toContain('2.350.000');
    expect(fila.textContent).not.toContain(' más');
    expect(fila.textContent).toContain('—');
  });
  it('el pagado por el documento del inquilino no dice nada de más', () => {
    conElMesDeMayo();
    expect(host.textContent).toContain('RC-9001');
    expect(host.querySelector('[data-testid="asociado-por"]')).toBeNull();
  });
});
