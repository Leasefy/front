/**
 * La pantalla de la resolución de la DIAN.
 *
 * Lo que se protege: que la primera línea responda «¿puedo facturar?» y que
 * cuando la respuesta es no diga POR QUÉ (no cargada, vencida, anulada, rango
 * agotado se arreglan distinto); que el formulario no deje mandar una
 * resolución a medias; que el prefijo pueda ir vacío; y que las fechas se
 * pinten en día civil, no corridas un día por la zona horaria.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { ResolucionesDeLaAgencia } from '@/lib/api/facturacion-por-mes.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const resolucionesMock = vi.fn();
const crearMock = vi.fn();
const anularMock = vi.fn();
const toastOk = vi.fn();
const toastErr = vi.fn();

vi.mock('@/lib/api/facturacion-por-mes.service', async () => {
  const real = await vi.importActual<
    typeof import('@/lib/api/facturacion-por-mes.service')
  >('@/lib/api/facturacion-por-mes.service');
  return {
    ...real,
    facturacionPorMesService: {
      resoluciones: (...a: unknown[]) => resolucionesMock(...a),
      crearResolucion: (...a: unknown[]) => crearMock(...a),
      anularResolucion: (...a: unknown[]) => anularMock(...a),
    },
  };
});

vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...a: unknown[]) => toastOk(...a),
    error: (...a: unknown[]) => toastErr(...a),
  },
}));

import { ResolucionDeFacturacion } from './ResolucionDeFacturacion';

function respuesta(
  over: Partial<ResolucionesDeLaAgencia> = {},
): ResolucionesDeLaAgencia {
  return {
    resoluciones: [
      {
        id: 'res-1',
        numero: '18764003394379',
        fechaResolucion: '2026-01-15T00:00:00.000Z',
        prefijo: 'FE',
        desde: 1,
        hasta: 5000,
        vigenteDesde: '2026-01-15T00:00:00.000Z',
        vigenteHasta: '2028-01-15T00:00:00.000Z',
        ultimoNumeroUsado: 1199,
        anulada: false,
        usados: 1199,
        disponibles: 3801,
        puedeNumerar: true,
        motivo: null,
        explicacion: null,
        siguiente: 'FE-1200',
      },
    ],
    vigente: {
      puedeNumerar: true,
      motivo: null,
      explicacion: null,
      numero: '18764003394379',
      prefijo: 'FE',
      desde: 1,
      hasta: 5000,
      vigenteHasta: '2028-01-15T00:00:00.000Z',
      disponibles: 3801,
      siguiente: 'FE-1200',
    },
    ...over,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<ResolucionDeFacturacion />);
  });
}

function escribir(testid: string, valor: string) {
  const input = host.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!;
  setter.call(input, valor);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  resolucionesMock.mockReset().mockResolvedValue(respuesta());
  crearMock.mockReset().mockResolvedValue({});
  anularMock.mockReset().mockResolvedValue({});
  toastOk.mockReset();
  toastErr.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (s: string) => host.querySelector(s);

describe('ResolucionDeFacturacion', () => {
  it('lo primero que dice es si hoy se puede facturar y con qué número sigue', async () => {
    await montar();
    const estado = q('[data-testid="resolucion-estado"]')!;
    expect(estado.textContent).toContain('18764003394379');
    expect(estado.textContent).toContain('FE-1200');
    expect(estado.textContent).toContain('3801');
    // 🔴 En día civil: `new Date('2028-01-15T00:00:00Z')` en Bogotá es el 14.
    expect(estado.textContent).toContain('15/01/2028');
  });

  it('🔴 sin resolución vigente dice el motivo, que es lo que se arregla', async () => {
    resolucionesMock.mockResolvedValue(
      respuesta({
        resoluciones: [],
        vigente: {
          puedeNumerar: false,
          motivo: 'VENCIDA',
          explicacion: 'La resolución 999 venció el 31/01/2026.',
          numero: '999',
          prefijo: 'FE',
          desde: 1,
          hasta: 100,
          vigenteHasta: '2026-01-31T00:00:00.000Z',
          disponibles: 0,
          siguiente: null,
        },
      }),
    );
    await montar();
    expect(q('[data-testid="resolucion-estado"]')!.textContent).toContain(
      'venció el 31/01/2026',
    );
    expect(q('[data-testid="sin-datos"]')).not.toBeNull();
  });

  it('el listado muestra rango, usados, disponibles y vigencia', async () => {
    await montar();
    const fila = q('[data-testid="resolucion-res-1"]')!;
    expect(fila.textContent).toContain('1–5000');
    expect(fila.textContent).toContain('1199');
    expect(fila.textContent).toContain('3801');
    expect(fila.textContent).toContain('15/01/2026 – 15/01/2028');
  });

  it('🔴 el botón no deja mandar una resolución a medias', async () => {
    await montar();
    const boton = q('[data-testid="resolucion-guardar"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    // Falta la vigencia final: sigue apagado.
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).disabled,
    ).toBe(true);

    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    expect(
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('el prefijo puede ir vacío: hay resoluciones sin prefijo', async () => {
    await montar();
    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(crearMock).toHaveBeenCalledWith({
      numero: '999',
      fechaResolucion: '2026-01-15',
      prefijo: '',
      desde: 1,
      hasta: 100,
      vigenteDesde: '2026-01-15',
      vigenteHasta: '2027-01-15',
    });
    expect(toastOk).toHaveBeenCalled();
    // Se vuelve a pedir el listado: el estado de arriba tiene que reflejarlo.
    expect(resolucionesMock).toHaveBeenCalledTimes(2);
  });

  it('anular pide la anulación y vuelve a leer', async () => {
    await montar();
    await act(async () => {
      (q('[data-testid="anular-res-1"]') as HTMLButtonElement).click();
    });
    expect(anularMock).toHaveBeenCalledWith('res-1');
    expect(resolucionesMock).toHaveBeenCalledTimes(2);
  });

  it('un fallo al cargar se dice y no se pinta como éxito', async () => {
    crearMock.mockRejectedValue(new Error('Esa resolución ya está cargada.'));
    await montar();
    escribir('resolucion-campo-numero', '999');
    escribir('resolucion-campo-fecha', '2026-01-15');
    escribir('resolucion-campo-desde', '1');
    escribir('resolucion-campo-hasta', '100');
    escribir('resolucion-campo-vigente-desde', '2026-01-15');
    escribir('resolucion-campo-vigente-hasta', '2027-01-15');
    await act(async () => {
      (q('[data-testid="resolucion-guardar"]') as HTMLButtonElement).click();
    });
    expect(toastErr).toHaveBeenCalledWith('Esa resolución ya está cargada.');
    expect(toastOk).not.toHaveBeenCalled();
  });
});
