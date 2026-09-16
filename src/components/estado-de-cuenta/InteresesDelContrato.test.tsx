/**
 * Los intereses de mora en el estado de cuenta (2026-09-16).
 *
 * Lo que se fija:
 *  - 🔴 capital e interés NO se mezclan: «Resta por pagar» sigue siendo capital
 *    y el interés va en su sección y en sus propias cifras, con un total que
 *    suma los dos;
 *  - una cuota pagada en mora se dice, porque en Arriendos sale «Cancelada»;
 *  - 🔴 cuotas en mora sin interés NO son un cero mudo: en el panel se dice por
 *    qué y se lleva a configurar las reglas; al cliente (portal, enlace) ese
 *    motivo interno no se le muestra;
 *  - el documento del propietario, que no trae intereses, no pinta la sección.
 */

import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}));

import { EstadoDeCuentaDocumento } from './EstadoDeCuentaDocumento';
import { contrato, estadoDeCuenta } from './ejemplo-de-prueba';
import type { InteresesDelContrato, TotalesDeInteres } from './intereses';
import { RUTA_DE_REGLAS_DE_MORA } from './intereses';
import { formatCurrency } from '@/lib/format';

const HOY = '2026-09-16';

let host: HTMLDivElement | undefined;
let root: Root | undefined;

function montar(nodo: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(nodo));
}

afterEach(() => {
  const r = root;
  if (r) act(() => r.unmount());
  host?.remove();
  host = undefined;
  root = undefined;
});

const $ = (sel: string) => host!.querySelector<HTMLElement>(sel);

/** Mayo del contrato #69 en QA: 129 días de mora, $288.367 liquidados. */
function conIntereses(over: Partial<InteresesDelContrato> = {}): InteresesDelContrato {
  return {
    filas: [
      {
        cuotaId: 'cuota-may',
        mes: '2026-05',
        concepto: 'Intereses de mora sobre Canon de arrendamiento. De 2026-05-01 hasta 2026-05-31',
        fechaVencimiento: '2026-05-05',
        diasDeMora: 129,
        liquidado: 288_367,
        abonado: 0,
        pendiente: 288_367,
        origen: 'CUOTA',
        pagadaEnMora: false,
      },
      {
        cuotaId: 'cuota-jun',
        mes: '2026-06',
        concepto: 'Intereses de mora sobre Canon de arrendamiento. De 2026-06-01 hasta 2026-06-30',
        fechaVencimiento: '2026-06-05',
        diasDeMora: 21,
        liquidado: 21_000,
        abonado: 0,
        pendiente: 21_000,
        origen: 'CUOTA',
        pagadaEnMora: true,
      },
    ],
    liquidado: 309_367,
    abonado: 0,
    pendiente: 309_367,
    pendienteConIntereses: 1_550_000 + 309_367,
    restaPorPagarConIntereses: 3_100_000 + 309_367,
    sinInteres: null,
    ...over,
  };
}

function documento(intereses: InteresesDelContrato | null, totales?: TotalesDeInteres | null) {
  const c = contrato();
  const doc = estadoDeCuenta({ contratos: [{ ...c, intereses } as typeof c] });
  return {
    ...doc,
    intereses:
      totales === undefined
        ? intereses && {
            liquidado: intereses.liquidado,
            abonado: intereses.abonado,
            pendiente: intereses.pendiente,
            pendienteConIntereses: intereses.pendienteConIntereses,
            restaPorPagarConIntereses: intereses.restaPorPagarConIntereses,
            sinReglas: Boolean(intereses.sinInteres?.sinReglas),
          }
        : totales,
  } as typeof doc;
}

