/**
 * Subir los comprobantes: que el archivo entre entero, en lotes, y que el
 * resumen diga la verdad.
 *
 * Lo que este archivo congela:
 *
 *  1. Un archivo de más de 5.000 filas se manda en VARIOS lotes — el tope del
 *     back— y ninguna fila se pierde en el camino.
 *  2. El resumen suma los lotes: con dos llamadas, los números son los de las
 *     dos, no los de la última.
 *  3. Se dice cuántos quedaron SIN contrato y por qué. Ese número es la
 *     pregunta del final del paso, y esconderlo es la forma más fácil de que
 *     alguien crea que migró todo.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * `react-dropzone` monta un input de archivo real y su `onDrop` depende de
 * eventos del navegador. Acá sólo hace falta poder entregarle el archivo, así
 * que se expone el callback: el comportamiento del dropzone no es lo que este
 * test cuida.
 */
const { entregarArchivo } = vi.hoisted(() => {
  const ref: { actual: ((archivos: File[]) => void) | null } = { actual: null };
  return {
    entregarArchivo: ref,
  };
});

vi.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop }: { onDrop: (archivos: File[]) => void }) => {
    entregarArchivo.actual = onDrop;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
    };
  },
}));

const { api } = vi.hoisted(() => ({
  api: {
    migracion: {
      documentos: { revisar: vi.fn(), migrar: vi.fn() },
    },
  },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return {
    ...actual,
    contabilidadApi: {
      ...actual.contabilidadApi,
      migracion: { ...actual.contabilidadApi.migracion, ...api.migracion },
    },
  };
});

import { DocumentosContables } from './DocumentosContables';

const ENCABEZADO =
  '"Prefijo";"Consecutivo";"Tipo Doc.";"Fecha";"Concepto";"Débitos";"Créditos";"Balance";' +
  '"Descuadrado";"Anulado";"¿Es anticipo?";"Nombre Tercero Anticipo";"¿anticipo aplicado?";' +
  '"Valor Restante del Anticipo";"Creado por";"Fecha creación"';

function fila(n: number): string {
  return (
    `"CI";${n};"Comprobante de Ingreso";"2026-09-08";"INGRESO - REF 43090971";` +
    `$1,000.00;$1,000.00;$0.00;"NO";"NO";"NO";"";"NO";$0.00;"ALGUIEN";"2026-09-08 10:00:00"`
  );
}

function archivoCon(filas: number): File {
  const texto = [ENCABEZADO, ...Array.from({ length: filas }, (_, i) => fila(i + 1))].join('\n');
  return new File([texto], 'Accounting Documents.csv', { type: 'text/csv' });
}

function revision(total: number, sinContrato: number) {
  return {
    total,
    listos: total,
    yaMigrados: 0,
    rechazados: 0,
    asociados: {
      porDocumento: total - sinContrato,
      porNombre: 0,
      sinContrato,
    },
    motivos:
      sinContrato > 0
        ? [{ motivo: 'El concepto no nombra a ningún tercero de la agencia.', filas: [1] }]
        : [],
    filas: [],
  };
}

let contenedor: HTMLDivElement;
let raiz: Root;

/**
 * La lectura le devuelve el turno al navegador entre lote y lote
 * (`setTimeout(0)`), así que no alcanza con vaciar las microtareas: hay que
 * dejar correr los macrotasks hasta que la pantalla deje de estar ocupada.
 */
async function esperarAQueTermine(vueltas = 400) {
  for (let i = 0; i < vueltas; i++) {
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 0));
    });
    if (!contenedor.querySelector('[data-testid="documentos-progreso"]')) {
      // Una vuelta más: el resumen se pinta en el mismo ciclo en que se apaga
      // el progreso.
      await act(async () => {
        await new Promise((resolver) => setTimeout(resolver, 0));
      });
      return;
    }
  }
  throw new Error('la lectura no terminó');
}

async function subir(archivo: File) {
  await act(async () => {
    entregarArchivo.actual?.([archivo]);
  });
  await esperarAQueTermine();
}

async function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  await act(async () => {
    raiz.render(<DocumentosContables />);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  entregarArchivo.actual = null;
});

afterEach(async () => {
  await act(async () => {
    raiz?.unmount();
  });
  contenedor?.remove();
});

describe('subir los comprobantes', () => {
  it('avisa que son comprobantes y NO asientos antes de que nadie suba nada', async () => {
    await montar();
    expect(contenedor.textContent).toContain('no las líneas por cuenta');
    expect(contenedor.textContent).toContain('Subir el libro diario');
  });

  it('parte el archivo en lotes del tope del back y no pierde ninguna fila', async () => {
    api.migracion.documentos.revisar.mockImplementation(
      async (docs: unknown[]) => revision(docs.length, 0),
    );
    await montar();

    await subir(archivoCon(12_000));

    const tamanos = api.migracion.documentos.revisar.mock.calls.map(
      (llamada) => (llamada[0] as unknown[]).length,
    );
    expect(tamanos).toEqual([5_000, 5_000, 2_000]);
    expect(tamanos.reduce((s, n) => s + n, 0)).toBe(12_000);
  });

  it('el resumen suma TODOS los lotes, no sólo el último', async () => {
    api.migracion.documentos.revisar.mockImplementation(
      async (docs: unknown[]) => revision(docs.length, 0),
    );
    await montar();

    await subir(archivoCon(12_000));

    const resumen = contenedor.querySelector('[data-testid="documentos-resumen"]');
    expect(resumen?.textContent).toContain('12.000');
  });

  it('dice cuántos quedaron SIN contrato y por qué', async () => {
    api.migracion.documentos.revisar.mockImplementation(
      async (docs: unknown[]) => revision(docs.length, 3),
    );
    await montar();

    await subir(archivoCon(10));

    const resumen = contenedor.querySelector('[data-testid="documentos-resumen"]');
    expect(resumen?.textContent).toContain('quedaron SIN contrato');
    expect(
      contenedor.querySelector('[data-testid="documentos-motivos"]')?.textContent,
    ).toContain('El concepto no nombra a ningún tercero');
  });

  it('una caída a mitad de camino conserva lo que ya entró y lo dice', async () => {
    let llamadas = 0;
    api.migracion.documentos.revisar.mockImplementation(async (docs: unknown[]) => {
      llamadas++;
      if (llamadas === 2) throw new Error('se cayó la red');
      return revision(docs.length, 0);
    });
    await montar();

    await subir(archivoCon(12_000));

    expect(contenedor.querySelector('[data-testid="documentos-error"]')?.textContent).toContain(
      'NO se duplica al reintentar',
    );
    // El primer lote ya revisado no se borra del resumen.
    expect(contenedor.querySelector('[data-testid="documentos-resumen"]')?.textContent).toContain(
      '5.000',
    );
  });

  it('nada se escribe hasta que se pide: revisar no llama a migrar', async () => {
    api.migracion.documentos.revisar.mockImplementation(
      async (docs: unknown[]) => revision(docs.length, 0),
    );
    await montar();

    await subir(archivoCon(10));

    expect(api.migracion.documentos.migrar).not.toHaveBeenCalled();
    expect(contenedor.querySelector('[data-testid="documentos-migrar"]')).not.toBeNull();
  });
});
