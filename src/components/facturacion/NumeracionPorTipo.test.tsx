/**
 * Un prefijo por TIPO de documento, y los avisos.
 *
 * Lo que protege esta prueba es lo que Nico pidió el 17-09, no el dibujo:
 *
 *  · el sistema AVISA cuando se agota el rango o se vence la resolución, y
 *    lo que BLOQUEA no se ve igual que lo que sólo advierte;
 *  · cada tipo dice con qué resolución se numera y cuál es su próximo número;
 *  · cuando un tipo sale «por la general» se DICE: la inmobiliaria que separó
 *    sus rangos tiene que enterarse;
 *  · sin la migración, esto NO se pinta — una tabla que promete numeración por
 *    tipo donde todavía no existe es peor que no mostrarla.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { NumeracionPorTipo } from './NumeracionPorTipo';
import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service';

function datos(over: Partial<ResolucionesDeLaAgencia> = {}): ResolucionesDeLaAgencia {
  return {
    resoluciones: [],
    vigente: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '18764',
      prefijo: 'FE',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2028-01-15T00:00:00.000Z',
      disponibles: 3801,
      siguiente: 'FE-1200',
    },
    porTipoDisponible: true,
    porTipo: [
      {
        tipo: 'CANON_INQUILINO',
        nombre: 'Canon del inquilino',
        resolucionId: 'res-canon',
        resolucionNumero: '18764',
        prefijo: 'CAN',
        puedeNumerar: true,
        porLaGeneral: false,
        disponibles: 3801,
        siguiente: 'CAN-1200',
        explicacion: null,
      },
      {
        tipo: 'COMISION_PROPIETARIO',
        nombre: 'Comisión al propietario',
        resolucionId: 'res-general',
        resolucionNumero: '99999',
        prefijo: 'FE',
        puedeNumerar: true,
        porLaGeneral: true,
        disponibles: 12,
        siguiente: 'FE-4989',
        explicacion: null,
      },
    ],
    umbrales: { numeros: 100, dias: 30 },
    avisos: [],
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

function pintar(d: ResolucionesDeLaAgencia) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<NumeracionPorTipo datos={d} />);
  });
}

beforeEach(() => {
  host = document.createElement('div');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

describe('NumeracionPorTipo', () => {
  it('pinta una fila por tipo, con su resolución y su próximo número', () => {
    pintar(datos());
    const canon = q('[data-testid="numeracion-CANON_INQUILINO"]')!;
    expect(canon.textContent).toContain('Canon del inquilino');
    expect(canon.textContent).toContain('18764');
    expect(canon.textContent).toContain('CAN-1200');
  });

  it('🔴 dice cuándo un tipo sale POR LA GENERAL', () => {
    pintar(datos());
    const comision = q('[data-testid="numeracion-COMISION_PROPIETARIO"]')!;
    expect(comision.textContent).toContain('resolución general');
    // Y el que tiene la suya propia NO lo dice.
    expect(
      q('[data-testid="numeracion-CANON_INQUILINO"]')!.textContent,
    ).not.toContain('resolución general');
  });

  it('🔴 lo que BLOQUEA se muestra aparte de lo que sólo advierte', () => {
    pintar(
      datos({
        avisos: [
          {
            tipo: 'COMISION_PROPIETARIO',
            clase: 'BLOQUEA',
            motivo: 'RANGO_AGOTADO',
            resolucionId: 'res-general',
            resolucionNumero: '99999',
            disponibles: 0,
            diasParaVencer: 300,
            explicacion:
              'Comisión al propietario: la resolución 99999 agotó su rango.',
          },
          {
            tipo: 'CANON_INQUILINO',
            clase: 'ADVIERTE',
            motivo: 'RANGO_POR_AGOTARSE',
            resolucionId: 'res-canon',
            resolucionNumero: '18764',
            disponibles: 8,
            diasParaVencer: 300,
            explicacion:
              'Canon del inquilino: a la resolución 18764 le quedan 8 números.',
          },
        ],
      }),
    );
    const bloqueos = q('[data-testid="numeracion-bloqueos"]')!;
    expect(bloqueos.textContent).toContain('agotó su rango');
    const advertencias = q('[data-testid="numeracion-advertencias"]')!;
    expect(advertencias.textContent).toContain('le quedan 8 números');
    // 🔴 El bloqueo NO está dentro del bloque de advertencias.
    expect(
      q('[data-testid="aviso-bloquea-COMISION_PROPIETARIO"]'),
    ).not.toBeNull();
    expect(advertencias.textContent).not.toContain('agotó su rango');
  });

  it('el aviso dice desde qué umbral suena', () => {
    pintar(
      datos({
        avisos: [
          {
            tipo: 'CANON_INQUILINO',
            clase: 'ADVIERTE',
            motivo: 'POR_VENCER',
            resolucionId: 'res-canon',
            resolucionNumero: '18764',
            disponibles: 3801,
            diasParaVencer: 8,
            explicacion: 'Canon del inquilino: la resolución vence en 8 días.',
          },
        ],
        umbrales: { numeros: 50, dias: 15 },
      }),
    );
    expect(
      q('[data-testid="numeracion-advertencias"]')!.textContent,
    ).toContain('50 números');
  });

  it('🔴 sin la migración NO se pinta nada', () => {
    pintar(datos({ porTipoDisponible: false }));
    expect(q('[data-testid="numeracion-por-tipo"]')).toBeNull();
    expect(host.textContent).toBe('');
  });

  it('sin avisos no hay ningún bloque de alerta', () => {
    pintar(datos());
    expect(q('[data-testid="numeracion-bloqueos"]')).toBeNull();
    expect(q('[data-testid="numeracion-advertencias"]')).toBeNull();
    expect(q('[data-testid="numeracion-tabla"]')).not.toBeNull();
  });
});