describe('los intereses de mora en el estado de cuenta', () => {
  it('🔴 van en su propia sección, con días de mora, lo liquidado y lo que falta', () => {
    montar(<EstadoDeCuentaDocumento doc={documento(conIntereses())} hoy={HOY} />);

    const numero = contrato().numero;
    const seccion = $(`[data-testid="intereses-${numero}"]`)!;
    expect(seccion.textContent).toContain('Intereses de mora');
    expect(seccion.textContent).toContain('129 días');
    expect(seccion.textContent).toContain(formatCurrency(288_367));
    // La cuota de junio ya se pagó, pero en mora: se dice.
    expect(seccion.textContent).toContain('La cuota se pagó en mora');
  });

  it('🔴 el pie del contrato separa capital e interés, y da el total con intereses', () => {
    montar(<EstadoDeCuentaDocumento doc={documento(conIntereses())} hoy={HOY} />);
    const numero = contrato().numero;

    expect($(`[data-testid="intereses-contrato-${numero}"]`)?.textContent).toBe(
      formatCurrency(309_367),
    );
    expect($(`[data-testid="total-con-intereses-${numero}"]`)?.textContent).toBe(
      formatCurrency(3_100_000 + 309_367),
    );
    // «Resta por pagar» sigue siendo CAPITAL: no se le suma nada.
    expect($(`[data-testid="total-contrato-${numero}"]`)?.textContent).toBe(
      formatCurrency(contrato().totales.restaPorPagar),
    );
  });

  it('el resumen de arriba dice el interés aparte del número grande', () => {
    montar(<EstadoDeCuentaDocumento doc={documento(conIntereses())} hoy={HOY} />);
    const linea = $('[data-testid="intereses-del-cliente"]')?.textContent ?? '';
    expect(linea).toContain(formatCurrency(309_367));
    expect(linea).toContain('Total con intereses');
  });

  it('🔴 en el PANEL, cuotas en mora sin reglas dicen por qué y llevan a configurarlas', () => {
    const sinReglas = conIntereses({
      filas: [],
      liquidado: 0,
      pendiente: 0,
      sinInteres: {
        cuotas: 3,
        motivo: 'La inmobiliaria no tiene reglas de mora activas.',
        sinReglas: true,
      },
    });
    montar(
      <EstadoDeCuentaDocumento
        doc={documento(sinReglas)}
        hoy={HOY}
        reglasDeMoraHref={RUTA_DE_REGLAS_DE_MORA}
      />,
    );

    const numero = contrato().numero;
    const aviso = $(`[data-testid="sin-intereses-${numero}"]`)!;
    expect(aviso.textContent).toContain('no tiene reglas de mora activas');
    expect(aviso.textContent).toContain('3 cuotas');
    expect($('[data-testid="configurar-reglas-de-mora"]')?.getAttribute('href')).toBe(
      RUTA_DE_REGLAS_DE_MORA,
    );
    // Sin interés liquidado no hay cifras de interés que mostrar en el pie.
    expect($(`[data-testid="intereses-contrato-${numero}"]`)).toBeNull();
  });

  it('🔴 al CLIENTE (portal o enlace) no se le muestra el motivo interno', () => {
    const sinReglas = conIntereses({
      filas: [],
      liquidado: 0,
      pendiente: 0,
      sinInteres: { cuotas: 3, motivo: 'x', sinReglas: true },
    });
    montar(<EstadoDeCuentaDocumento doc={documento(sinReglas)} hoy={HOY} />);

    const numero = contrato().numero;
    expect($(`[data-testid="sin-intereses-${numero}"]`)).toBeNull();
    expect($(`[data-testid="intereses-${numero}"]`)).toBeNull();
    expect(host!.textContent).not.toContain('reglas de mora');
  });

  it('sin intereses (el propietario, o un back anterior) no se pinta nada de mora', () => {
    montar(<EstadoDeCuentaDocumento doc={documento(null, null)} hoy={HOY} />);
    const numero = contrato().numero;
    expect($(`[data-testid="intereses-${numero}"]`)).toBeNull();
    expect($('[data-testid="intereses-del-cliente"]')).toBeNull();
    expect($(`[data-testid="total-con-intereses-${numero}"]`)).toBeNull();
  });
});
