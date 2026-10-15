/**
 * 🔴 8.ª tanda de la migración de Portofino (14-10-2026): «Sube tu archivo
 * contable».
 *
 * Nico vio a Juan (el dueño de Portofino) subir todo por «libro diario» y
 * preguntó qué opción tiene que usar la persona. Decidió que Leasefy lo
 * reconozca: la pantalla dice qué traer y para qué, y un solo botón manda el
 * archivo a su puerta —el balance a los saldos iniciales, el libro diario a
 * los asientos, los comprobantes a la ficha de los contratos—.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { CuentaPuc } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const { api, reconocer } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: { listar: vi.fn() },
    migracion: { cargas: vi.fn() },
  },
  reconocer: vi.fn(),
}));

vi.mock('./que-archivo-contable-subieron', () => ({ queArchivoContableSubieron: reconocer }));

/* Los tres caminos, como dobles que dicen qué archivo les llegó. */
vi.mock('./AsientoDeApertura', () => ({
  AsientoDeApertura: ({ archivoInicial }: { archivoInicial?: File | null }) => (
    <div data-testid="doble-apertura" data-archivo={archivoInicial?.name ?? ''} />
  ),
}));
vi.mock('./MigrarAsientos', () => ({
  MigrarAsientos: ({
    archivoInicial,
    onIrASaldosIniciales,
  }: {
    archivoInicial?: File | null;
    onIrASaldosIniciales?: (archivo: File) => void;
  }) => (
    <div data-testid="doble-libro" data-archivo={archivoInicial?.name ?? ''}>
      <button
        data-testid="doble-es-el-balance"
        onClick={() => onIrASaldosIniciales?.(new File(['x'], 'balance-en-el-libro.xlsx'))}
      />
    </div>
  ),
}));
vi.mock('./DocumentosContables', () => ({
  DocumentosContables: ({ archivoInicial }: { archivoInicial?: File | null }) => (
    <div data-testid="doble-comprobantes" data-archivo={archivoInicial?.name ?? ''} />
  ),
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { RegistrosContables } from './RegistrosContables';

const CUENTA = {
  id: 'c-1',
  agencyId: 'ag-1',
  codigo: '110505',
  nombre: 'Caja general',
  naturaleza: 'DEBITO',
  padreId: null,
  imputable: true,
  activa: true,
  createdAt: '2026-01-01T00:00:00Z',
} as CuentaPuc;

let container: HTMLDivElement;
let root: Root | null = null;

const q = (testid: string) => container.querySelector<HTMLElement>(`[data-testid="${testid}"]`);

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<RegistrosContables />);
  });
  await act(async () => {});
}

async function subir(nombre: string) {
  const input = q('input-archivo-contable') as HTMLInputElement;
  const file = new File(['x'], nombre);
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

async function tocar(el: Element | null | undefined) {
  if (!el) throw new Error('no está');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.puc.listar.mockResolvedValue([CUENTA]);
  api.asientos.listar.mockResolvedValue({ total: 0, limite: 200, desplazamiento: 0, asientos: [] });
  api.migracion.cargas.mockResolvedValue([]);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('🔴 Portofino (14-10) · qué traer y a dónde va', () => {
  it('la guía dice los tres archivos, para qué es cada uno y cuál es obligatorio', async () => {
    await pintar();
    const guia = q('contables-guia')!;
    expect(q('guia-balance')!.textContent).toContain('El balance de prueba por tercero');
    expect(q('guia-balance')!.textContent).toContain('Obligatorio');
    expect(q('guia-libro')!.textContent).toContain('Los movimientos de este año');
    expect(q('guia-comprobantes')!.textContent).toContain('Opcional');
    expect(guia.textContent).toContain('Sube tu archivo contable');
  });

  it.each([
    ['balance', 'doble-apertura', 'Saldos iniciales'],
    ['libro-diario', 'doble-libro', 'Subir el libro diario'],
    ['comprobantes', 'doble-comprobantes', 'Subir los comprobantes'],
  ] as const)('un archivo que es %s se abre en su puerta, con el archivo', async (forma, doble, puerta) => {
    reconocer.mockResolvedValue(forma);
    await pintar();
    await subir('Contable.xlsx');

    expect(q(doble)!.getAttribute('data-archivo')).toBe('Contable.xlsx');
    expect(q('contables-reconocido')!.textContent).toContain(puerta);
  });

  it('el de Juan: «Contable Documentos.xlsx» son comprobantes, no el libro diario', async () => {
    reconocer.mockResolvedValue('comprobantes');
    await pintar();
    await subir('Contable Documentos.xlsx');

    expect(q('doble-libro')).toBeNull();
    expect(q('doble-comprobantes')!.getAttribute('data-archivo')).toBe('Contable Documentos.xlsx');
  });

  it('si no se reconoce, pregunta dónde va y lo lleva', async () => {
    reconocer.mockResolvedValue(null);
    await pintar();
    await subir('raro.xlsx');

    expect(q('contables-reconocido')!.getAttribute('data-forma')).toBe('ninguna');
    const esElLibro = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Es el libro diario');
    await tocar(esElLibro);
    expect(q('doble-libro')!.getAttribute('data-archivo')).toBe('raro.xlsx');
  });

  it('el balance subido por el libro diario se lleva a los saldos iniciales con ese archivo', async () => {
    reconocer.mockResolvedValue('libro-diario');
    await pintar();
    await subir('diario.xlsx');
    await tocar(q('doble-es-el-balance'));

    expect(q('doble-apertura')!.getAttribute('data-archivo')).toBe('balance-en-el-libro.xlsx');
  });
});
