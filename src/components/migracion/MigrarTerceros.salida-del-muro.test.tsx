/**
 * MigrarTerceros.salida-del-muro.test.tsx — el paso a medias siempre tiene salida.
 *
 * T-0125. `propietarios` e `inquilinos` ya no se dan por «listos» mientras
 * quede una fila LISTO sin aplicar: el muro los deja «pendientes» y la persona
 * llega a ESTA pantalla. Si aquí no hay un botón que resuelva esa fila, el
 * muro es un callejón. Lo que se congela:
 *
 *  1. Una carga con filas LISTO (sin nada por corregir) se ofrece con
 *     «Retomar» y con «No la voy a seguir», y dice cuántas están listas.
 *  2. Descartar la carga exige `configuracion:delete` en el back (sólo el
 *     administrador). Un contador que lo intenta lee QUÉ hacer, no «Forbidden».
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: {
    plantilla: vi.fn(),
    lotesAbiertos: vi.fn(),
    descartarLote: vi.fn(),
    resumen: vi.fn(),
    filas: vi.fn(),
  },
}));

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/migracion-terceros.service')>(
    '@/lib/api/migracion-terceros.service',
  );
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

import { MigrarTerceros } from './MigrarTerceros';

const PLANTILLA = {
  tipo: 'PROPIETARIO' as const,
  columnas: [{ campo: 'nombre', titulo: 'Nombre', obligatoria: true, ejemplo: 'Ana', alias: [] }],
};

/** Una carga cuyas filas están TODAS listas: nada por corregir, sólo falta aplicar. */
const LOTE_SOLO_LISTAS = {
  lote: 'propietarios-2026-09-29',
  tipo: 'PROPIETARIO' as const,
  actualizado: '2026-09-29T10:00:00.000Z',
  total: 4_999,
  borradores: 0,
  requierenAtencion: 0,
  listos: 4_999,
  aplicados: 12,
  descartados: 0,
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarTerceros tipoFijo="PROPIETARIO" />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((b) =>
    (b.textContent ?? '').includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function clic(el: Element | null | undefined) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([LOTE_SOLO_LISTAS]);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('una carga con filas listas sin aplicar', () => {
  it('🔴 se ofrece con sus dos salidas: retomarla o dejarla, y dice cuántas están listas', async () => {
    await pintar();

    const lista = q('lotes-abiertos');
    expect(lista).not.toBeNull();
    expect(lista!.textContent).toContain(LOTE_SOLO_LISTAS.lote);
    expect(lista!.textContent).toContain('listas para crear');
    expect(lista!.textContent).toContain('4999');
    expect(boton('Retomar')).toBeDefined();
    expect(q(`descartar-lote-${LOTE_SOLO_LISTAS.lote}`)).not.toBeNull();
  });
});

describe('descartar la carga sin ser administrador', () => {
  it('🔴 un 403 dice QUIÉN puede y qué pasa mientras tanto, no un «Forbidden» pelado', async () => {
    api.descartarLote.mockRejectedValue(new ApiError(403, 'Forbidden resource'));
    await pintar();

    await clic(q(`descartar-lote-${LOTE_SOLO_LISTAS.lote}`));
    await clic(document.body.querySelector('[data-testid="confirmar-descartar-lote"]'));

    const texto = document.body.textContent ?? '';
    expect(texto).toContain('administrador');
    expect(texto).toContain('sigue pendiente');
    expect(texto).not.toContain('Forbidden resource');
    // La carga sigue ahí: no se quitó de la lista por un error.
    expect(q(`descartar-lote-${LOTE_SOLO_LISTAS.lote}`)).not.toBeNull();
  });

  it('otro error conserva su mensaje (el cambio no se traga lo demás)', async () => {
    api.descartarLote.mockRejectedValue(new Error('La base no contestó.'));
    await pintar();

    await clic(q(`descartar-lote-${LOTE_SOLO_LISTAS.lote}`));
    await clic(document.body.querySelector('[data-testid="confirmar-descartar-lote"]'));

    expect(document.body.textContent).toContain('La base no contestó.');
  });
});
