import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const copiaDelContrato = vi.fn();
vi.mock('@/lib/api/inventario-del-inmueble.service', () => ({
  inventarioDelInmuebleApi: { copiaDelContrato: (id: string) => copiaDelContrato(id) },
}));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('@/components/inmobiliaria/ActaEntregaView', () => ({
  ActaEntregaView: (p: { inventoryItems: unknown[]; onAddItem?: unknown; onEditItem?: unknown; enlace?: { href: string } }) => (
    <div data-testid="acta" data-items={p.inventoryItems.length} data-editable={String(Boolean(p.onAddItem || p.onEditItem))} data-enlace={p.enlace?.href ?? ''} />
  ),
}));
vi.mock('@/components/ui/alerta-accionable', () => ({
  AlertaAccionable: (p: { titulo: string; children?: React.ReactNode; accion?: { href?: string }; 'data-testid'?: string }) => (
    <div data-testid={p['data-testid']} data-href={p.accion?.href ?? ''}>
      <strong>{p.titulo}</strong>
      {p.children}
    </div>
  ),
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: (p: { children?: React.ReactNode }) => <span data-testid="badge">{p.children}</span>,
}));
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: (p: { description: string }) => <p data-testid="vacio">{p.description}</p>,
}));

import { InventarioDelContrato } from './InventarioDelContrato';

let host: HTMLDivElement;
let root: Root;

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<InventarioDelContrato contratoId="c1" legado={<p data-testid="legado">lista de siempre</p>} />);
  });
}

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  copiaDelContrato.mockReset();
});

const q = (id: string) => host.querySelector(`[data-testid="${id}"]`);

describe('InventarioDelContrato', () => {
  it('muestra la copia fija, sin agregar ni editar, con enlace al inventario del inmueble', async () => {
    copiaDelContrato.mockResolvedValue({
      disponible: true, contractId: 'c1', consignacionId: 'cons-1',
      copia: {
        inventarioId: 'v3', version: 3, items: [{ id: 'a' }, { id: 'b' }],
        completadoEn: '2026-09-02T15:00:00Z', fijadoEn: '2026-09-03T15:00:00Z',
        firmaDelInquilino: { estado: 'PENDIENTE', firmadoPor: null, correo: null, firmadoEn: null, integra: null },
      },
      vigenciaDelInmueble: null,
    });
    await montar();
    expect(q('acta')?.getAttribute('data-items')).toBe('2');
    expect(q('acta')?.getAttribute('data-editable')).toBe('false');
    expect(q('acta')?.getAttribute('data-enlace')).toBe('/panel/inmobiliaria/inmuebles/cons-1#inventario');
    expect(q('copia-version')?.textContent).toContain('Versión 3');
    expect(q('legado')).toBeNull();
    // La firma del inquilino queda pendiente y visible, sin bloquear nada.
    expect(q('firma-del-inquilino')?.getAttribute('data-estado')).toBe('pendiente');
    expect(q('firma-del-inquilino')?.textContent).toContain('No impide activar el contrato');
  });

  it('firmada: dice quién y cuándo, y avisa si la copia no es la firmada', async () => {
    copiaDelContrato.mockResolvedValue({
      disponible: true, contractId: 'c1', consignacionId: 'cons-1',
      copia: {
        inventarioId: 'v3', version: 3, items: [], completadoEn: '2026-09-02T15:00:00Z', fijadoEn: '2026-09-03T15:00:00Z',
        firmaDelInquilino: { estado: 'FIRMADO', firmadoPor: 'Ana Ríos', correo: 'ana@x.co', firmadoEn: '2026-09-05T01:00:00Z', integra: false },
      },
      vigenciaDelInmueble: null,
    });
    await montar();
    const firma = q('firma-del-inquilino');
    expect(firma?.getAttribute('data-estado')).toBe('firmado');
    expect(firma?.textContent).toContain('Firmado por Ana Ríos el 4 de septiembre de 2026');
    expect(firma?.textContent).toContain('no coincide con lo que se firmó');
  });

  it('un contrato sin copia lo dice (no inventa una)', async () => {
    copiaDelContrato.mockResolvedValue({
      disponible: true, contractId: 'c1', consignacionId: 'cons-1', copia: null, vigenciaDelInmueble: null,
    });
    await montar();
    expect(q('vacio')?.textContent).toContain('no tiene copia del inventario');
    expect(q('acta')).toBeNull();
  });

  it('al terminar, la tarea «por actualizar» aparece con el enlace', async () => {
    copiaDelContrato.mockResolvedValue({
      disponible: true, contractId: 'c1', consignacionId: 'cons-1', copia: null,
      vigenciaDelInmueble: {
        vigente: false, motivo: 'ANTERIOR_AL_FIN_DEL_CONTRATO', inventarioVigenteId: null, ultimoCompleto: null,
        hayBorrador: false, porActualizarTras: { contratoId: 'c1', code: 5, externalId: null, terminoEl: '2026-09-10' },
      },
    });
    await montar();
    const tarea = q('tarea-inventario-por-actualizar');
    expect(tarea?.textContent).toContain('Inventario por actualizar tras el contrato #5');
    expect(tarea?.textContent).toContain('Este contrato terminó el 10 de septiembre de 2026');
    expect(tarea?.getAttribute('data-href')).toBe('/panel/inmobiliaria/inmuebles/cons-1#inventario');
  });

  it('sin la migración (o sin respuesta) monta lo de siempre', async () => {
    copiaDelContrato.mockResolvedValue({ disponible: false, contractId: 'c1', consignacionId: null, copia: null, vigenciaDelInmueble: null });
    await montar();
    expect(q('legado')).not.toBeNull();
    act(() => root.unmount());
    host.remove();
    copiaDelContrato.mockRejectedValue(new Error('sin señal'));
    await montar();
    expect(q('legado')).not.toBeNull();
  });
});
