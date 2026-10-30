/**
 * Nico (29-10): «sí, hazlo» — la sección «Convivencia» del contrato: los
 * llamados de atención que Vinci cuenta en la renovación.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listar = vi.fn();
vi.mock('@/lib/api/convivencia.service', () => ({
  convivenciaApi: { listar: (...a: unknown[]) => listar(...a), registrar: vi.fn(), anular: vi.fn() },
}));

import { LlamadosDeAtencion } from './LlamadosDeAtencion';

let caja: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  caja = document.createElement('div');
  document.body.appendChild(caja);
  raiz = createRoot(caja);
  listar.mockReset();
});
afterEach(() => {
  act(() => raiz.unmount());
  caja.remove();
});

async function pintar(puedeEditar = true) {
  await act(async () => raiz.render(<LlamadosDeAtencion contractId="c-1" puedeEditar={puedeEditar} />));
  await act(async () => {
    await Promise.resolve();
  });
}

const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`);

describe('<LlamadosDeAtencion>', () => {
  it('sin llamados: el vacío con su ilustración y el botón para registrar', async () => {
    listar.mockResolvedValue({ disponible: true, llamados: [], porMotivo: [] });
    await pintar();
    expect($('llamados-vacio')?.textContent).toContain('Sin llamados de atención');
    expect($('registrar-llamado')).not.toBeNull();
  });

  it('lista los llamados con su motivo, quién lo reportó y el aviso al llegar a 3', async () => {
    const llamado = (id: string, fecha: string) => ({
      id,
      motivo: 'ruido',
      fecha,
      quePaso: 'Música alta hasta las 3 a. m.',
      loReporto: 'administracion',
      registradoPor: 'Ana Gómez',
      creadoEn: `${fecha}T10:00:00Z`,
    });
    listar.mockResolvedValue({
      disponible: true,
      llamados: [llamado('a', '2026-10-20'), llamado('b', '2026-10-10'), llamado('c', '2026-10-02')],
      porMotivo: [{ motivo: 'ruido', cuantos: 3 }],
    });
    await pintar();
    expect(document.querySelectorAll('[data-testid="llamado"]')).toHaveLength(3);
    expect($('llamados-por-motivo')?.textContent).toContain('Ruido · 3');
    expect($('llamados-aviso')?.textContent).toContain('Ya van 3 por ruido');
    expect(caja.textContent).toContain('lo reportó la administración');
    expect(caja.textContent).toContain('Lo anotó Ana Gómez.');
  });

  it('sin la actualización del back lo dice y no ofrece registrar', async () => {
    listar.mockResolvedValue({ disponible: false, llamados: [], porMotivo: [] });
    await pintar();
    expect($('llamados-sin-actualizacion')).not.toBeNull();
    expect($('registrar-llamado')).toBeNull();
  });

  it('quien sólo ve contratos no tiene el botón', async () => {
    listar.mockResolvedValue({ disponible: true, llamados: [], porMotivo: [] });
    await pintar(false);
    expect($('registrar-llamado')).toBeNull();
  });
});
