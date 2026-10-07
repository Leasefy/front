/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026): el resumen de la asociación de
 * los comprobantes con UN comprobante en cada regla habla en singular.
 *
 * Visto en el navegador (K24 y el archivo nuevo de contrato y código): «1
 * quedaron colgados de un contrato…», «1 quedaron SIN contrato… inventarles un
 * contrato».
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
      documentos: { revisar: vi.fn(), migrar: vi.fn(), sinContrato: vi.fn() },
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

function revision(total: number, sinContrato: number, porReferencia = 0) {
  return {
    total,
    listos: total,
    yaMigrados: 0,
    rechazados: 0,
    asociados: {
      porDocumento: total - sinContrato - 3 * porReferencia,
      porNombre: 0,
      porNumeroDeContrato: porReferencia,
      porCodigoDeInmueble: porReferencia,
      soloInmueble: porReferencia,
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

/** Lo guardado, vacío: el panel de «sin contrato» no se dibuja. */
const NADA_GUARDADO = {
  total: 0,
  conContrato: 0,
  sinContrato: 0,
  porClase: Object.fromEntries(
    ['ingreso', 'egreso', 'factura', 'otro'].map((c) => [
      c,
      {
        total: 0,
        conContrato: 0,
        sinContrato: 0,
        motivos: {
          SOLO_INMUEBLE: 0,
          EXPORT_SIN_TERCERO: 0,
          REFERENCIA_SIN_RESOLVER: 0,
          TERCERO_SIN_CONTRATO: 0,
          CONCEPTO_SIN_TERCERO: 0,
        },
      },
    ]),
  ),
};

beforeEach(() => {
  vi.clearAllMocks();
  entregarArchivo.actual = null;
  api.migracion.documentos.sinContrato.mockResolvedValue(NADA_GUARDADO);
});

afterEach(async () => {
  await act(async () => {
    raiz?.unmount();
  });
  contenedor?.remove();
});

describe('el resumen en singular (QA-MIGRACION-95)', () => {
  it('con uno en cada regla dice «quedó», no «quedaron»', async () => {
    api.migracion.documentos.revisar.mockImplementation(async () => ({
      total: 6, listos: 6, yaMigrados: 0, rechazados: 0,
      asociados: { porDocumento: 1, porNombre: 1, porNumeroDeContrato: 1, porCodigoDeInmueble: 1, soloInmueble: 1, sinContrato: 1 },
      motivos: [], filas: [],
    }));
    await montar();
    await subir(archivoCon(6));
    const t = contenedor.textContent ?? '';
    expect(t).toContain('quedó colgado de un contrato por el documento del tercero');
    expect(t).toContain('quedó colgado SÓLO de su inmueble');
    expect(t).toContain('quedó SIN contrato');
    expect(t).not.toMatch(/\b1\s*quedaron/);
  });

  it('con varios, en plural como siempre', async () => {
    api.migracion.documentos.revisar.mockImplementation(async (docs: unknown[]) => revision(docs.length, 2, 0));
    await montar();
    await subir(archivoCon(5));
    const t = contenedor.textContent ?? '';
    expect(t).toContain('quedaron colgados de un contrato por el documento del tercero');
    expect(t).toContain('quedaron SIN contrato');
  });
});
