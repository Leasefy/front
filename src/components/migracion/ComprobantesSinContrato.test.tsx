/**
 * Lo que ya está guardado sin contrato: por tipo, por qué, y qué pedirle al
 * sistema anterior cuando el export no trae el cliente de las facturas.
 *
 * Los números de acá son los de la inmobiliaria migrada el 2026-09-16 (sólo
 * conteos, ningún dato de una persona).
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { sinContrato } = vi.hoisted(() => ({ sinContrato: vi.fn() }));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return {
    ...actual,
    contabilidadApi: {
      ...actual.contabilidadApi,
      migracion: {
        ...actual.contabilidadApi.migracion,
        documentos: { ...actual.contabilidadApi.migracion.documentos, sinContrato },
      },
    },
  };
});

import type { ResumenSinContrato } from '@/lib/api/contabilidad.service';
import { ComprobantesSinContrato } from './ComprobantesSinContrato';

const motivos = (
  over: Partial<ResumenSinContrato['porClase']['factura']['motivos']> = {},
) => ({
  EXPORT_SIN_TERCERO: 0,
  REFERENCIA_SIN_RESOLVER: 0,
  TERCERO_SIN_CONTRATO: 0,
  CONCEPTO_SIN_TERCERO: 0,
  ...over,
});

const MIGRADA: ResumenSinContrato = {
  total: 115_397,
  conContrato: 48_199,
  sinContrato: 67_198,
  porClase: {
    factura: {
      total: 56_492,
      conContrato: 0,
      sinContrato: 56_492,
      motivos: motivos({ EXPORT_SIN_TERCERO: 56_492 }),
    },
    ingreso: {
      total: 30_214,
      conContrato: 28_485,
      sinContrato: 1_729,
      motivos: motivos({
        EXPORT_SIN_TERCERO: 4,
        REFERENCIA_SIN_RESOLVER: 37,
        TERCERO_SIN_CONTRATO: 1_134,
        CONCEPTO_SIN_TERCERO: 554,
      }),
    },
    egreso: {
      total: 24_189,
      conContrato: 19_708,
      sinContrato: 4_481,
      motivos: motivos({
        EXPORT_SIN_TERCERO: 869,
        REFERENCIA_SIN_RESOLVER: 33,
        TERCERO_SIN_CONTRATO: 2_052,
        CONCEPTO_SIN_TERCERO: 1_527,
      }),
    },
    otro: {
      total: 4_502,
      conContrato: 6,
      sinContrato: 4_496,
      motivos: motivos({ EXPORT_SIN_TERCERO: 938, TERCERO_SIN_CONTRATO: 3, CONCEPTO_SIN_TERCERO: 3_555 }),
    },
  },
};

let contenedor: HTMLDivElement;
let raiz: Root;

async function montar(version = 0) {
  await act(async () => {
    raiz.render(<ComprobantesSinContrato version={version} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const dentro = (testid: string) =>
  contenedor.querySelector(`[data-testid="${testid}"]`)?.textContent ?? '';

beforeEach(() => {
  vi.clearAllMocks();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contenedor.remove();
});

describe('<ComprobantesSinContrato>', () => {
  it('dice cuántos quedaron sin inquilino de todo lo guardado', async () => {
    sinContrato.mockResolvedValue(MIGRADA);
    await montar();

    expect(dentro('sin-contrato')).toContain('67.198 de 115.397 comprobantes');
  });

  it('separa facturas, ingresos y egresos, cada uno con sus números', async () => {
    sinContrato.mockResolvedValue(MIGRADA);
    await montar();

    expect(dentro('sin-contrato-factura')).toMatch(/Facturas56\.492056\.492/);
    expect(dentro('sin-contrato-ingreso')).toMatch(/Comprobantes de ingreso30\.21428\.4851\.729/);
    expect(dentro('sin-contrato-egreso')).toMatch(/Comprobantes de egreso24\.18919\.7084\.481/);
  });

  it('dice por qué, con cuántos en cada motivo, y no pinta los motivos en cero', async () => {
    sinContrato.mockResolvedValue(MIGRADA);
    await montar();

    expect(dentro('sin-contrato-ingreso-TERCERO_SIN_CONTRATO')).toContain(
      '1.134 nombra a alguien que no es inquilino ni propietario',
    );
    expect(dentro('sin-contrato-ingreso-REFERENCIA_SIN_RESOLVER')).toContain('«CONTRATO N»');
    expect(
      contenedor.querySelector('[data-testid="sin-contrato-factura-TERCERO_SIN_CONTRATO"]'),
    ).toBeNull();
  });

  it('🔴 si el export no trae el cliente de las facturas, dice qué pedirle al sistema anterior', async () => {
    sinContrato.mockResolvedValue(MIGRADA);
    await montar();

    const aviso = dentro('sin-contrato-que-pedir');
    expect(aviso).toContain('56.492 facturas no tienen cliente porque el export no lo trae');
    expect(aviso).toContain('volver a subir el mismo archivo no lo arregla');
    expect(aviso).toContain('El reporte de facturas emitidas');
    expect(aviso).toContain('el NIT o la cédula y el nombre del cliente');
    expect(aviso).toContain('el consecutivo del contrato');
    expect(aviso).toContain('El libro auxiliar por tercero');
  });

  it('sin facturas sin cliente no muestra el aviso', async () => {
    sinContrato.mockResolvedValue({
      ...MIGRADA,
      porClase: {
        ...MIGRADA.porClase,
        factura: { total: 10, conContrato: 10, sinContrato: 0, motivos: motivos() },
      },
    });
    await montar();

    expect(contenedor.querySelector('[data-testid="sin-contrato-que-pedir"]')).toBeNull();
  });

  it('con nada guardado no dibuja nada', async () => {
    sinContrato.mockResolvedValue({
      total: 0,
      conContrato: 0,
      sinContrato: 0,
      porClase: {
        factura: { total: 0, conContrato: 0, sinContrato: 0, motivos: motivos() },
        ingreso: { total: 0, conContrato: 0, sinContrato: 0, motivos: motivos() },
        egreso: { total: 0, conContrato: 0, sinContrato: 0, motivos: motivos() },
        otro: { total: 0, conContrato: 0, sinContrato: 0, motivos: motivos() },
      },
    });
    await montar();

    expect(contenedor.querySelector('[data-testid="sin-contrato"]')).toBeNull();
  });

  it('un fallo se dice como fallo y se puede reintentar', async () => {
    sinContrato.mockRejectedValueOnce(new Error('se cayó')).mockResolvedValue(MIGRADA);
    await montar();

    expect(contenedor.querySelector('[data-testid="sin-contrato-error"]')).not.toBeNull();
    await act(async () => {
      (contenedor.querySelector('[data-testid="sin-contrato-error"] button') as HTMLButtonElement).click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(dentro('sin-contrato')).toContain('67.198');
  });

  it('cuando cambia la versión (terminó una migración) vuelve a contar', async () => {
    sinContrato.mockResolvedValue(MIGRADA);
    await montar(0);
    await montar(1);

    expect(sinContrato).toHaveBeenCalledTimes(2);
  });
});
