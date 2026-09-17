/**
 * Los costos de la plata: el EJEMPLO que devuelve el back se pinta entero
 * —rótulo, valor, quién lo asume y la cuenta escrita— y se actualiza al
 * guardar. Acá no se recalcula nada: sería una segunda fórmula para la misma
 * plata.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CostosDeLaPlata } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ costos: vi.fn(), guardar: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { costos: h.costos, guardarCostos: h.guardar },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { SeccionCostosDeLaPlata, comoNumero } from './SeccionCostosDeLaPlata';

function datos(extra: Partial<CostosDeLaPlata> = {}): CostosDeLaPlata {
  return {
    disponible: true,
    motivo: null,
    config: {
      gmfPorMil: 4,
      trasladaGmfAlPropietario: false,
      costoPasarelaPct: 2.65,
      costoPasarelaFijoCop: 900,
      trasladaPasarelaAlInquilino: false,
    },
    ejemplo: {
      giroCop: 2_400_000,
      gmf: {
        valorCop: 9600,
        asume: 'INMOBILIARIA',
        rotulo: 'Gravamen a los movimientos financieros (4x1000)',
        detalle:
          '4 por mil sobre $2.400.000 = $9.600. Lo asume la inmobiliaria contra su comisión: NO baja lo que se le gira al propietario.',
        configurado: true,
      },
      recaudoCop: 1_000_000,
      pasarela: {
        valorCop: 27_400,
        asume: 'INMOBILIARIA',
        rotulo: 'Costo de la pasarela de pago',
        detalle: '2.65 % de $1.000.000 = $26.500 + fijo $900 = $27.400.',
        configurado: true,
      },
    },
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.costos.mockReset().mockResolvedValue(datos());
  h.guardar.mockReset().mockImplementation(async () =>
    datos({
      config: { ...datos().config, trasladaGmfAlPropietario: true },
      ejemplo: {
        ...datos().ejemplo,
        gmf: {
          ...datos().ejemplo.gmf,
          asume: 'PROPIETARIO',
          detalle:
            '4 por mil sobre $2.400.000 = $9.600. La inmobiliaria lo traslada al propietario: sale como línea aparte de su liquidación.',
        },
      },
    }),
  );
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
    root.render(<SeccionCostosDeLaPlata />);
  });
}

function texto(testId: string): string {
  return document.body.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

describe('costos de la plata', () => {
  it('pinta el ejemplo del back entero: rótulo, valor, quién asume y la cuenta', async () => {
    await pintar();
    const gmf = texto('ejemplo-gmf');
    expect(gmf).toContain('Sobre un giro de');
    expect(gmf).toContain('Gravamen a los movimientos financieros (4x1000)');
    expect(gmf).toContain('9.600');
    expect(gmf).toContain('Lo asume la inmobiliaria');
    expect(gmf).toContain('4 por mil sobre');

    const pasarela = texto('ejemplo-pasarela');
    expect(pasarela).toContain('27.400');
    expect(pasarela).toContain('fijo $900');
  });

  it('las dos perillas nacen apagadas: por defecto los asume la inmobiliaria', async () => {
    await pintar();
    expect(
      document.body.querySelector('[data-testid="traslada-gmf"]')?.getAttribute('aria-checked'),
    ).toBe('false');
    expect(
      document.body
        .querySelector('[data-testid="traslada-pasarela"]')
        ?.getAttribute('aria-checked'),
    ).toBe('false');
  });

  it('guardar manda los cinco campos y repinta el ejemplo con la respuesta', async () => {
    await pintar();
    await act(async () => {
      (document.body.querySelector('[data-testid="traslada-gmf"]') as HTMLButtonElement).click();
    });
    await act(async () => {
      [...document.body.querySelectorAll('button')]
        .find((b) => b.textContent?.trim() === 'Guardar')!
        .click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.guardar).toHaveBeenCalledWith({
      gmfPorMil: 4,
      trasladaGmfAlPropietario: true,
      costoPasarelaPct: 2.65,
      costoPasarelaFijoCop: 900,
      trasladaPasarelaAlInquilino: false,
    });
    expect(texto('ejemplo-gmf')).toContain('Se le traslada al propietario');
  });

  it('un costo sin configurar dice que no se calcula, y no inventa un cero', async () => {
    h.costos.mockResolvedValue(
      datos({
        config: { ...datos().config, gmfPorMil: null },
        ejemplo: {
          ...datos().ejemplo,
          gmf: {
            valorCop: 0,
            asume: 'INMOBILIARIA',
            rotulo: 'Gravamen a los movimientos financieros (4x1000)',
            detalle: 'La inmobiliaria no configuró el 4x1000: no se calcula.',
            configurado: false,
          },
        },
      }),
    );
    await pintar();
    expect(texto('ejemplo-gmf')).toContain('no configuró el 4x1000');
    expect(texto('ejemplo-gmf')).not.toContain('$0');
    expect(document.body.querySelector<HTMLInputElement>('#gmf-por-mil')!.value).toBe('');
  });

  it('sin la migración lo explica y no deja guardar', async () => {
    h.costos.mockResolvedValue(
      datos({ disponible: false, motivo: 'Falta la migración 20260917220000_costos_de_la_plata_y_medios.' }),
    );
    await pintar();
    expect(texto('sin-la-migracion')).toContain('20260917220000_costos_de_la_plata_y_medios');
    expect(
      [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Guardar')!
        .disabled,
    ).toBe(true);
  });
});

describe('leer un número escrito a mano', () => {
  it('vacío es «sin configurar», no cero', () => {
    expect(comoNumero('')).toBeNull();
    expect(comoNumero('   ')).toBeNull();
    expect(comoNumero('abc')).toBeNull();
    expect(comoNumero('-3')).toBeNull();
  });

  it('acepta la coma decimal, que es como se escribe acá', () => {
    expect(comoNumero('2,65')).toBe(2.65);
    expect(comoNumero('4')).toBe(4);
    expect(comoNumero('0')).toBe(0);
  });
});
