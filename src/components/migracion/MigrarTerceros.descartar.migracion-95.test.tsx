/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — TE-08: «descartar (con
 * confirmación)». En la agencia A, marcar a mano una fila de la lista de
 * trabajo y apretar «No traer esta fila» de la banda la descartó sin
 * preguntar: la confirmación sólo salía al elegir «todas las de la carga» o
 * un motivo (que no aparecen en una carga de una página). Ahora descartar en
 * masa siempre confirma.
 *
 * (Arnés copiado de MigrarTerceros.ya-estaban.migracion-95.test.tsx.)
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
    resumen: vi.fn(),
    filas: vi.fn(),
    aplicar: vi.fn(),
    preparar: vi.fn(),
    corregir: vi.fn(),
    descartar: vi.fn(),
    resolverMasivo: vi.fn(),
  },
}));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/migracion-terceros.service')
  >('@/lib/api/migracion-terceros.service');
  return { ...actual, migracionTercerosApi: api };
});

import { MigrarTerceros } from './MigrarTerceros';
import type { FilaDeStaging } from '@/lib/api/migracion-terceros.service';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo="INQUILINO" />);
  });
  await act(async () => {});
}

function boton(texto: string): HTMLButtonElement {
  const b = [...container.querySelectorAll('button')].find((x) =>
    (x.textContent ?? '').includes(texto),
  );
  if (!b) throw new Error(`No hay botón «${texto}»`);
  return b as HTMLButtonElement;
}

async function clic(texto: string) {
  await act(async () => {
    boton(texto).click();
  });
  await act(async () => {});
}

const PLANTILLA = {
  tipo: 'INQUILINO' as const,
  columnas: [
    {
      campo: 'correo',
      titulo: 'Correo',
      obligatoria: true,
      ejemplo: 'ana@correo.com',
      alias: [],
    },
  ],
};

const LOTE = {
  lote: 'inquilinos-prueba',
  tipo: 'INQUILINO' as const,
  actualizado: '2026-09-01T10:00:00.000Z',
  total: 110,
  borradores: 0,
  requierenAtencion: 85,
  listos: 0,
  aplicados: 25,
  descartados: 0,
};

const filaDuplicada = (n: number): FilaDeStaging => ({
  id: `f-${n}`,
  lote: 'inquilinos-prueba',
  tipo: 'INQUILINO',
  estado: 'REQUIERE_ATENCION',
  datos: { _fila: n, nombre: `Persona ${n}`, correo: `p${n}@example.com` },
  errores: [
    {
      codigo: 'YA_EXISTE_EN_LA_AGENCIA',
      campo: 'correo',
      mensaje: `ya hay una cuenta con este correo: Persona ${n}`,
      referencia: { id: `u-${n}`, nombre: `Persona ${n}` },
    },
  ],
  propietarioId: null,
  userId: null,
  aplicadoAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
});

beforeEach(() => {
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([LOTE]);
  api.resumen.mockResolvedValue(LOTE);
  // Página de 2 sobre un total de 85: el título tiene que decir 85, no 2.
  api.filas.mockResolvedValue({
    filas: [filaDuplicada(27), filaDuplicada(28)],
    total: 85,
    pagina: 1,
    porPagina: 25,
  });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('MigrarTerceros — descartar en masa confirma (TE-08, QA-MIGRACION-95)', () => {
  it('🔴 las marcadas a mano: pregunta antes, y sólo al confirmar se descartan', async () => {
    api.resolverMasivo.mockResolvedValue({ actualizadas: 2, fallidas: [] });
    await pintar();
    await clic('Retomar');

    const casilla = [...container.querySelectorAll('[role="checkbox"]')].find((c) =>
      (c.getAttribute('aria-labelledby') ?? '').includes('seleccionar-pagina'),
    ) as HTMLElement;
    await act(async () => casilla.click());
    await act(async () => {
      (container.querySelector('[data-testid="masivo-descartar"]') as HTMLButtonElement).click();
    });
    await act(async () => {});

    const dialogo = document.querySelector('[role="alertdialog"]');
    expect(dialogo?.textContent).toContain('¿No traer 2 filas?');
    expect(api.resolverMasivo).not.toHaveBeenCalled();

    await act(async () => {
      (document.querySelector('[data-testid="masivo-confirmar-descartar"]') as HTMLButtonElement).click();
    });
    await act(async () => {});
    expect(api.resolverMasivo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ descartar: true }));
  });
});
