/**
 * RegistrosContables.test.tsx — el paso 5 cuando las cosas fallan.
 *
 * Los dos silencios peligrosos que este archivo congela:
 *
 *  1. La lectura del PUC caída se pintaba como «Primero el plan de cuentas»
 *     — y mandaba al paso 4 a quien ya tiene plan.
 *  2. La lectura de «lo ya cargado» caída no decía nada — y esa franja es el
 *     guard contra registrar la apertura dos veces.
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

const { api } = vi.hoisted(() => ({
  api: {
    puc: { listar: vi.fn() },
    asientos: { listar: vi.fn(), crear: vi.fn() },
    migracion: {
      revisar: vi.fn(),
      aplicar: vi.fn(),
      cargas: vi.fn(),
      descartarCarga: vi.fn(),
    },
  },
}));

/*
 * `MigrarAsientos` se reemplaza por un doble que expone lo que ESTE archivo
 * quiere ver: qué carga recibió para continuar y los avisos que le manda al
 * padre. El camino real del libro diario tiene su propio archivo de pruebas.
 */
vi.mock('./MigrarAsientos', () => ({
  MigrarAsientos: ({
    continuar,
    onAplicado,
    onOcupado,
    onDejarDeContinuar,
  }: {
    continuar?: { lote: string } | null;
    onAplicado: (i: unknown) => void;
    onOcupado?: (o: boolean) => void;
    onDejarDeContinuar?: () => void;
  }) => (
    <div data-testid="doble-migrar-asientos" data-continuar={continuar?.lote ?? ''}>
      <button data-testid="doble-aplicado" onClick={() => onAplicado({})} />
      <button data-testid="doble-ocupado" onClick={() => onOcupado?.(true)} />
      <button data-testid="doble-libre" onClick={() => onOcupado?.(false)} />
      <button data-testid="doble-dejar" onClick={() => onDejarDeContinuar?.()} />
    </div>
  ),
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { RegistrosContables } from './RegistrosContables';

const CUENTA: CuentaPuc = {
  id: 'c-1',
  agencyId: 'ag-1',
  codigo: '110505',
  nombre: 'Caja general',
  naturaleza: 'DEBITO',
  padreId: null,
  imputable: true,
  activa: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const SIN_ASIENTOS = { total: 0, limite: 200, desplazamiento: 0, asientos: [] };

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<RegistrosContables />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.puc.listar.mockResolvedValue([CUENTA]);
  api.asientos.listar.mockResolvedValue(SIN_ASIENTOS);
  api.migracion.cargas.mockResolvedValue([]);
  api.migracion.descartarCarga.mockResolvedValue({ lote: 'x', estado: 'DESCARTADA' });
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container.remove();
  vi.clearAllMocks();
});

describe('la lectura del plan caída', () => {
  it('🔴 no se disfraza de «sin PUC»: cartel con reintentar, sin mandar al paso 4', async () => {
    api.puc.listar.mockRejectedValue(new Error('No pudimos conectarnos al servidor.'));

    await pintar();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('servidor');
    expect(q('contables-reintentar')).not.toBeNull();
    expect(q('contables-sin-puc')).toBeNull();
    // Tampoco los caminos: un selector de cuentas vacío no es un camino.
    expect(q('asiento-de-apertura')).toBeNull();
  });

  it('reintentar relee y, con respuesta, aparecen los caminos', async () => {
    api.puc.listar
      .mockRejectedValueOnce(new Error('se cayó'))
      .mockResolvedValue([CUENTA]);

    await pintar();
    await click(q('contables-reintentar'));

    expect(q('contables-reintentar')).toBeNull();
    expect(q('asiento-de-apertura')).not.toBeNull();
  });

  it('con el PUC de verdad vacío sí manda al paso 4', async () => {
    api.puc.listar.mockResolvedValue([]);

    await pintar();

    expect(q('contables-sin-puc')).not.toBeNull();
    expect(q('contables-reintentar')).toBeNull();
  });
});

describe('la lectura de lo ya cargado caída', () => {
  it('🔴 no es silencio: se avisa que el guard anti-doble-apertura está ciego', async () => {
    api.asientos.listar.mockRejectedValue(new Error('timeout'));

    await pintar();

    const aviso = q('contables-cargado-fallo');
    expect(aviso).not.toBeNull();
    expect(aviso?.textContent).toContain('dos veces');
    // Y el resumen viejo (acá inexistente) no se muestra como si fuera actual.
    expect(q('contables-resumen')).toBeNull();
    // Los caminos sí están: el PUC se leyó bien.
    expect(q('asiento-de-apertura')).not.toBeNull();
  });

  it('su reintentar relee y el aviso se va', async () => {
    api.asientos.listar
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(SIN_ASIENTOS);

    await pintar();
    const boton = [...(q('contables-cargado-fallo')?.querySelectorAll('button') ?? [])].find(
      (b) => b.textContent?.includes('Reintentar'),
    );
    await click(boton ?? null);

    expect(q('contables-cargado-fallo')).toBeNull();
    expect(q('contables-resumen')).not.toBeNull();
  });
});

/*
 * T-0125 · el paso `contables` queda «pendiente» mientras haya una carga de
 * asientos abierta. Quien está detrás del muro llega a la pestaña de saldos
 * iniciales —la de por defecto—, no a la del libro diario, así que la salida
 * (continuar o descartar) tiene que estar a la vista desde el primer momento.
 */
describe('una carga de asientos a medias', () => {
  const CARGA = {
    lote: 'asientos-2026-09-29-0900',
    esperados: 116_262,
    procesados: 10_000,
    creadaAt: '2026-09-29T09:00:00Z',
    actualizadaAt: '2026-09-29T09:20:00Z',
  };

  it('🔴 se ve desde la pestaña de saldos iniciales, con sus dos salidas', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);

    await pintar();

    // La pestaña de por defecto es la de apertura…
    expect(q('asiento-de-apertura')).not.toBeNull();
    // …y la salida está a la vista igual.
    expect(q('cargas-de-asientos')).not.toBeNull();
    expect(q(`continuar-carga-${CARGA.lote}`)).not.toBeNull();
    expect(q(`descartar-carga-${CARGA.lote}`)).not.toBeNull();
  });

  it('«Continuar» abre el libro diario con el lote de ESA carga', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);
    await pintar();

    await click(q(`continuar-carga-${CARGA.lote}`));

    expect(q('asiento-de-apertura')).toBeNull();
    expect(q('doble-migrar-asientos')?.getAttribute('data-continuar')).toBe(CARGA.lote);
  });

  it('«Empezar una carga nueva» suelta la carga que se continuaba', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);
    await pintar();
    await click(q(`continuar-carga-${CARGA.lote}`));

    await click(q('doble-dejar'));

    expect(q('doble-migrar-asientos')?.getAttribute('data-continuar')).toBe('');
  });

  it('descartar desde acá llama al back sin abrir el libro diario', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);
    await pintar();

    await click(q(`descartar-carga-${CARGA.lote}`));
    api.migracion.cargas.mockResolvedValue([]);
    await click(q('descartar-carga-si'));

    expect(api.migracion.descartarCarga).toHaveBeenCalledWith(CARGA.lote);
    expect(q('cargas-de-asientos')).toBeNull();
    expect(q('asiento-de-apertura')).not.toBeNull();
  });

  it('sin cargas abiertas no aparece nada de esto', async () => {
    await pintar();
    expect(q('cargas-de-asientos')).toBeNull();
  });

  it('cuando termina una aplicación se vuelve a leer: el avance de la franja no queda viejo', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);
    await pintar();
    await click(q(`continuar-carga-${CARGA.lote}`));
    expect(api.migracion.cargas).toHaveBeenCalledTimes(1);

    await click(q('doble-aplicado'));

    expect(api.migracion.cargas.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('mientras se aplica no se puede continuar ni descartar otra carga', async () => {
    api.migracion.cargas.mockResolvedValue([CARGA]);
    await pintar();
    await click(q(`continuar-carga-${CARGA.lote}`));

    await click(q('doble-ocupado'));
    expect((q(`descartar-carga-${CARGA.lote}`) as HTMLButtonElement).disabled).toBe(true);

    await click(q('doble-libre'));
    expect((q(`descartar-carga-${CARGA.lote}`) as HTMLButtonElement).disabled).toBe(false);
  });
});

