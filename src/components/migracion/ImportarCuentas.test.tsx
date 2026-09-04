/**
 * ImportarCuentas.test.tsx — subir el plan de cuentas desde un archivo.
 *
 * Lo que se congela: el orden subir → revisar → importar, que revisar no
 * escribe, que la revisión muestra lo que NO va a entrar con su motivo antes
 * de que nadie apriete importar, que con cero nuevas el botón no se ofrece,
 * y que un fallo al importar dice que reintentar no duplica.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type {
  ResultadoImportacionPuc,
  RevisionDeImportacionPuc,
} from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

const { api } = vi.hoisted(() => ({
  api: { puc: { revisarImportacion: vi.fn(), importar: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return {
    ...actual,
    contabilidadApi: { ...actual.contabilidadApi, puc: { ...actual.contabilidadApi.puc, ...api.puc } },
  };
});

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { ImportarCuentas } from './ImportarCuentas';

const REVISION: RevisionDeImportacionPuc = {
  nuevas: 2,
  existentes: 1,
  invalidas: 1,
  filas: [
    { indice: 0, codigoOriginal: '1105', codigo: '1105', nombre: 'Caja', naturaleza: 'DEBITO', imputable: false, veredicto: 'NUEVA' },
    { indice: 1, codigoOriginal: '110505', codigo: '110505', nombre: 'Caja general', naturaleza: 'DEBITO', imputable: true, veredicto: 'NUEVA' },
    { indice: 2, codigoOriginal: '1110', codigo: '1110', nombre: 'Bancos', naturaleza: 'DEBITO', imputable: true, veredicto: 'YA_EXISTE', nombreActual: 'Bancos nacionales', motivo: 'Ya está como «Bancos nacionales»; se conserva ese nombre.' },
    { indice: 3, codigoOriginal: 'CAJA', codigo: '', nombre: 'Caja menor', naturaleza: null, imputable: true, veredicto: 'INVALIDA', motivo: 'El código «CAJA» no son sólo dígitos.' },
  ],
};

const RESULTADO: ResultadoImportacionPuc = { ...REVISION, creadas: 2 };

let container: HTMLDivElement;
let root: Root | null = null;
const onImportado = vi.fn();
const onCerrar = vi.fn();

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportarCuentas onImportado={onImportado} onCerrar={onCerrar} />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null | undefined) {
  if (!el) throw new Error('no está el botón');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

async function subirArchivo(
  rows: Record<string, unknown>[] = [
    { Código: '1105', Nombre: 'Caja' },
    { Código: '110505', Nombre: 'Caja general' },
    { Código: '1110', Nombre: 'Bancos' },
    { Código: 'CAJA', Nombre: 'Caja menor' },
  ],
  headers = ['Código', 'Nombre'],
) {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({ rows, headers, sheetNames: ['Hoja1'] } as never);
  const input = q('archivo-cuentas') as HTMLInputElement;
  const file = new File(['x'], 'puc.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.puc.revisarImportacion.mockResolvedValue(REVISION);
  api.puc.importar.mockResolvedValue(RESULTADO);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('subir → revisar', () => {
  it('con «Código» y «Nombre» el mapeo sale solo y se puede revisar', async () => {
    await pintar();
    await subirArchivo();

    expect(q('mapeo-cuentas')).not.toBeNull();
    expect(q('cuentas-sin-mapear')).toBeNull();
    expect((q('revisar-cuentas') as HTMLButtonElement).disabled).toBe(false);
    expect(q('revisar-cuentas')?.textContent).toContain('4 cuentas');
  });

  it('sin una columna obligatoria no se puede revisar, y se dice cuál falta', async () => {
    await pintar();
    await subirArchivo([{ Zzz: '1105' }], ['Zzz']);

    expect(q('cuentas-sin-mapear')?.textContent).toMatch(/«Código» y «Nombre»/);
    expect((q('revisar-cuentas') as HTMLButtonElement).disabled).toBe(true);
  });

  it('revisar manda las cuentas tal cual y NO importa', async () => {
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));

    expect(api.puc.revisarImportacion).toHaveBeenCalledWith([
      { codigo: '1105', nombre: 'Caja' },
      { codigo: '110505', nombre: 'Caja general' },
      { codigo: '1110', nombre: 'Bancos' },
      { codigo: 'CAJA', nombre: 'Caja menor' },
    ]);
    expect(api.puc.importar).not.toHaveBeenCalled();
    expect(q('puc-importacion-revision')).not.toBeNull();
  });
});

describe('la revisión', () => {
  it('muestra qué entra, qué ya existe y qué no se entendió — con el motivo', async () => {
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));

    const texto = q('puc-importacion-revision')?.textContent ?? '';
    expect(texto).toContain('2 cuentas nuevas');
    expect(texto).toContain('1 ya existe');
    expect(texto).toMatch(/1.*con algo que no se entendió/);
    // Lo inválido va PRIMERO y con su razón: es lo que hay que mirar.
    const primera = container.querySelector('[data-testid^="revision-cuenta-"]');
    expect(primera?.getAttribute('data-testid')).toBe('revision-cuenta-3');
    expect(primera?.textContent).toContain('no son sólo dígitos');
    // Lo que ya existe dice qué nombre se conserva.
    expect(q('revision-cuenta-2')?.textContent).toContain('«Bancos nacionales»');
  });

  it('el botón cuenta sólo las nuevas', async () => {
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));

    expect(q('puc-importar')?.textContent).toBe('Importar 2 cuentas');
  });

  it('con cero nuevas no se ofrece importar', async () => {
    api.puc.revisarImportacion.mockResolvedValue({
      ...REVISION,
      nuevas: 0,
      existentes: 4,
      invalidas: 0,
      filas: REVISION.filas.map((f) => ({ ...f, veredicto: 'YA_EXISTE' as const })),
    });
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));

    expect((q('puc-importar') as HTMLButtonElement).disabled).toBe(true);
    expect(q('puc-importar')?.textContent).toMatch(/No hay cuentas nuevas/);
  });
});

describe('importar', () => {
  it('escribe lo revisado, avisa al padre y muestra el resultado', async () => {
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));
    await click(q('puc-importar'));

    expect(api.puc.importar).toHaveBeenCalledTimes(1);
    expect(onImportado).toHaveBeenCalledWith(RESULTADO);
    const texto = q('puc-importacion-resultado')?.textContent ?? '';
    expect(texto).toContain('Se crearon 2 cuentas');
    expect(texto).toContain('1 ya estaba');
    expect(texto).toContain('1 no entró');
  });

  it('un fallo al importar dice que reintentar no duplica, y deja reintentar', async () => {
    api.puc.importar.mockRejectedValueOnce(new Error('No pudimos conectarnos al servidor.'));
    await pintar();
    await subirArchivo();
    await click(q('revisar-cuentas'));
    await click(q('puc-importar'));

    const alerta = container.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('No pudimos conectarnos');
    expect(alerta?.textContent).toMatch(/no se duplican/);
    expect(q('puc-importar')).not.toBeNull();
    expect(onImportado).not.toHaveBeenCalled();
  });
});
