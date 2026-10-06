/**
 * MigrarTerceros.sistema-de-errores.test.tsx — la regla de oro (02-10-2026).
 *
 *  · un 4xx dice qué está mal; con `campos`, debajo de SU celda y con el foco;
 *  · un 5xx dice que fue de nuestro lado, con la referencia, sin culpar a la
 *    conexión ni mostrar el texto crudo del servidor;
 *  · «conexión» sólo cuando no hubo respuesta.
 *
 * El andamiaje es el de `MigrarTerceros.errores.test.tsx`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, parseMock } = vi.hoisted(() => ({
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
  parseMock: vi.fn(),
}));

/*
 * El paso con tipo fijo abre en «lo ya cargado» cuando la inmobiliaria ya
 * tiene personas (Nico, 01-10). Estas pruebas son de la SUBIDA: arrancan sin
 * nadie cargado, que es cuando la subida va abierta. Lo ya cargado se prueba
 * en `MigrarTerceros.ya-cargados.test.tsx`.
 */
vi.mock('./TercerosYaCargados', async () => {
  const { useEffect } = await import('react');
  return {
    TercerosYaCargados: ({ onEstado }: { onEstado: (e: unknown) => void }) => {
      useEffect(() => onEstado({ cargando: false, fallo: false, total: 0 }), [onEstado]);
      return null;
    },
  };
});

vi.mock('@/lib/api/migracion-terceros.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/migracion-terceros.service')
  >('@/lib/api/migracion-terceros.service');
  return { ...actual, migracionTercerosApi: api };
});

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: parseMock,
}));

import { MigrarTerceros } from './MigrarTerceros';
import { AplicacionInterrumpida } from '@/lib/migracion/aplicar-lote-de-terceros';
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

