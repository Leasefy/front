/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026) — TE-16: «fila que falla al
 * aplicar: Reintentar y su motivo en palabras». Fija las dos salidas de una
 * fila que falla al crear: un fallo transitorio deja la fila lista con su
 * motivo y el botón «Reintentar» (que vuelve a crear); un fallo de un dato
 * pasa la fila a «por decidir» con la frase del back y el campo a corregir.
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

describe('MigrarTerceros — la fila que falla al crear (TE-16, QA-MIGRACION-95)', () => {
  const unoListo = { ...LOTE, total: 1, requierenAtencion: 0, listos: 1, aplicados: 0 };

  it('fallo transitorio: dice el motivo y «Reintentar» vuelve a crear', async () => {
    api.resumen.mockResolvedValue(unoListo);
    api.lotesAbiertos.mockResolvedValue([unoListo]);
    api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });
    api.aplicar.mockResolvedValue({
      lote: 'inquilinos-prueba', intentadas: 1, aplicadas: 0, fallidas: 1, invitados: 0,
      resultados: [{ id: 'f-3', fila: 3, estado: 'fallido', motivo: 'El proveedor de cuentas no respondió.' }],
    });

    await pintar();
    await clic('Retomar');
    await clic('Crear 1 inquilino');

    const fallidas = container.querySelector('[data-testid="fallidas-de-aplicacion"]')!;
    expect(fallidas.textContent).toContain('Fila 3: El proveedor de cuentas no respondió.');
    expect(api.aplicar).toHaveBeenCalledTimes(1);
    await act(async () => {
      (container.querySelector('[data-testid="reintentar-fallida"]') as HTMLButtonElement).click();
    });
    await act(async () => {});
    expect(api.aplicar).toHaveBeenCalledTimes(2);
  });

  it('fallo de un dato: pasa a «por decidir» con la frase en español, sin «Reintentar»', async () => {
    api.resumen.mockResolvedValue(unoListo);
    api.lotesAbiertos.mockResolvedValue([unoListo]);
    api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });
    api.aplicar.mockResolvedValue({
      lote: 'inquilinos-prueba', intentadas: 1, aplicadas: 0, fallidas: 1, invitados: 0,
      resultados: [{ id: 'f-3', fila: 3, estado: 'fallido', pasaARevisar: true, motivo: 'Ya existe una cuenta con ese correo en el proveedor: revisa el correo.' }],
    });

    await pintar();
    await clic('Retomar');
    await clic('Crear 1 inquilino');

    expect(container.querySelector('[data-testid="paso-a-revisar"]')!.textContent).toContain('Ya existe una cuenta con ese correo en el proveedor: revisa el correo.');
    expect(container.querySelector('[data-testid="reintentar-fallida"]')).toBeNull();
  });
});
