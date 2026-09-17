/**
 * CuentaDeCobroDelPropietario.test.tsx — el documento con que se le cobra al
 * propietario lo que ya no tiene liquidación de la cual descontarse.
 *
 * Lo que fija: a quién va y de quién viene, el número y la fecha, cada renglón
 * con su origen, que un renglón que después se descontó o se anuló se ve
 * tachado con su estado, y que el total es el que manda el back (sólo lo
 * vigente). Y que comparte la hoja de impresión de la cuenta del inquilino.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaDeCobroDelPropietario as Cuenta } from '@/lib/types/deducciones';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { CuentaDeCobroDelPropietario } from './CuentaDeCobroDelPropietario';
import { CSS_DE_IMPRESION } from './CuentaDeCobro';

const CUENTA: Cuenta = {
  id: 'cc-1',
  numero: 7,
  emitidaAt: '2026-10-02T15:00:00.000Z',
  propietario: {
    id: 'p1',
    nombre: 'Jorge Restrepo',
    tipoDeDocumento: 'CC',
    documento: '71234567',
    correo: 'jorge@correo.co',
    direccion: 'Cra 13 # 55-20',
    ciudad: 'Medellín',
  },
  agencia: {
    nombre: 'Portofino Propiedad Raíz',
    nit: '900123456',
    direccion: null,
    ciudad: 'Medellín',
    telefono: null,
    correo: 'contabilidad@portofino.co',
  },
  renglones: [
    {
      id: 'd-1',
      grupoId: 'g-1',
      origen: 'SALDO_ANTERIOR',
      motivo: 'Saldo en contra de la liquidación de 2026-09',
      valorCop: 300_000,
      fecha: '2026-09-05',
      mesDesde: '2026-10',
      tieneSoporte: false,
      estado: 'VIGENTE',
    },
    {
      id: 'd-2',
      grupoId: 'g-2',
      origen: 'MANUAL',
      motivo: 'Recibo de agua',
      valorCop: 80_000,
      fecha: '2026-09-20',
      mesDesde: '2026-09',
      tieneSoporte: true,
      estado: 'ANULADA',
    },
  ],
  totalCop: 300_000,
  porQue:
    'Estos valores se le iban a descontar de su liquidación, pero ya no tiene más liquidaciones con la inmobiliaria de las cuales descontarlos.',
};

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

describe('<CuentaDeCobroDelPropietario>', () => {
  it('dice de quién, a quién, el número, cada renglón y el total del back', async () => {
    await act(async () => {
      raiz.render(<CuentaDeCobroDelPropietario cuenta={CUENTA} />);
    });
    const texto = contenedor.textContent ?? '';

    expect(texto).toContain('Portofino Propiedad Raíz');
    expect(texto).toContain('NIT 900123456');
    expect(texto).toContain('Jorge Restrepo');
    expect(texto).toContain('CC 71234567');
    expect(
      contenedor.querySelector('[data-testid="numero-de-la-cuenta"]')?.textContent,
    ).toBe('N.º 7');
    expect(texto).toContain('ya no tiene más liquidaciones');
    expect(texto).toContain('Saldo en contra del mes anterior');

    const anulada = contenedor.querySelector('[data-estado="ANULADA"]');
    expect(anulada?.textContent).toContain('Descuento: Recibo de agua');
    expect(anulada?.textContent).toContain('(Anulada)');
    expect(
      contenedor.querySelector('[data-testid="total-de-la-cuenta-del-propietario"]')
        ?.textContent,
    ).toMatch(/300\.?000/);
    expect(texto).toContain('no es factura electrónica');
  });

  it('usa la misma hoja de impresión que la cuenta de cobro del inquilino', async () => {
    await act(async () => {
      raiz.render(<CuentaDeCobroDelPropietario cuenta={CUENTA} />);
    });
    expect(contenedor.querySelector('style')?.textContent).toBe(CSS_DE_IMPRESION);
    expect(contenedor.querySelector('[data-cuenta-hoja]')).not.toBeNull();
  });
});
