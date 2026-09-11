/**
 * TarjetaDeArchivo.test.tsx — el archivo subido deja de ser zona de arrastre.
 *
 * Lo que se congela, y por qué (Nico, 2026-09-10):
 *
 *  - Con archivo, la zona de arrastre DESAPARECE y queda una tarjeta con el
 *    nombre. Antes la zona se quedaba puesta y no había forma de saber si el
 *    archivo estaba cargado o si había que volver a soltarlo.
 *  - «Descartar» suelta el archivo Y todo lo derivado. El bug real era que el
 *    resumen se quedaba pegado al archivo anterior.
 *  - «Subir otro» abre el selector. El riesgo de mover el input escondido del
 *    dropzone a la tarjeta es que `open()` pierda el ref y el botón no haga
 *    nada: acá se prueba que el input sigue montado y recibe el `click()`.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

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
    contabilidadApi: {
      ...actual.contabilidadApi,
      puc: { ...actual.contabilidadApi.puc, ...api.puc },
    },
  };
});

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { pesoLegible } from './TarjetaDeArchivo';
import { ImportarCuentas } from './ImportarCuentas';

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<ImportarCuentas onImportado={vi.fn()} onCerrar={vi.fn()} />);
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

async function subirArchivo(nombre = 'puc.csv') {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({
    rows: [
      { Código: '1105', Nombre: 'Caja' },
      { Código: '1110', Nombre: 'Bancos' },
    ],
    headers: ['Código', 'Nombre'],
    sheetNames: ['Hoja1'],
  } as never);
  const input = q('archivo-cuentas') as HTMLInputElement;
  const file = new File(['contenido'], nombre, { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

describe('pesoLegible', () => {
  it('usa B, KB y MB según el tamaño — y 0 bytes sigue siendo un archivo', () => {
    expect(pesoLegible(0)).toBe('0 B');
    expect(pesoLegible(512)).toBe('512 B');
    expect(pesoLegible(1536)).toBe('1.5 KB');
    expect(pesoLegible(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('<TarjetaDeArchivo> dentro de un paso de migración', () => {
  it('sin archivo hay zona de arrastre y NO hay tarjeta', async () => {
    await pintar();
    expect(q('dropzone-cuentas')).not.toBeNull();
    expect(q('archivo-de-cuentas')).toBeNull();
  });

  it('con archivo la zona de arrastre desaparece y la tarjeta lo nombra', async () => {
    await pintar();
    await subirArchivo('mi-plan.csv');

    expect(q('dropzone-cuentas')).toBeNull();
    const tarjeta = q('archivo-de-cuentas');
    expect(tarjeta).not.toBeNull();
    expect(q('archivo-de-cuentas-nombre')?.textContent).toBe('mi-plan.csv');
    // El peso y el conteo de filas, para saber que es el archivo correcto.
    expect(tarjeta?.textContent).toContain('2 filas');
  });

  it('«Descartar» suelta el archivo Y el mapeo derivado, no sólo el nombre', async () => {
    await pintar();
    await subirArchivo();
    expect(q('mapeo-cuentas')).not.toBeNull();

    await click(q('archivo-de-cuentas-descartar'));

    expect(q('archivo-de-cuentas')).toBeNull();
    expect(q('dropzone-cuentas')).not.toBeNull();
    // 🔴 Lo que se rompía: el resumen del archivo anterior se quedaba pegado.
    expect(q('mapeo-cuentas')).toBeNull();
  });

  it('«Subir otro» abre el selector: el input escondido sigue montado', async () => {
    await pintar();
    await subirArchivo();

    const input = q('archivo-cuentas') as HTMLInputElement;
    expect(input).not.toBeNull();
    // El input vive DENTRO de la tarjeta: si se hubiera ido con la zona de
    // arrastre, `open()` haría click sobre un ref nulo y el botón no abriría.
    expect(q('archivo-de-cuentas')?.contains(input)).toBe(true);

    const abrir = vi.spyOn(input, 'click').mockImplementation(() => {});
    await click(q('archivo-de-cuentas-otro'));
    expect(abrir).toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('subir un segundo archivo reemplaza el nombre en vez de acumular tarjetas', async () => {
    await pintar();
    await subirArchivo('primero.csv');
    expect(q('archivo-de-cuentas-nombre')?.textContent).toBe('primero.csv');

    await subirArchivo('segundo.csv');
    expect(
      container.querySelectorAll('[data-testid="archivo-de-cuentas"]'),
    ).toHaveLength(1);
    expect(q('archivo-de-cuentas-nombre')?.textContent).toBe('segundo.csv');
  });
});
