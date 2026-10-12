/**
 * Los documentos que la inmobiliaria sube a un contrato (Nico, 10-10-2026).
 *
 * Lo que no puede fallar: que el migrado no invite a subir su contrato
 * firmado, que alguien sin permiso vea «Subir», que un archivo que el back
 * rechazaría salga igual, y que sin la migración se ofrezca subir.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/api/documentos-del-contrato.service', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/documentos-del-contrato.service')>();
  return {
    ...real,
    documentosDelContratoApi: { listar: vi.fn(), subir: vi.fn(), url: vi.fn(), archivar: vi.fn() },
  };
});
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  documentosDelContratoApi,
  type DocumentosDelContrato as Lista,
} from '@/lib/api/documentos-del-contrato.service';
import { DocumentosDelContrato, errorDelArchivo } from './DocumentosDelContrato';

const api = documentosDelContratoApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const $ = (testid: string) => container!.querySelector(`[data-testid="${testid}"]`);

async function montar(lista: Lista, props: { puedeEditar?: boolean; migrado?: boolean } = {}) {
  api.listar.mockResolvedValue(lista);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <DocumentosDelContrato contractId="c1" puedeEditar={props.puedeEditar ?? true} migrado={props.migrado ?? false} />,
    );
  });
  await act(async () => {});
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const archivo = (tipo: string, bytes = 1024) => new File([new Uint8Array(bytes)], 'x', { type: tipo });

describe('<DocumentosDelContrato>', () => {
  it('🔴 el migrado sin documentos invita a subir el contrato firmado', async () => {
    await montar({ disponible: true, documentos: [], archivados: 0 }, { migrado: true });
    expect($('documentos-vacio')?.textContent).toMatch(/contrato firmado en papel/);
    expect($('subir-documento')?.textContent).toMatch(/Subir el contrato firmado/);
  });

  it('lista cada documento con su tipo, quién lo subió y cuántos quedaron archivados', async () => {
    await montar({
      disponible: true,
      archivados: 2,
      documentos: [
        {
          id: 'd1',
          tipo: 'OTROSI',
          tipoNombre: 'Otrosí',
          nota: 'Incremento de 2025',
          archivoNombre: 'otrosi.pdf',
          archivoTipo: 'application/pdf',
          archivoBytes: 2048,
          subidoPorNombre: 'Valentina Ríos',
          subidoEl: '2026-10-10T15:00:00.000Z',
        },
      ],
    });
    const fila = $('documento-d1')!.textContent!;
    expect(fila).toMatch(/Otrosí/);
    expect(fila).toMatch(/Incremento de 2025/);
    expect(fila).toMatch(/Lo subió Valentina Ríos el 10 de octubre de 2026/);
    expect(container!.textContent).toMatch(/2 documentos quitados quedan archivados/);
  });

  it('sin permiso de editar no se ofrece subir ni quitar', async () => {
    await montar(
      {
        disponible: true,
        archivados: 0,
        documentos: [
          {
            id: 'd1',
            tipo: 'OTRO',
            tipoNombre: 'Otro documento',
            nota: null,
            archivoNombre: 'a.png',
            archivoTipo: 'image/png',
            archivoBytes: 10,
            subidoPorNombre: 'N',
            subidoEl: '2026-10-10T15:00:00.000Z',
          },
        ],
      },
      { puedeEditar: false },
    );
    expect($('subir-documento')).toBeNull();
    expect($('quitar-d1')).toBeNull();
  });

  it('sin la migración del back lo dice y no ofrece subir', async () => {
    await montar({ disponible: false, documentos: [], archivados: 0 }, { migrado: true });
    expect($('documentos-sin-migracion')).not.toBeNull();
    expect($('subir-documento')).toBeNull();
  });

  it('el archivo se revisa con los topes del back antes de mandarlo', () => {
    expect(errorDelArchivo(null)).toMatch(/Elige el archivo/);
    expect(errorDelArchivo(archivo('application/zip'))).toMatch(/PDF o una imagen/);
    expect(errorDelArchivo(archivo('application/pdf', 10 * 1024 * 1024 + 1))).toMatch(/10 MB/);
    expect(errorDelArchivo(archivo('image/webp'))).toBeUndefined();
  });
});
