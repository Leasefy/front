import * as React from 'react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const m = vi.hoisted(() => ({
  liquidacionDelMes: vi.fn(),
  porGirar: vi.fn(),
  candidatos: vi.fn(),
  listar: vi.fn(),
}));
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  dispersionesApi: { liquidacionDelMes: m.liquidacionDelMes, porGirar: m.porGirar },
}));
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  RECURSO_DE_LOTES: 'lotes-de-dispersion',
  lotesDeDispersionApi: { candidatos: m.candidatos, listar: m.listar },
}));

import { LoQueFaltaDelMes } from './LoQueFaltaDelMes';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  m.porGirar.mockResolvedValue({ hastaMes: '2026-10', porGirarCop: 2_371_800, proximosGiros: { desdeMes: '2026-11', hastaMes: '2027-01', totalCop: 0 } });
  m.candidatos.mockResolvedValue({ candidatos: [], sugeridos: [], totalCop: 0, cantidad: 0 });
  m.listar.mockResolvedValue([]);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

async function montar(paso: 'liquidar' | 'revisar' = 'liquidar') {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<LoQueFaltaDelMes paso={paso} mes="2026-10" />);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const fila = (estado: string, dispersiones: { id: string; status: string; aGirarCop: number }[]) => ({
  propietarioId: Math.random().toString(),
  propietarioName: 'Ana',
  estado,
  mes: {},
  generado: null,
  pendiente: null,
  dispersiones,
  cuentaDeDestino: { banco: null, cuenta: null },
});

describe('Giros — la tarjeta «Lo que falta del mes» (decisión 17 de Nico)', () => {
  it('arranca con la respuesta y ofrece el botón del paso que toca', async () => {
    m.liquidacionDelMes.mockResolvedValue({ propietarios: [fila('GENERADA', [{ id: '1', status: 'DISP_PENDING', aGirarCop: 2_371_800 }])] });
    await montar('liquidar');
    expect(host.querySelector('[data-testid="respuesta-del-mes"]')?.textContent).toContain('Falta girar');
    expect(host.querySelector('[data-testid="respuesta-del-mes"]')?.textContent).toContain('1 propietario');
    const accion = host.querySelector('[data-testid="accion-del-paso-revisar"]');
    expect(accion?.textContent).toBe('Revisar 1 giro');
    expect(accion?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/dispersiones?mes=2026-10');
    expect(host.querySelector('[data-testid="paso-del-mes-liquidar"] [aria-current="page"]')).not.toBeNull();
  });

  it('🔴 con el mes girado entero no se contradice con «Por girar»: dice que lo que queda es de otros meses', async () => {
    m.liquidacionDelMes.mockResolvedValue({ propietarios: [fila('GIRADA', [{ id: '1', status: 'DISP_COMPLETED', aGirarCop: 900_000 }])] });
    m.listar.mockResolvedValue([{ id: 'l', month: '2026-10', estado: 'PAGADO' }]);
    await montar();
    expect(host.querySelector('[data-testid="respuesta-del-mes"]')?.textContent).toContain('está girado completo');
    expect(host.querySelector('[data-testid="por-girar-de-otros-meses"]')?.textContent).toContain('es de otros meses');
    expect(host.querySelector('[data-testid^="accion-del-paso-"]')).toBeNull();
  });

  it('si la liquidación no se puede leer, lo dice y no inventa plata', async () => {
    m.liquidacionDelMes.mockRejectedValue(new Error('403'));
    await montar();
    expect(host.querySelector('[data-testid="respuesta-del-mes"]')?.textContent).toContain('No se pudo leer cuánto falta girar');
  });
});
