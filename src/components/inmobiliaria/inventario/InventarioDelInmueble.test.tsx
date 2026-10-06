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
const toastError = vi.fn();
let destinoRecibido: { guardar: (id: string, items: unknown[]) => Promise<void> } | undefined;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: (...a: unknown[]) => toastError(...a) },
}));
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

async function montar(
  d: InventariosDelInmueble | null,
  borrador: Record<string, unknown> = {},
  extra: { volverAlContrato?: string | null; puedeEditar?: boolean } = {},
) {
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
        puedeEditar={extra.puedeEditar ?? true}
        volverAlContrato={extra.volverAlContrato}
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
    // 🔴 «El inventario por versiones todavía no está activado» era jerga
    // nuestra (Nico, 18-09-2026: «¿qué es eso?»). Ahora dice qué pasa en la
    // práctica, que es lo único que le sirve a quien administra el inmueble.
    expect(host.textContent).not.toContain('por versiones');
    expect(host.textContent).toContain('un solo inventario');
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

  /**
   * Sistema de errores, tanda 2 (02-10-2026): la descripción del toast era
   * `err.message` crudo. Un 500 decía «Internal server error» y la red,
   * «Failed to fetch».
   */
  describe('el error al completar', () => {
    async function completarConError(error: unknown) {
      const borrador = version({ id: 'v2', version: 2, estado: 'BORRADOR', completadoEn: null, items: [{ id: 'a' }] });
      completar.mockRejectedValue(error);
      await montar(datos({ versiones: [borrador], borrador }));
      await act(async () => {
        (q('completar-inventario-boton') as HTMLButtonElement).click();
      });
      return (toastError.mock.calls[0]?.[1] as { description?: string } | undefined)?.description ?? '';
    }

    it('🔴 un 5xx dice «de nuestro lado» con la referencia, nunca «Internal server error»', async () => {
      const { ApiError } = await import('@/lib/api/client');
      const descripcion = await completarConError(
        new ApiError(500, 'Internal server error', 'ERROR_INTERNO', {
          code: 'ERROR_INTERNO', message: 'Internal server error', referencia: '77aa77aa',
        }),
      );
      expect(descripcion).toMatch(/^No pudimos completar el inventario: algo falló de nuestro lado/);
      expect(descripcion).toContain('77aa77aa');
      expect(descripcion).not.toContain('Internal server error');
    });

    it('un 409 que explica el back se dice tal cual', async () => {
      const { ApiError } = await import('@/lib/api/client');
      const descripcion = await completarConError(
        new ApiError(409, 'El borrador cambió mientras lo completabas: vuelve a abrirlo.', 'BORRADOR_CAMBIO'),
      );
      expect(descripcion).toBe('El borrador cambió mientras lo completabas: vuelve a abrirlo.');
    });

    it('sin respuesta habla de la conexión, no «Failed to fetch»', async () => {
      const descripcion = await completarConError(new TypeError('Failed to fetch'));
      expect(descripcion).toMatch(/conexión/);
      expect(descripcion).not.toContain('Failed to fetch');
    });
  });

  it('el borrador sin señal sube al inventario por versiones, no a la consignación', async () => {
    await montar(datos({}));
    expect(destinoRecibido).toBeDefined();
    await destinoRecibido!.guardar('cons-1', []);
    expect(reemplazar).toHaveBeenCalled();
  });

  /*
   * IN-07 (QA 04-10): sin inventario la tarjeta decía lo mismo tres veces (el
   * aviso, el encabezado y la tabla vacía, más el historial vacío). Ahora es
   * UN estado vacío con la acción para empezar.
   */
  it('🔴 IN-07: sin ningún inventario hay UN solo estado vacío, con «Empezar el inventario»', async () => {
    await montar(datos({ vigencia: { vigente: false, motivo: 'SIN_INVENTARIO', ultimoCompleto: null, porActualizarTras: null } as never }))
    const vacio = q('inventario-vacio')!;
    expect(vacio).not.toBeNull();
    expect(vacio.textContent).toContain('Este inmueble todavía no tiene inventario');
    expect(vacio.textContent).toContain('Empezar el inventario');
    // Ni el aviso de vigencia, ni el encabezado de versión, ni la tabla vacía, ni el historial vacío.
    expect(q('aviso-inventario-info')).toBeNull();
    expect(q('encabezado-de-version')).toBeNull();
    expect(q('acta')).toBeNull();
    expect(q('historial')).toBeNull();
    expect(host.textContent).not.toContain('Todavía no hay inventario');
    expect(host.textContent!.match(/no tiene inventario/g)?.length).toBe(1);
  });

  it('sin permiso de editar, el vacío no ofrece empezar', async () => {
    await montar(datos({}), {}, { puedeEditar: false });
    expect(q('inventario-vacio')?.textContent).not.toContain('Empezar el inventario');
  });

  it('con un borrador ya empezado se ve la tabla de siempre, no el vacío', async () => {
    await montar(datos({ borrador: version({ id: 'b', estado: 'BORRADOR', items: [{ id: 'i', name: 'Nevera', quantity: 1, condition: 'good' }] }) as never, versiones: [version({ id: 'b', estado: 'BORRADOR' })] }));
    expect(q('inventario-vacio')).toBeNull();
    expect(q('acta')).not.toBeNull();
  });

  it('desde «Nuevo contrato» ofrece volver al contrato', async () => {
    await montar(datos({}), {}, { volverAlContrato: '/panel/inmobiliaria/contratos/nuevo?inmueble=p1' });
    expect(q('volver-al-contrato')?.textContent).toContain('cuando completes el inventario');
  });
});
