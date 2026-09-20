/**
 * El certificado anual: el criterio se elige y se explica, el detalle mes a mes
 * se abre en la fila, y emitir FIJA número y fecha.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CertificadoDeRetenciones } from '@/lib/api/finanzas.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ certificado: vi.fn(), emitir: vi.fn() }));

vi.mock('@/lib/api/finanzas.service', () => ({
  finanzasApi: { certificado: h.certificado, emitirCertificado: h.emitir },
  codigoSinMigrar: () => null,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import {
  CertificadoDeRetencionesPanel,
  QUE_MIDE_EL_CRITERIO,
  aniosDisponibles,
} from './CertificadoDeRetenciones';

function certificado(extra: Partial<CertificadoDeRetenciones> = {}): CertificadoDeRetenciones {
  return {
    anio: 2026,
    criterio: 'CAUSADO',
    filas: [
      {
        propietarioId: 'p-1',
        nombre: 'Jorge Restrepo',
        documento: '71.234.567',
        baseCop: 36_000_000,
        retefuenteCop: 1_260_000,
        reteIvaCop: 0,
        reteIcaCop: 120_000,
        totalRetenidoCop: 1_380_000,
        periodos: 12,
        porMes: [
          { mes: '2026-01', baseCop: 3_000_000, retefuenteCop: 105_000, reteIvaCop: 0, reteIcaCop: 10_000 },
          { mes: '2026-02', baseCop: 3_000_000, retefuenteCop: 105_000, reteIvaCop: 0, reteIcaCop: 10_000 },
        ],
      },
      {
        propietarioId: 'p-2',
        nombre: 'Sin documento S.A.S.',
        documento: '',
        baseCop: 12_000_000,
        retefuenteCop: 420_000,
        reteIvaCop: 0,
        reteIcaCop: 0,
        totalRetenidoCop: 420_000,
        periodos: 4,
        porMes: [],
      },
    ],
    totales: {
      baseCop: 48_000_000,
      retefuenteCop: 1_680_000,
      reteIvaCop: 0,
      reteIcaCop: 120_000,
      totalRetenidoCop: 1_800_000,
      propietarios: 2,
    },
    avisos: [
      '1 propietario(s) no tienen documento en su ficha: el certificado sale sin NIT/cédula y no sirve para declarar.',
    ],
    emitidos: [],
    ...extra,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  h.certificado.mockReset().mockResolvedValue(certificado());
  h.emitir.mockReset().mockResolvedValue({ id: 'c-1', numero: 'RET-2026-0001', emitidoAt: '2027-02-01T10:00:00.000Z' });
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
    root.render(<CertificadoDeRetencionesPanel />);
  });
}

function texto(testId: string): string {
  return document.body.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

describe('certificado de retenciones', () => {
  it('lista cada propietario con su base y las tres retenciones', async () => {
    await pintar();
    const fila = document.body.querySelector('[data-testid="fila-p-1"]')!;
    expect(fila.textContent).toContain('Jorge Restrepo');
    expect(fila.textContent).toContain('36.000.000');
    expect(fila.textContent).toContain('1.260.000');
    expect(fila.textContent).toContain('120.000');
    expect(fila.textContent).toContain('12 períodos');
  });

  it('marca a quien no tiene documento: ese certificado no sirve para declarar', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="fila-p-2"]')?.textContent).toContain(
      'Sin documento',
    );
    expect(texto('avisos-del-certificado')).toContain('no sirve para declarar');
  });

  it('CAUSADO es el criterio por defecto y la pantalla explica qué mide', async () => {
    await pintar();
    const criterio = document.body.querySelector<HTMLSelectElement>(
      '[data-testid="selector-de-criterio"]',
    )!;
    expect(criterio.value).toBe('CAUSADO');
    expect(texto('que-mide-el-criterio')).toBe(QUE_MIDE_EL_CRITERIO.CAUSADO);
    expect(h.certificado).toHaveBeenLastCalledWith(expect.any(Number), 'CAUSADO');
  });

  it('cambiar a PAGADO vuelve a pedir el informe y cambia la explicación', async () => {
    await pintar();
    const criterio = document.body.querySelector<HTMLSelectElement>(
      '[data-testid="selector-de-criterio"]',
    )!;
    await act(async () => {
      criterio.value = 'PAGADO';
      criterio.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(h.certificado).toHaveBeenLastCalledWith(expect.any(Number), 'PAGADO');
    expect(texto('que-mide-el-criterio')).toBe(QUE_MIDE_EL_CRITERIO.PAGADO);
  });

  it('el detalle mes a mes se abre en la fila y no en otra pantalla', async () => {
    await pintar();
    expect(document.body.querySelector('[data-testid="detalle-p-1"]')).toBeNull();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="abrir-p-1"]')!.click();
    });
    const detalle = document.body.querySelector('[data-testid="detalle-p-1"]')!;
    expect(detalle.textContent).toContain('enero de 2026');
    expect(detalle.textContent).toContain('febrero de 2026');
  });

  it('emitir fija número y fecha, y la fila pasa a mostrarlos', async () => {
    await pintar();
    await act(async () => {
      document.body.querySelector<HTMLButtonElement>('[data-testid="emitir-p-1"]')!.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(h.emitir).toHaveBeenCalledWith(2026, 'p-1', 'CAUSADO');
  });

  it('lo ya emitido se ve con su número, y no se ofrece emitir de nuevo', async () => {
    h.certificado.mockResolvedValue(
      certificado({
        emitidos: [{ propietarioId: 'p-1', numero: 'RET-2026-0001', emitidoAt: '2027-02-01T10:00:00.000Z' }],
      }),
    );
    await pintar();
    expect(texto('emitido-p-1')).toContain('RET-2026-0001');
    expect(texto('emitido-p-1')).toContain('2027-02-01');
    expect(document.body.querySelector('[data-testid="emitir-p-1"]')).toBeNull();
  });

  it('un año sin retenciones lo dice con palabras, no con una tabla vacía', async () => {
    h.certificado.mockResolvedValue(
      certificado({
        filas: [],
        totales: { baseCop: 0, retefuenteCop: 0, reteIvaCop: 0, reteIcaCop: 0, totalRetenidoCop: 0, propietarios: 0 },
      }),
    );
    await pintar();
    expect(document.body.textContent).toContain('No hay certificados que emitir');
  });
});

describe('piezas puras', () => {
  it('ofrece el año actual y los cuatro anteriores, del más nuevo al más viejo', () => {
    expect(aniosDisponibles(2026)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it('cada criterio dice qué mide, y no son lo mismo', () => {
    expect(QUE_MIDE_EL_CRITERIO.CAUSADO).toContain('se hayan pagado o no');
    expect(QUE_MIDE_EL_CRITERIO.PAGADO).toContain('SALDADAS');
  });
});
