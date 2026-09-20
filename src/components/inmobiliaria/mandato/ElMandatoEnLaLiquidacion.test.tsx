/**
 * La liquidación tiene que decir de dónde sale cada peso del mandato:
 *
 *   · garantizado → cuánto se giró sin que el inquilino pagara (cuenta por
 *     cobrar al inquilino), que es plata de la inmobiliaria en la calle;
 *   · sobre recaudo → que ese renglón es la cuota de OTRO mes, pagada tarde;
 *   · D2 → que esos pesos son intereses de mora recaudados, sin comisión.
 *
 * Y con un back sin las migraciones no puede aparecer nada: ausente no es cero.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ResumenDelMandato, RotuloDelMandato, hayAlgoDelMandato } from './ElMandatoEnLaLiquidacion';
import { adaptarDispersion, type DispersionDelBack } from '@/lib/api/dispersion-adapter';

void React;
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function pintar(nodo: React.ReactNode) {
  act(() => root.render(nodo));
  return container.textContent ?? '';
}

describe('ResumenDelMandato', () => {
  it('sin mandato no pinta nada (ausente no es cero)', () => {
    expect(hayAlgoDelMandato({})).toBe(false);
    expect(pintar(<ResumenDelMandato numeros={{}} />)).toBe('');
    expect(container.querySelector('[data-testid="resumen-del-mandato"]')).toBeNull();
  });

  it('garantizado: dice cuánto se giró sin recaudo y que es cuenta por cobrar', () => {
    const texto = pintar(<ResumenDelMandato numeros={{ cuentaPorCobrarAlInquilinoCop: 1_650_000 }} />);
    expect(texto).toContain('1.650.000');
    expect(texto).toContain('cuenta por cobrar al inquilino');
  });

  it('D2: los intereses recaudados del propietario no llevan comisión', () => {
    const texto = pintar(<ResumenDelMandato numeros={{ interesesCop: 48_000 }} />);
    expect(texto).toContain('48.000');
    expect(texto).toContain('intereses de mora');
    expect(texto).toContain('No llevan comisión');
  });
});

describe('RotuloDelMandato', () => {
  it('no dice el mes cuando es el mismo de la liquidación', () => {
    const texto = pintar(
      <RotuloDelMandato
        item={{ modalidad: 'SOBRE_RECAUDO', mesDeLaCuota: '2026-09' }}
        mesDeLaLiquidacion="2026-09"
      />,
    );
    expect(texto).toContain('Sobre recaudo');
    expect(texto).not.toContain('cuota de');
  });

  it('una cuota pagada tarde dice de qué mes viene', () => {
    const texto = pintar(
      <RotuloDelMandato
        item={{ modalidad: 'SOBRE_RECAUDO', mesDeLaCuota: '2026-08' }}
        mesDeLaLiquidacion="2026-09"
      />,
    );
    expect(texto).toContain('cuota de agosto de 2026');
  });

  it('garantizado con parte sin recaudar lo dice en el renglón', () => {
    const texto = pintar(
      <RotuloDelMandato item={{ modalidad: 'GARANTIZADO', sinRecaudoCop: 500_000 }} mesDeLaLiquidacion="2026-09" />,
    );
    expect(texto).toContain('Garantizado');
    expect(texto).toContain('500.000 sin recaudo');
  });

  it('el renglón de intereses nombra su recibo', () => {
    const texto = pintar(
      <RotuloDelMandato
        item={{
          interesDelRecibo: {
            reciboDeCajaId: 'r1',
            reciboNumero: 412,
            reciboFecha: '2026-09-10',
            destino: 'PROPIETARIO',
            porcentajeAlPropietario: 100,
            interesesCop: 48_000,
            gastosDeCobranzaCop: 0,
          },
        }}
      />,
    );
    expect(texto).toContain('recibo N.º 412');
  });

  it('un renglón de siempre no pinta rótulo', () => {
    expect(pintar(<RotuloDelMandato item={{}} />)).toBe('');
  });
});

describe('adaptarDispersion', () => {
  const BASE: DispersionDelBack = {
    id: 'd1',
    propietarioId: 'p1',
    propietarioName: 'Ana',
    propietarioBankName: null,
    propietarioBankAccount: null,
    month: '2026-09',
    totalCollected: 1_650_000,
    totalCommission: 165_000,
    netToPropietario: 1_485_000,
    status: 'DISP_PENDING',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    items: [],
  };

  it('pasa los números del mandato tal cual, sin inventarlos', () => {
    const sinMandato = adaptarDispersion(BASE);
    expect(sinMandato.cuentaPorCobrarAlInquilinoCop).toBeUndefined();
    expect(sinMandato.interesesCop).toBeUndefined();

    const conMandato = adaptarDispersion({
      ...BASE,
      cuentaPorCobrarAlInquilinoCop: 1_650_000,
      interesesCop: 48_000,
      items: [
        {
          cobroId: null,
          cuotaId: 'c1',
          propertyTitle: 'Apto 101',
          rentCollected: 1_650_000,
          commissionPercent: 10,
          commissionAmount: 165_000,
          netAmount: 1_485_000,
          modalidad: 'GARANTIZADO',
          fuenteDeLaModalidad: 'MANDATO',
          mesDeLaCuota: '2026-09',
          sinRecaudoCop: 1_485_000,
        },
      ],
    });
    expect(conMandato.cuentaPorCobrarAlInquilinoCop).toBe(1_650_000);
    expect(conMandato.interesesCop).toBe(48_000);
    expect(conMandato.items[0].modalidad).toBe('GARANTIZADO');
    expect(conMandato.items[0].sinRecaudoCop).toBe(1_485_000);
  });
});
