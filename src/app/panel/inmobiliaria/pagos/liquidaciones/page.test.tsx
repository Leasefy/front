/**
 * page.test.tsx — Liquidaciones.
 *
 * Era una vitrina: una constante `EJEMPLO` con $2.500.000 escritos a mano, la
 * fórmula pintada sobre esa constante con un badge «Ejemplo», y la tabla de
 * egresos con un vacío permanente. Cero `fetch`, mientras el back ya calculaba
 * el neto por propietario en `GET /inmobiliaria/dispersiones/preview`.
 *
 * Lo que muerde acá: que la pantalla PIDA los datos, que pinte los del back
 * —no los del ejemplo— y que un error se pueda reintentar en vez de quedar en
 * una tabla vacía indistinguible de «no hay nada».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}));

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

const preview = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { preview: (m: string) => preview(m) },
}));

import LiquidacionesPage from './page';

function vistaPrevia(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-02',
    totalPropietarios: 2,
    yaGenerados: 1,
    totalAGirar: 540_000,
    totalComisiones: 100_000,
    propietarios: [
      {
        propietarioId: 'p-1',
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: 'Bancolombia',
        propietarioBankAccount: '123456',
        yaExiste: false,
        totalCollected: 600_000,
        totalCommission: 60_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 540_000,
        items: [],
      },
      {
        propietarioId: 'p-2',
        propietarioName: 'Marcela Ochoa',
        propietarioBankName: null,
        propietarioBankAccount: null,
        yaExiste: true,
        totalCollected: 400_000,
        totalCommission: 40_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 360_000,
        items: [],
      },
    ],
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<LiquidacionesPage />);
  });
  // Deja correr el `await` del fetch simulado.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  preview.mockReset();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
});

const texto = () => host.textContent ?? '';
const filas = () =>
  Array.from(host.querySelectorAll('[data-testid="tesoreria-fila"]'));

describe('Liquidaciones pide y pinta la plata real del mes', () => {
  it('llama a la vista previa del back con el mes en curso', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(preview).toHaveBeenCalledTimes(1);
    expect(preview.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}$/);
  });

  it('pinta una fila por propietario, con su neto', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(filas()).toHaveLength(2);
    expect(texto()).toContain('Jorge Restrepo');
    expect(texto()).toContain('Marcela Ochoa');
  });

  it('AL REVÉS: el canon de ejemplo ($2.500.000) ya no aparece en ninguna parte', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    // La vitrina vieja: `EJEMPLO.canonRecibido = 2_500_000` y el badge «Ejemplo».
    expect(texto()).not.toContain('2.500.000');
    expect(texto()).not.toContain('inmobiliaria.tesoreria.ejemplo');
  });

  it('el total del mes es la suma de los netos del back, no una fórmula inventada', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    const total = host.querySelector('[data-testid="tesoreria-neto-total"]');
    // 540.000 + 360.000
    expect(total?.textContent).toContain('900.000');
  });

  it('sin propietarios muestra el vacío, no una tabla con números de mentira', async () => {
    preview.mockResolvedValue(
      vistaPrevia({ propietarios: [], totalPropietarios: 0, totalAGirar: 0 }),
    );
    await montar();

    expect(filas()).toHaveLength(0);
    expect(texto()).toContain('inmobiliaria.tesoreria.emptyTitle');
  });

  it('un error se ve, dice el motivo del back y se puede reintentar', async () => {
    preview.mockRejectedValueOnce(
      new Error('«Apto 101» tiene 2 copropietarios y el cobro lleva impuestos'),
    );
    await montar();

    const alerta = host.querySelector('[role="alert"]');
    expect(alerta).not.toBeNull();
    expect(texto()).toContain('copropietarios');

    preview.mockResolvedValue(vistaPrevia());
    const reintentar = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.tesoreria.retry'),
    );
    expect(reintentar).toBeDefined();

    await act(async () => {
      reintentar!.click();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(preview).toHaveBeenCalledTimes(2);
    expect(filas()).toHaveLength(2);
  });
});
