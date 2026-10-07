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

function conElMesDeMayo(asociadoPor?: 'numero_contrato' | 'codigo_inmueble') {
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
  it('el pagado por el documento del inquilino no dice nada de más', () => {
    conElMesDeMayo();
    expect(host.textContent).toContain('RC-9001');
    expect(host.querySelector('[data-testid="asociado-por"]')).toBeNull();
  });
});