function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((x) =>
    (x.textContent ?? '').includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function clic(texto: string) {
  const b = boton(texto);
  if (!b) throw new Error(`No hay botón «${texto}»`);
  await act(async () => {
    b.click();
  });
  await act(async () => {});
}

const PLANTILLA = {
  tipo: 'INQUILINO' as const,
  columnas: [
    { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, ejemplo: 'Ana', alias: [] },
    { campo: 'correo', titulo: 'Correo', obligatoria: true, ejemplo: 'ana@x.co', alias: [] },
  ],
};

const LOTE = {
  lote: 'inquilinos-x',
  tipo: 'INQUILINO' as const,
  actualizado: '2026-09-01T10:00:00.000Z',
  total: 4,
  borradores: 0,
  requierenAtencion: 2,
  listos: 2,
  aplicados: 0,
  descartados: 0,
};

const filaPendiente = (n: number): FilaDeStaging => ({
  id: `f-${n}`,
  lote: 'inquilinos-x',
  tipo: 'INQUILINO',
  estado: 'REQUIERE_ATENCION',
  datos: { _fila: n, nombre: `Persona ${n}` },
  // `FALTA_CORREO` ya no existe (2026-09-07): un inquilino sin correo entra igual.
  // El error sigue señalando la celda del correo, que es donde tipean las pruebas.
  errores: [{ codigo: 'CORREO_INVALIDO', campo: 'correo', mensaje: 'el correo «x» no es válido' }],
  propietarioId: null,
  userId: null,
  aplicadoAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  version: 3,
});

/** Sube un archivo por el dropzone con el parser mockeado. */
async function subirArchivo() {
  parseMock.mockResolvedValue({
    rows: [
      { Nombre: 'Ana', Correo: 'ana@x.co' },
      { Nombre: 'Beto', Correo: 'beto@x.co' },
    ],
    headers: ['Nombre', 'Correo'],
  });
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  const archivo = new File(['x'], 'inquilinos.xlsx');
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.plantilla.mockResolvedValue(PLANTILLA);
  api.lotesAbiertos.mockResolvedValue([]);
  api.resumen.mockResolvedValue(LOTE);
  api.filas.mockResolvedValue({
    filas: [filaPendiente(1), filaPendiente(2)],
    total: 2,
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

// ══════════════════════════════════════════════════════════════════════════

const ERROR_500 = () =>
  new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor.',
    referencia: 'ab12cd34',
  });

async function abrirLista() {
  api.lotesAbiertos.mockResolvedValue([LOTE]);
  await pintar();
  await clic('Retomar');
}

async function escribirEnLaCelda(selector: string, valor: string) {
  const campo = container.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return campo;
}

describe('preparar', () => {
  it('🔴 un 5xx: «No pudimos preparar la carga: algo falló de nuestro lado» con la referencia', async () => {
    api.preparar.mockRejectedValue(ERROR_500());
    await pintar();
    await subirArchivo();
    await clic('Revisar 2 inquilinos');

    expect(container.textContent).toContain(
      'No pudimos preparar la carga: algo falló de nuestro lado',
    );
    expect(container.textContent).toContain('ab12cd34');
    expect(container.textContent).not.toContain('Error interno del servidor');
    expect(container.textContent).not.toMatch(/conexi[oó]n/);
  });

  it('sin respuesta: ahí sí la conexión', async () => {
    api.preparar.mockRejectedValue(new TypeError('Failed to fetch'));
    await pintar();
    await subirArchivo();
    await clic('Revisar 2 inquilinos');
    expect(container.textContent).toMatch(/Revisa tu conexión/);
  });
});

describe('corregir una fila', () => {
  it('🔴 un 400 en `campos.correo` va DEBAJO de la celda del correo, con aria y foco', async () => {
    await abrirLista();
    api.corregir.mockRejectedValue(
      new ApiError(400, ['El correo no es válido.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El correo no es válido.'],
        campos: [{ campo: 'campos.correo', regla: 'formato', mensaje: 'El correo no es válido.' }],
      }),
    );

    const campo = await escribirEnLaCelda('#tercero-f-1-correo', 'otro@correo.co');
    await clic('Guardar');
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    });

    expect(document.getElementById('tercero-f-1-correo-error')?.textContent).toBe(
      'El correo no es válido.',
    );
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(campo.getAttribute('aria-describedby')).toContain('tercero-f-1-correo-error');
    expect(document.activeElement).toBe(campo);
    // Lo tecleado sigue, y el aviso de la fila no repite el mensaje del campo.
    expect(campo.value).toBe('otro@correo.co');
    const filaError = container.querySelector('[data-testid="error-de-fila"]')?.textContent ?? '';
    expect(filaError).not.toContain('El correo no es válido.');

    // Al volver a escribir en la celda, su error se va.
    await escribirEnLaCelda('#tercero-f-1-correo', 'otro2@correo.co');
    expect(document.getElementById('tercero-f-1-correo-error')).toBeNull();
  });

  it('🔴 un 5xx al guardar: de nuestro lado, con la referencia, en la fila', async () => {
    await abrirLista();
    api.corregir.mockRejectedValue(ERROR_500());
    await escribirEnLaCelda('#tercero-f-1-correo', 'otro@correo.co');
    await clic('Guardar');

    const filaError = container.querySelector('[data-testid="error-de-fila"]')?.textContent ?? '';
    expect(filaError).toContain('No pudimos guardar la corrección: algo falló de nuestro lado');
    expect(filaError).toContain('ab12cd34');
    expect(filaError).not.toMatch(/conexi[oó]n/);
  });
});

describe('crear las fichas', () => {
  it('🔴 cortado por un 5xx: el motivo sale de la causa (con su referencia), no del texto copiado', async () => {
    await abrirLista();
    api.aplicar.mockRejectedValue(ERROR_500());
    await clic('Crear 2 inquilinos');
    expect(container.textContent).toContain('No pudimos crear las fichas: algo falló de nuestro lado');
    expect(container.textContent).toContain('ab12cd34');
    expect(container.textContent).toContain('sin duplicar');
  });

  it('una AplicacionInterrumpida se lee por su causa', () => {
    // El envoltorio copia `causa.message`: sin leer la causa, un 5xx salía
    // como «Error interno del servidor.» sin referencia.
    const e = new AplicacionInterrumpida(
      { lote: 'x', intentadas: 0, aplicadas: 3, fallidas: 0, invitados: 0, resultados: [], restantes: 1 } as never,
      ERROR_500(),
    );
    expect(e.message).toBe('Error interno del servidor.');
    expect(e.causa).toBeInstanceOf(ApiError);
  });
});
