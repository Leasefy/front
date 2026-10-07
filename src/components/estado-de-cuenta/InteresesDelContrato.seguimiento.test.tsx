/**
 * 🔴 QA-CONT CR-31 (SEGUIMIENTO-FRONT, 03-10-2026): con la inmobiliaria SIN sus
 * días de plazo fijados no corre interés (Nico, J-13). El back marca
 * `plazoSinFijar`; el estado de cuenta lo dice en palabras, con el camino para
 * fijarlos, y sin cifra de interés. Preparación copiada de
 * `InteresesDelContrato.test.tsx`; su cabecera original:
 *
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
import type { InteresesDelContrato, TotalesDeInteres } from '@/lib/types/estado-de-cuenta';
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

/*
 * 🔴 19-09-2026 (Nico) · «tienes una cosa que dice otros conceptos, e interés
 * de mora y no se sabe si ahí van tablas o qué, no se entiende bien qué es de
 * qué o qué hace parte a qué».
 *
 * Los rótulos eran `<h4>` en mayúsculas flotando en el aire, con una tabla
 * enmarcada debajo y el mismo aire arriba y abajo: nada decía dónde empieza y
 * dónde termina cada sección, ni que las tres son partes del MISMO contrato.
 * Con la sección vacía era peor: un título suelto y una frase, sin nada que
 * los uniera. Ahora cada una es UNA caja con su título de encabezado.
 */
describe('CR-31 — plazo sin fijar', () => {
  it('🔴 dice que sin plazo fijado no corre interés, con «Fijar los días de plazo» y sin cifra', () => {
    const sinPlazo = conIntereses({
      filas: [],
      liquidado: 0,
      pendiente: 0,
      plazoSinFijar: true,
      sinInteres: {
        cuotas: 2,
        motivo: 'Esta inmobiliaria todavía no fijó sus días de plazo para pagar, así que la cartera se muestra SIN intereses.',
        sinReglas: false,
        plazoSinFijar: true,
      },
    });
    montar(<EstadoDeCuentaDocumento doc={documento(sinPlazo)} hoy={HOY} reglasDeMoraHref={RUTA_DE_REGLAS_DE_MORA} />);
    const numero = contrato().numero;
    const aviso = $(`[data-testid="sin-intereses-${numero}"]`)!;
    expect(aviso.textContent).toContain('2 cuotas en mora sin intereses: tu inmobiliaria no ha fijado sus días de plazo');
    expect($('[data-testid="fijar-dias-de-plazo"]')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo',
    );
    // No ofrece configurar reglas: lo que falta es el plazo.
    expect($('[data-testid="configurar-reglas-de-mora"]')).toBeNull();
    expect($(`[data-testid="intereses-contrato-${numero}"]`)).toBeNull();
  });

  it('al cliente tampoco se le muestra (es un motivo interno)', () => {
    const sinPlazo = conIntereses({
      filas: [],
      liquidado: 0,
      pendiente: 0,
      plazoSinFijar: true,
      sinInteres: { cuotas: 2, motivo: 'x', sinReglas: false, plazoSinFijar: true },
    });
    montar(<EstadoDeCuentaDocumento doc={documento(sinPlazo)} hoy={HOY} />);
    expect($('[data-testid="fijar-dias-de-plazo"]')).toBeNull();
  });
});
