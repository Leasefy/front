/**
 * MigrarAsientos.test.tsx — el camino B del paso 5 cuando aplicar falla.
 *
 * Lo que se congela: que un fallo al aplicar DICE que reintentar no duplica
 * (es un hecho del back: llave de idempotencia por fila + re-preparación), y
 * que un informe con filas que no se pudieron escribir trae su botón de
 * reintentar en vez de ser un callejón sin salida.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { InformeDeMigracion, RevisionDeLote } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/inmobiliaria/import/lib/parseFile', () => ({
  parseSpreadsheetFile: vi.fn(),
}));

const { api } = vi.hoisted(() => ({
  api: { migracion: { revisar: vi.fn(), aplicar: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { parseSpreadsheetFile } from '@/components/inmobiliaria/import/lib/parseFile';
import { MigrarAsientos } from './MigrarAsientos';

const REVISION: RevisionDeLote = {
  lote: 'asientos-prueba',
  total: 2,
  listas: 2,
  rechazadas: 0,
  yaMigradas: 0,
  cuentasFaltantes: [],
  motivos: [],
  filas: [],
};

const INFORME_CON_FALLAS: InformeDeMigracion = {
  lote: 'asientos-prueba',
  total: 2,
  aplicados: 1,
  omitidos: 1,
  yaMigrados: 0,
  primerNumero: 10,
  ultimoNumero: 10,
  cuentasFaltantes: [],
  motivos: [],
  fallasAlEscribir: [{ fila: 2, motivo: 'timeout de la base' }],
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(extra: { onIrAComprobantes?: () => void } = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<MigrarAsientos onAplicado={() => undefined} {...extra} />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

function boton(texto: string): HTMLButtonElement | undefined {
  return [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(texto),
  ) as HTMLButtonElement | undefined;
}

async function click(el: Element | null | undefined) {
  if (!el) throw new Error('no está el botón');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

/** Sube un CSV mínimo por el input oculto del dropzone. */
async function subirArchivo(
  archivo?: { rows: Record<string, unknown>[]; headers: string[] },
) {
  vi.mocked(parseSpreadsheetFile).mockResolvedValue({
    rows: archivo?.rows ?? [
      { Fecha: '2026-01-15', Descripcion: 'Apertura', Cuenta: '110505', Debito: '100' },
      { Fecha: '2026-01-15', Descripcion: 'Apertura', Cuenta: '310505', Credito: '100' },
    ],
    headers: archivo?.headers ?? ['Fecha', 'Descripcion', 'Cuenta', 'Debito', 'Credito'],
    sheetNames: ['Hoja1'],
  } as never);
  const input = q('dropzone-asientos')?.querySelector('input') as HTMLInputElement;
  const file = new File(['x'], 'diario.csv', { type: 'text/csv' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.migracion.revisar.mockResolvedValue(REVISION);
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('aplicar que falla', () => {
  it('el error dice que reintentar no duplica, y el botón de aplicar sigue ahí', async () => {
    api.migracion.aplicar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    expect(q('revision-asientos')).not.toBeNull();

    await click(q('aplicar-asientos'));

    const alerta = container.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('no se duplican');
    expect(q('aplicar-asientos')).not.toBeNull();
  });
});

describe('informe con filas que no se pudieron escribir', () => {
  it('🔴 no es un callejón: ofrece reintentar sólo esas, y reintenta el MISMO lote', async () => {
    api.migracion.aplicar.mockResolvedValue(INFORME_CON_FALLAS);

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('informe-asientos')).not.toBeNull();
    const reintentar = q('reintentar-fallas');
    expect(reintentar).not.toBeNull();
    expect(reintentar?.textContent).toContain('1');

    const informeOk: InformeDeMigracion = {
      ...INFORME_CON_FALLAS,
      aplicados: 1,
      omitidos: 0,
      yaMigrados: 1,
      fallasAlEscribir: [],
    };
    api.migracion.aplicar.mockResolvedValue(informeOk);
    await click(reintentar);

    // Mismo lote en las dos llamadas: la idempotencia depende de eso.
    const lotes = api.migracion.aplicar.mock.calls.map(
      (c) => (c[0] as { lote: string }).lote,
    );
    expect(new Set(lotes).size).toBe(1);
    // Con el reintento limpio, el botón desaparece.
    expect(q('reintentar-fallas')).toBeNull();
  });

  it('el informe sin fallas no ofrece reintentar', async () => {
    api.migracion.aplicar.mockResolvedValue({
      ...INFORME_CON_FALLAS,
      aplicados: 2,
      omitidos: 0,
      fallasAlEscribir: [],
    });

    await pintar();
    await subirArchivo();
    await click(q('revisar-asientos'));
    await click(q('aplicar-asientos'));

    expect(q('informe-asientos')).not.toBeNull();
    expect(q('reintentar-fallas')).toBeNull();
  });
});

/*
 * 🔴 Nico, 2026-09-12, con el export de comprobantes metido en «Subir el
 * libro diario»: «primero eso no es un feedback de decir que si no el back
 * rechaza todas las filas, los usuarios ni saben qué es el back; y segundo,
 * ¿qué es código de cuenta? ¿y por qué no lo trae o qué pasa ahí con eso?».
 *
 * No lo traía porque su archivo no puede traerlo. Y la puerta correcta estaba
 * al lado sin que nada se lo dijera.
 */
describe('el archivo en la puerta equivocada', () => {
  /* Los encabezados REALES de su archivo, leídos de la captura. Las filas son
     inventadas: el archivo tiene datos de personas de verdad. */
  const COMPROBANTES = {
    headers: [
      'Prefijo', 'Consecutivo', 'Tipo Doc', 'Fecha', 'Concepto', 'Debitos',
      'Creditos', 'Balance', 'Descuadrado', 'Anulado', '¿Es anticipo?',
      'Nombre Tercero Anticipo', '¿anticipo aplicado?',
      'Valor Restante del Anticipo', 'Creado por', 'Fecha creación',
    ],
    rows: [
      { Prefijo: 'CE', Consecutivo: '1', Fecha: '2026-01-15', Concepto: 'Pago', Debitos: '100' },
    ],
  };

  it('lo reconoce, explica POR QUÉ no trae código de cuenta, y abre la puerta correcta', async () => {
    const irAComprobantes = vi.fn();

    await pintar({ onIrAComprobantes: irAComprobantes });
    await subirArchivo(COMPROBANTES);

    const aviso = q('asientos-archivo-de-comprobantes');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('son comprobantes, no el libro diario');
    // El porqué, no sólo el veredicto.
    expect(aviso!.textContent).toContain('la cuenta vive en cada línea del asiento');
    // Y con qué columnas lo dedujo: un veredicto sin evidencia no se discute.
    expect(aviso!.textContent).toContain('Prefijo');

    await click(q('ir-a-comprobantes'));
    expect(irAComprobantes).toHaveBeenCalledTimes(1);
  });

  it('con un libro diario de verdad no dice nada de esto', async () => {
    await pintar();
    await subirArchivo();

    expect(q('asientos-archivo-de-comprobantes')).toBeNull();
    expect(q('asientos-sin-mapear')).toBeNull();
  });

  /* Que deje de avisar cuando alguien mapea el código de cuenta a mano se
     prueba sobre `hayQueAvisarDeOtraPuerta`, que es donde vive la decisión:
     manejar el `Select` de Radix desde happy-dom probaría el mock, no la
     regla. Ver `que-archivo-contable-es.test.ts`. */
});

describe('la columna que falta, en idioma de persona', () => {
  it('🔴 no nombra «el back» y dice qué es la columna y qué pasa sin ella', async () => {
    await pintar();
    // Un libro diario al que le falta justo la cuenta.
    await subirArchivo({
      headers: ['Fecha', 'Descripcion', 'Debito', 'Credito'],
      rows: [{ Fecha: '2026-01-15', Descripcion: 'Apertura', Debito: '100' }],
    });

    const aviso = q('asientos-sin-mapear');
    expect(aviso).not.toBeNull();
    const texto = aviso!.textContent!;

    expect(texto).toContain('Código de cuenta');
    // Qué ES la columna, con su ejemplo.
    expect(texto).toContain('110505');
    // Y qué pasa si falta, sin nombrar una pieza interna.
    expect(texto).toContain('no entraría ninguna fila');
    expect(texto).not.toContain('back');
  });
});
