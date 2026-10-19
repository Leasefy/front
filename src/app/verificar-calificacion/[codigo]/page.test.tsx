/**
 * La verificación pública del certificado de la Calificación Leasefy, en los
 * dos idiomas de la parte pública (19-10-2026). Lo que sostiene:
 *   1. en inglés no queda español a la vista (ni lo que llega fijo del back);
 *   2. el español es el de siempre (salvo «1 mes», que decía «1 meses»);
 *   3. la plata va en COP y las fechas en el formato de cada idioma.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { IdiomaDeLaPagina } from '@/lib/idioma/use-idioma';
import type { Idioma } from '@/lib/idioma/idioma';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const verificar = vi.fn();
vi.mock('@/lib/api/calificacion-leasefy.service', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/calificacion-leasefy.service')>(
    '@/lib/api/calificacion-leasefy.service',
  );
  return {
    ...real,
    calificacionLeasefyApi: { ...real.calificacionLeasefyApi, verificar: (c: string) => verificar(c) },
  };
});

import VerificarCalificacionPage from './page';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

/** `use(params)` lee al tiro una promesa ya cumplida (como la que arma Next). */
function params(codigo: string) {
  const valor = { codigo };
  return Object.assign(Promise.resolve(valor), { status: 'fulfilled', value: valor });
}

async function montar(idioma: Idioma) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <IdiomaDeLaPagina idioma={idioma}>
        <VerificarCalificacionPage params={params('5Z5A-DZTR')} />
      </IdiomaDeLaPagina>,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => verificar.mockReset());
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
});

const texto = () => document.body.textContent ?? '';

const AUTENTICO = {
  autentico: true,
  motivo: null,
  codigo: '5Z5A-DZTR',
  nombreEnmascarado: 'Mor*** Mor***',
  puntaje: 72,
  letra: 'B',
  veredicto: 'CON_CONDICIONES',
  canonMaximoCop: 1_500_000,
  resumen: {
    historial: { mesesObservados: 12, porcentajeATiempo: 83 },
    estudioDel: null,
    condiciones: ['Codeudor, fiador o póliza de arrendamiento (una de las tres)'],
    explicacion: [],
  },
  emitidoEl: '2026-10-18T15:00:00.000Z',
  venceEl: '2026-12-17T15:00:00.000Z',
};

describe('Verificar una Calificación Leasefy', () => {
  it('en inglés: todo en inglés, la plata en COP y la fecha al estilo de EE. UU.', async () => {
    verificar.mockResolvedValue(AUTENTICO);
    await montar('en');
    const t = texto();
    expect(t).toContain('Verify a Leasefy rating');
    expect(t).toContain('It is authentic and was issued by Leasefy');
    expect(t).toContain('Rent with conditions');
    expect(t).toContain('Maximum rent (COP)');
    expect(t).toContain('1,500,000');
    expect(t).toContain('12 months · 83% on time');
    expect(t).toContain('December 17, 2026');
    expect(t).toContain('Suggested conditions: Co-signer, guarantor or rent insurance (any one of the three)');
    expect(t).toContain('not a credit bureau report');
    for (const es of ['Es auténtico', 'Canon', 'meses', 'a tiempo', 'Codeudor', 'Vale hasta', 'diciembre']) {
      expect(t, es).not.toContain(es);
    }
    expect(document.querySelector('[aria-label="Grade B"]')).not.toBeNull();
    expect(document.querySelector('button[aria-pressed="true"]')?.textContent).toBe('EN');
  });

  it('en español: el texto de siempre', async () => {
    verificar.mockResolvedValue(AUTENTICO);
    await montar('es');
    const t = texto();
    expect(t).toContain('Verificar una Calificación Leasefy');
    expect(t).toContain('Es auténtico y lo emitió Leasefy');
    expect(t).toContain('Se le arrienda con condiciones');
    expect(t).toContain('1.500.000');
    expect(t).toContain('12 meses · 83 % a tiempo');
    expect(t).toContain('17 de diciembre de 2026');
    expect(t).toContain('Condiciones sugeridas: Codeudor, fiador o póliza de arrendamiento (una de las tres)');
    expect(document.querySelector('[aria-label="Letra B"]')).not.toBeNull();
  });

  it('con un mes de historial dice «1 mes» / «1 month»', async () => {
    const unMes = { ...AUTENTICO, resumen: { ...AUTENTICO.resumen, historial: { mesesObservados: 1, porcentajeATiempo: null } } };
    verificar.mockResolvedValue(unMes);
    await montar('es');
    expect(texto()).toContain('1 mes');
    expect(texto()).not.toContain('1 meses');
    act(() => root?.unmount());
    host?.remove();
    verificar.mockResolvedValue(unMes);
    await montar('en');
    expect(texto()).toContain('1 month');
    expect(texto()).not.toContain('1 months');
  });

  it('el que no vale dice por qué, en el idioma de la página', async () => {
    verificar.mockResolvedValue({ autentico: false, motivo: 'VENCIDO' });
    await montar('en');
    expect(texto()).toContain('This is not a valid certificate');
    expect(texto()).toContain('That certificate has expired.');
  });
});
