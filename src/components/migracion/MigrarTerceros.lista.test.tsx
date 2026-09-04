/**
 * MigrarTerceros — la lista de trabajo cuenta su propia historia.
 *
 * El bug que motiva este archivo no fue de mecánica sino de silencio: después
 * de crear las primeras 25 fichas, quedaban 85 tarjetas debajo del informe sin
 * un título que dijera qué eran — Nico no supo si eran un error, un pendiente
 * o cosas ya resueltas que «seguían ahí». Acá se congela que la lista SIEMPRE
 * dice qué es, cuántas quedan (con el total del back, no con la página), y a
 * dónde ir cuando ya no queda nada.
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

describe('MigrarTerceros — el título de la lista de trabajo', () => {
  it('la lista dice qué es y cuántas quedan, con el total del back', async () => {
    await pintar();
    await clic('Retomar');

    const titulo = container.querySelector('[data-testid="titulo-por-revisar"]')!;
    expect(titulo).not.toBeNull();
    // 85 del back; la página sólo trae 2. Contar lo pintado diría «quedan 2».
    expect(titulo.textContent).toContain('85');
    expect(titulo.textContent).not.toContain('Quedan 2');
    // En el paso de inquilinos, la causa más probable se nombra: ya subiste a
    // esa persona en Propietarios o ya tenía cuenta.
    expect(titulo.textContent).toContain('Propietarios');
  });

  it('sin nada por revisar no hay título, y adentro del muro se empuja al paso siguiente', async () => {
    api.resumen.mockResolvedValue({ ...LOTE, requierenAtencion: 0, aplicados: 110 });
    api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });

    await pintar();
    await clic('Retomar');

    expect(container.querySelector('[data-testid="titulo-por-revisar"]')).toBeNull();
    expect(container.textContent).toContain('No queda nada por revisar');
    expect(container.textContent).toContain('paso siguiente');
  });

  it('después de crear, el informe dice cuántas quedaron abajo sin crear', async () => {
    api.resumen.mockResolvedValue({ ...LOTE, listos: 25 });
    api.aplicar.mockResolvedValue({
      lote: 'inquilinos-prueba',
      intentadas: 25,
      aplicadas: 25,
      fallidas: 0,
      invitados: 25,
      resultados: [],
    });

    await pintar();
    await clic('Retomar');
    await clic('Crear 25 inquilinos');

    const puente = container.querySelector('[data-testid="puente-por-revisar"]')!;
    expect(puente).not.toBeNull();
    expect(puente.textContent).toContain('85');
    expect(puente.textContent).toContain('sin crear');
  });
});
