import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InventariosDelInmueble, VersionDelInventario } from '@/lib/types/inventario-del-inmueble';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const estadoInventarios = vi.fn();
const estadoBorrador = vi.fn();
const completar = vi.fn();
const reemplazar = vi.fn();
let destinoRecibido: { guardar: (id: string, items: unknown[]) => Promise<void> } | undefined;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/hooks/use-inventarios-del-inmueble', () => ({
  useInventariosDelInmueble: () => estadoInventarios(),
}));
vi.mock('@/lib/hooks/use-borrador-de-inventario', () => ({
  useBorradorDeInventario: (o: { destino?: typeof destinoRecibido; itemsDelBack: unknown[] }) => {
    destinoRecibido = o.destino;
    return { ...estadoBorrador(), items: o.itemsDelBack };
  },
}));
vi.mock('@/lib/api/inventario-del-inmueble.service', () => ({
  inventarioDelInmuebleApi: {
    completar: (id: string) => completar(id),
    guardarBorrador: vi.fn().mockResolvedValue({ disponible: true }),
    subirFotoDelBorrador: vi.fn(),
  },
}));
vi.mock('@/components/inmobiliaria/InventarioDeLaConsignacion', () => ({
  InventarioDeLaConsignacion: () => <p data-testid="legado" />,
}));
vi.mock('@/components/inmobiliaria/ActaEntregaView', () => ({
  ActaEntregaView: (p: { inventoryItems: { espacio?: string }[] }) => (
    <div data-testid="acta" data-espacios={p.inventoryItems.map((i) => i.espacio ?? '-').join(',')} />
  ),
}));
vi.mock('@/components/inmobiliaria/BarraDeBorradorDeInventario', () => ({ BarraDeBorradorDeInventario: () => null }));
vi.mock('@/components/inmobiliaria/PrepararParaSinSenal', () => ({ PrepararParaSinSenal: () => null }));
vi.mock('@/components/inmobiliaria/InventarioItemDialog', () => ({ InventarioItemDialog: () => null }));
vi.mock('@/components/inmobiliaria/inventario/HistorialDeVersiones', () => ({
  HistorialDeVersiones: (p: { versiones: unknown[] }) => <p data-testid="historial" data-n={p.versiones.length} />,
}));
vi.mock('@/components/ui/alerta-accionable', () => ({
  AlertaAccionable: (p: { titulo: string; children?: React.ReactNode; 'data-testid'?: string }) => (
    <div data-testid={p['data-testid']}>
      <strong>{p.titulo}</strong>
      {p.children}
    </div>
  ),
}));

import { InventarioDelInmueble } from './InventarioDelInmueble';

let host: HTMLDivElement;
let root: Root;
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`);

const version = (over: Record<string, unknown>): VersionDelInventario => ({
  id: 'v', version: 1, estado: 'COMPLETO', origen: 'PANEL', items: [], creadoPorUserId: null,
  completadoPorUserId: null, completadoEn: '2026-09-01T15:00:00Z', createdAt: '2026-09-01T15:00:00Z',
  updatedAt: '2026-09-01T15:00:00Z', contratos: 0, ...over,
}) as VersionDelInventario;

function datos(over: Partial<InventariosDelInmueble>): InventariosDelInmueble {
  return {
    disponible: true, consignacionId: 'cons-1', propertyId: 'p1', versiones: [], borrador: null,
    ultimoCompleto: null, vigencia: null, ...over,
  };
}

async function montar(d: InventariosDelInmueble | null, borrador: Record<string, unknown> = {}) {
  estadoInventarios.mockReturnValue({ datos: d, cargando: false, error: null, desdeCache: false, recargar: vi.fn(), reemplazar });
  estadoBorrador.mockReturnValue({
    vistasPrevias: {}, hayPendientes: false, subiendo: false, actualizadoEn: null, fotosSinSubir: 0,
    senal: true, avance: null, errorDeSubida: null, guardarItem: vi.fn(), quitarItem: vi.fn(),
    subir: vi.fn(), descartar: vi.fn(), ...borrador,
  });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <InventarioDelInmueble
        consignacion={{ id: 'cons-1', contractDate: '2026-01-01', inventoryItems: [] }}
        puedeEditar
      />,
    );
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});

describe('InventarioDelInmueble', () => {
  it('sin la migración monta la tarjeta de siempre y lo dice', async () => {
    await montar(datos({ disponible: false }));
    expect(q('legado')).not.toBeNull();
    expect(host.textContent).toContain('todavía no está activado');
  });

  it('dice «por actualizar tras el contrato N» cuando un contrato terminó después del último completo', async () => {
    await montar(datos({
      versiones: [version({ id: 'v1' })],
      ultimoCompleto: version({ id: 'v1' }),
      vigencia: {
        vigente: false, motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO', inventarioVigenteId: null,
        ultimoCompleto: { id: 'v1', version: 1, completadoEl: '2026-09-01' }, hayBorrador: false,
        porActualizarTras: { contratoId: 'c9', code: 9, externalId: null, terminoEl: '2026-09-10' },
      },
    }));
    expect(q('aviso-inventario-warning')?.textContent).toContain('Inventario por actualizar tras el contrato #9');
    expect(q('encabezado-de-version')?.textContent).toBe('Versión 1 · completa');
    expect(q('historial')?.getAttribute('data-n')).toBe('1');
    // Sin borrador no hay nada que completar todavía.
    expect(q('completar-inventario')).toBeNull();
  });

  it('completa el borrador y reemplaza lo que muestra con la respuesta', async () => {
    const borrador = version({ id: 'v2', version: 2, estado: 'BORRADOR', completadoEn: null, items: [{ id: 'a', espacio: 'Sala' }, { id: 'b', espacio: 'Cocina' }] });
    completar.mockResolvedValue(datos({ ultimoCompleto: version({ id: 'v2', version: 2 }) }));
    await montar(datos({ versiones: [borrador], borrador }));
    expect(q('encabezado-de-version')?.textContent).toBe('Borrador · versión 2');
    // Los ítems se agrupan por espacio.
    expect(q('acta')?.getAttribute('data-espacios')).toBe('Cocina,Sala');
    const boton = q('completar-inventario-boton') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
    await act(async () => {
      boton.click();
    });
    expect(completar).toHaveBeenCalledWith('cons-1');
    expect(reemplazar).toHaveBeenCalled();
  });

  it('no deja completar con cosas sin subir del teléfono', async () => {
    const borrador = version({ id: 'v2', version: 2, estado: 'BORRADOR', completadoEn: null, items: [{ id: 'a' }] });
    await montar(datos({ versiones: [borrador], borrador }), { hayPendientes: true });
    expect((q('completar-inventario-boton') as HTMLButtonElement).disabled).toBe(true);
    expect(q('completar-inventario')?.textContent).toContain('Sube lo pendiente antes de completar');
  });

  it('el borrador sin señal sube al inventario por versiones, no a la consignación', async () => {
    await montar(datos({}));
    expect(destinoRecibido).toBeDefined();
    await destinoRecibido!.guardar('cons-1', []);
    expect(reemplazar).toHaveBeenCalled();
  });
});
