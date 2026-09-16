/**
 * Liquidaciones — «Canon recibido» que nadie pagó.
 *
 * 🔴 El resumen del mes decía «Canon recibido» sobre `totalCollected` de la
 * vista previa, y el back liquida por defecto con base CAUSADO: el canon de las
 * cuotas del mes, haya pagado el inquilino o no (se puede girar más de lo
 * recaudado). El rótulo sigue a `vista.base`; el número no cambia.
 *
 * Con el diccionario REAL (es.json), para leer lo que ve la persona.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}));
// El Select de Radix no abre en happy-dom y acá no hace falta: se pinta plano.
vi.mock('@/components/ui/select', async () => {
  const R = await import('react');
  const Pasar = ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children);
  return {
    Select: Pasar,
    SelectTrigger: Pasar,
    SelectValue: () => null,
    SelectContent: Pasar,
    SelectItem: Pasar,
  };
});

const preview = vi.fn();
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { preview: (m: string) => preview(m) },
}));

import LiquidacionesPage from './page';

function vistaPrevia(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-09',
    base: 'CAUSADO',
    totalPropietarios: 1,
    yaGenerados: 0,
    totalAGirar: 1_800_000,
    totalComisiones: 200_000,
    propietarios: [
      {
        propietarioId: 'p-1',
        propietarioName: 'Jorge Restrepo',
        propietarioBankName: 'Bancolombia',
        propietarioBankAccount: '123456',
        yaExiste: false,
        totalCollected: 2_000_000,
        totalCommission: 200_000,
        totalConceptosAFavor: 0,
        totalConceptosACargo: 0,
        totalDeTerceros: 0,
        netToPropietario: 1_800_000,
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

const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);

describe('Liquidaciones rotula el canon con la base del back', () => {
  it('🔴 con base CAUSADO dice «Canon causado», explica qué es, y la pantalla no dice «recibido» ni «recaudado»', async () => {
    preview.mockResolvedValue(vistaPrevia());
    await montar();

    expect(q('tesoreria-rotulo-canon')?.textContent).toBe('Canon causado');
    expect(q('tesoreria-que-es-el-canon')?.textContent).toContain('aunque el inquilino no haya pagado');
    expect(host.textContent).not.toMatch(/recibid|recaud/i);
    // El número es el mismo de antes.
    expect(q('tesoreria-rotulo-canon')?.nextElementSibling?.textContent).toMatch(/2\.000\.000/);
  });

  it('🔴 si la vista previa no trae la base, es la del endpoint sin `?base=`: CAUSADO', async () => {
    preview.mockResolvedValue(vistaPrevia({ base: undefined }));
    await montar();

    expect(q('tesoreria-rotulo-canon')?.textContent).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recibid|recaud/i);
  });

  it('con base RECAUDADO sí dice «Canon recaudado»', async () => {
    preview.mockResolvedValue(vistaPrevia({ base: 'RECAUDADO' }));
    await montar();

    expect(q('tesoreria-rotulo-canon')?.textContent).toBe('Canon recaudado');
    expect(q('tesoreria-que-es-el-canon')?.textContent).toContain('ya pagó completas');
  });

  it('el vacío tampoco habla de cobros pagados cuando la base es CAUSADO', async () => {
    preview.mockResolvedValue(vistaPrevia({ propietarios: [], totalPropietarios: 0, totalAGirar: 0 }));
    await montar();

    expect(host.textContent).toContain('haya pagado o no el inquilino');
    expect(host.textContent).not.toMatch(/cobros del mes queda pagado/);
  });

  it('quien queda debiendo, con base CAUSADO, no se compara contra «lo recaudado»', async () => {
    const [p] = vistaPrevia().propietarios;
    preview.mockResolvedValue(
      vistaPrevia({
        propietarios: [{ ...p, totalCollected: 0, totalCommission: 0, totalConceptosACargo: 900_000, netToPropietario: -900_000 }],
      }),
    );
    await montar();

    const aviso = q('tesoreria-quedan-debiendo')?.textContent ?? '';
    expect(aviso).toContain('supera su canon causado');
    expect(aviso).not.toMatch(/recaud/i);
  });
});
