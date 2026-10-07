/**
 * QA-MIGRACION-95 (06-10-2026): re-subir el MISMO archivo de terceros.
 * El back enlaza a las personas que ya estaban (no duplica) y lo dice con
 * `yaEstaban`; la pantalla decía «8 creadas» y «8 ya se crearon» de fichas que
 * ya existían. Ahora: «0 creadas», «8 ya estaban en Leasefy…» y el resumen del
 * lote dice «ya están en Leasefy» (vale para creadas y para enlazadas).
 *
 * (Arnés copiado de MigrarTerceros.lista.test.tsx.)
 *
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

describe('MigrarTerceros — re-subir lo que ya estaba (QA-MIGRACION-95)', () => {
  it('«0 creadas» y «8 ya estaban en Leasefy» cuando el back enlazó a las 8', async () => {
    api.resumen
      .mockResolvedValueOnce({ ...LOTE, total: 8, requierenAtencion: 0, listos: 8, aplicados: 0 })
      .mockResolvedValue({ ...LOTE, total: 8, requierenAtencion: 0, listos: 0, aplicados: 8 });
    api.lotesAbiertos.mockResolvedValue([{ ...LOTE, total: 8, requierenAtencion: 0, listos: 8, aplicados: 0 }]);
    api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });
    api.aplicar.mockResolvedValue({
      lote: 'inquilinos-prueba', intentadas: 8, aplicadas: 8, yaEstaban: 8, fallidas: 0, invitados: 0, resultados: [],
    });

    await pintar();
    await clic('Retomar');
    await clic('Crear 8 inquilinos');

    const informe = container.querySelector('[data-testid="informe-aplicacion"]')!;
    expect(informe).not.toBeNull();
    expect(informe.textContent).toMatch(/0\s*creadas/);
    expect(informe.textContent).not.toMatch(/8\s*creadas/);
    expect(container.querySelector('[data-testid="ya-estaban-en-leasefy"]')!.textContent).toContain('8 ya estaban en Leasefy');
    const resumen = container.querySelector('[data-testid="resumen-del-lote"]')!.textContent ?? '';
    expect(resumen).not.toContain('ya se crearon');
    expect(resumen).toContain('ya están en Leasefy');
  });

  it('un inquilino sin correo NI documento no «quedó creado con su documento»: se dice que quedó con su nombre', async () => {
    api.resumen
      .mockResolvedValueOnce({ ...LOTE, total: 1, requierenAtencion: 0, listos: 1, aplicados: 0 })
      .mockResolvedValue({ ...LOTE, total: 1, requierenAtencion: 0, listos: 0, aplicados: 1 });
    api.lotesAbiertos.mockResolvedValue([{ ...LOTE, total: 1, requierenAtencion: 0, listos: 1, aplicados: 0 }]);
    api.filas.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 25 });
    api.aplicar.mockResolvedValue({
      lote: 'inquilinos-prueba', intentadas: 1, aplicadas: 1, fallidas: 0, invitados: 0, sinCorreo: 1, incompletas: 1,
      resultados: [{ id: 'f-10', fila: 10, estado: 'aplicado', invitado: false, sinCorreo: true, datosPendientes: ['tipoDocumento', 'documento'] }],
    });

    await pintar();
    await clic('Retomar');
    await clic('Crear 1 inquilino');

    const texto = container.querySelector('[data-testid="sin-correo"]')!.textContent ?? '';
    expect(texto).not.toContain('con su documento');
    expect(texto).toContain('con su nombre');
  });
});
