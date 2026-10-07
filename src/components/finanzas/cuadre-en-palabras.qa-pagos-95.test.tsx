/**
 * 🔴 QA-PAGOS-95 r2 (N-38 / E-02): el cuadre en palabras, renglón por renglón,
 * con lo PROPIO retenido restado de la plata de terceros. (Arnés copiado de
 * CuadreDeTerceros.test.tsx.)
 *
 * El cuadre no dice «cuadra en $0» cuando no hay con qué cuadrar.
 *
 * Las tres cosas que estos tests fijan, y que son justamente las que un cuadre
 * mal hecho arruina:
 *
 *   · sin extracto, `diferenciaCop` es `null` y la pantalla dice «no se pudo
 *     cuadrar» — nunca un cero, que se leería como «está todo bien»;
 *   · una diferencia A FAVOR no se pinta en rojo: es lo normal mientras la
 *     comisión siga en la cuenta de recaudo;
 *   · que FALTE plata de terceros sí, y va arriba de todo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CuadreDeTerceros } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ cuadre: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { cuadre: h.cuadre },
  codigoSinMigrar: vi.fn(() => null),
}));

import { CuadreDeTercerosPanel } from './CuadreDeTerceros';

function respuesta(extra: Partial<CuadreDeTerceros> = {}): CuadreDeTerceros {
  return {
    fecha: '2026-09-17',
    saldoDeLaCuentaCop: 100_000_000,
    recaudadoYNoGiradoCop: 80_000_000,
    anticiposDelInquilinoCop: 12_000_000,
    garantiasDeServiciosCop: 5_000_000,
    partidasPorIdentificarCop: 3_000_000,
    partidasPorIdentificar: 2,
    entradasIgnoradasCop: 0,
    entradasIgnoradas: 0,
    comisionRetenidaCop: 0,
    comisionTrasladadaCop: 0,
    haySaldoDelBanco: true,
    plataDeTercerosCop: 100_000_000,
    comisionEnLaCuentaCop: 0,
    laDiferenciaEsLaComision: false,
    diferenciaCop: 0,
    cuadra: true,
    faltaPlataDeTerceros: false,
    explicaciones: [],
    avisos: [],
    detalle: {
      recaudadoCop: 400_000_000,
      giradoCop: 320_000_000,
      movimientosDelExtracto: 412,
      garantiasVivas: 7,
    },
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.cuadre.mockReset().mockResolvedValue(respuesta());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function pintar() {
  await act(async () => {
    root.render(<CuadreDeTercerosPanel />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const testId = (id: string) => container.querySelector(`[data-testid="${id}"]`);

describe('🔴 N-38: la cuenta en palabras', () => {
  const renglones = [
    { clave: 'recaudado-no-girado', signo: '+' as const, etiqueta: 'Recaudado y no girado', valorCop: 266_000, explicacion: 'Lo que entró de inquilinos ($2.050.000, recibos vivos) menos lo que salió a propietarios ($1.784.000). Adentro viene lo tuyo: se resta en el renglón siguiente.' },
    { clave: 'propio-retenido', signo: '−' as const, etiqueta: 'Lo tuyo que entró con esos recaudos', valorCop: 266_000, explicacion: 'No es plata de terceros: comisión $200.000 + IVA de la comisión $38.000 − retenciones de la comisión $22.000 + intereses de mora cobrados $30.000 + gastos de cobranza cobrados $20.000, de los meses que el inquilino ya pagó.' },
    { clave: 'plata-de-terceros', signo: '=' as const, etiqueta: 'Plata de terceros', valorCop: 0, explicacion: 'Lo que NO es de la inmobiliaria y tiene que estar en la cuenta de recaudo.' },
    { clave: 'diferencia', signo: '=' as const, etiqueta: 'Diferencia (saldo − plata de terceros)', valorCop: 266_000, explicacion: 'Lo esperado es lo tuyo que sigue en la cuenta: lo que entró ($266.000) menos lo que ya trasladaste ($0) = $266.000. Da exactamente eso: no es un descuadre, es tuyo y se va con el traslado; después del traslado da $0.' },
  ];

  it('pinta cada renglón con su signo, su cifra y su explicación (con «$ » de la casa)', async () => {
    h.cuadre.mockResolvedValue(
      respuesta({
        saldoDeLaCuentaCop: 266_000,
        recaudadoYNoGiradoCop: 266_000,
        anticiposDelInquilinoCop: 0,
        garantiasDeServiciosCop: 0,
        partidasPorIdentificarCop: 0,
        partidasPorIdentificar: 0,
        propioRetenidoCop: 266_000,
        comisionRetenidaCop: 266_000,
        plataDeTercerosCop: 0,
        comisionEnLaCuentaCop: 266_000,
        laDiferenciaEsLaComision: true,
        diferenciaCop: 266_000,
        cuadra: false,
        renglones,
      }),
    );
    await pintar();
    expect(testId('cuadre-renglones')).not.toBeNull();
    const propio = testId('renglon-propio-retenido')?.textContent ?? '';
    expect(propio).toContain('Lo tuyo que entró con esos recaudos');
    expect(propio).toContain('comisión $\u00a0200.000 + IVA de la comisión $\u00a038.000');
    expect(testId('renglon-diferencia')?.textContent).toContain('no es un descuadre');
    // El veredicto ya no dice «suele ser tu comisión»: dice que es EXACTAMENTE lo tuyo.
    expect(testId('cuadre-veredicto')?.textContent).toContain('es exactamente lo tuyo');
    expect(container.textContent).toContain('Lo tuyo sin trasladar');
  });

  it('con un back anterior (sin renglones) no pinta la sección', async () => {
    await pintar();
    expect(testId('cuadre-renglones')).toBeNull();
  });
});
