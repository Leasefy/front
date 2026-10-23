/**
 * Portofino 22-10-2026 (Juliana): «al hacer la solicitud, elegir con qué
 * proveedor vamos a trabajar». Lo que fijan estas pruebas:
 *   - es OPCIONAL: sin proveedores no estorba, ofrece registrar uno;
 *   - se escoge de la lista (los del oficio primero) y se puede quitar;
 *   - si no está, se registra ahí mismo con las reglas del documento, queda con
 *     el oficio de la solicitud y queda elegido;
 *   - un Enter en el registro NO envía la solicitud (está dentro de su <form>);
 *   - si ya estaba registrado con ese documento (409), se elige ése.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  api: { listar: vi.fn(), crear: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/api/proveedores-de-mantenimiento.service', () => ({ proveedoresDeMantenimientoApi: h.api }));
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }));
// El Combobox y el Select son de Radix (popover): en happy-dom, nativos con lo mismo.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    value,
    onChange,
    options,
  }: {
    value?: string;
    onChange: (v: string | undefined) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select data-testid="lista" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));
vi.mock('./TipoDeDocumentoDelProveedor', () => ({
  TipoDeDocumentoDelProveedor: ({ id, valor, onCambiar }: { id: string; valor: string; onCambiar: (t: string) => void }) => (
    <select id={id} value={valor} onChange={(e) => onCambiar(e.target.value)}>
      <option value="">Elige el tipo</option>
      <option value="CC">CC</option>
      <option value="NIT">NIT</option>
    </select>
  ),
}));

import { ProveedorDeLaSolicitud } from './ProveedorDeLaSolicitud';
import { ApiError } from '@/lib/api/client';

const PINTOR = { id: 'p-pintor', nombre: 'Pinturas Juan', documento: '71234567', telefono: null, correo: null, especialidades: ['PAINTING'], calificacion: null, avisos: [], activo: true };
const PLOMERO = { id: 'p-plomero', nombre: 'Plomería El Rayo', documento: '900123456-8', telefono: '3001112233', correo: 'rayo@x.co', especialidades: ['PLUMBING'], calificacion: 4.5, avisos: [], activo: true };

let container: HTMLDivElement;
let root: Root;
let elegido: string | undefined;
const onCambiar = vi.fn((id: string | undefined) => {
  elegido = id;
});
const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  elegido = undefined;
  onCambiar.mockClear();
  onSubmit.mockClear();
  h.api.listar.mockReset();
  h.api.crear.mockReset();
  Object.values(h.toast).forEach((f) => f.mockClear());
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function montar() {
  const pintar = () =>
    root.render(
      <form onSubmit={onSubmit}>
        <ProveedorDeLaSolicitud tipo="plumbing" valor={elegido} onCambiar={(id) => { onCambiar(id); pintar(); }} />
      </form>,
    );
  await act(async () => {
    pintar();
  });
  await act(async () => {
    await Promise.resolve();
  });
}

const q = <T extends Element = HTMLElement>(sel: string) => container.querySelector<T>(sel);
async function escribir(id: string, valor: string) {
  const el = q<HTMLInputElement>(`#${id}`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function elegir(sel: string, valor: string) {
  const el = q<HTMLSelectElement>(sel)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(el, valor);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function clic(el: Element | null) {
  await act(async () => {
    el!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('ProveedorDeLaSolicitud', () => {
  it('sin proveedores no estorba: lo dice y ofrece registrar uno', async () => {
    h.api.listar.mockResolvedValue([]);
    await montar();
    expect(container.textContent).toContain('Todavía no tienes proveedores registrados.');
    expect(q('[data-testid="proveedor-registrar-primero"]')).not.toBeNull();
    expect(q('[data-testid="lista"]')).toBeNull();
  });

  it('los del oficio de la solicitud salen primero, y al escoger se elige', async () => {
    h.api.listar.mockResolvedValue([PINTOR, PLOMERO]);
    await montar();
    const opciones = Array.from(container.querySelectorAll('[data-testid="lista"] option')).map((o) => o.textContent);
    expect(opciones[1]).toContain('Plomería El Rayo');
    expect(opciones[1]).toContain('4,5 ★');
    expect(opciones[opciones.length - 1]).toBe('+ Registrar un proveedor nuevo');
    await elegir('[data-testid="lista"]', 'p-plomero');
    expect(onCambiar).toHaveBeenLastCalledWith('p-plomero');
    expect(q('[data-testid="proveedor-elegido-avisos"]')?.textContent).toContain('3001112233');
    await clic(q('[data-testid="proveedor-de-la-solicitud-quitar"]'));
    expect(onCambiar).toHaveBeenLastCalledWith(undefined);
  });

  it('registrar uno nuevo: revisa el documento, queda con el oficio y elegido', async () => {
    h.api.listar.mockResolvedValue([]);
    h.api.crear.mockImplementation((d: { nombre: string }) =>
      Promise.resolve({ ...PLOMERO, id: 'p-nuevo', nombre: d.nombre }),
    );
    await montar();
    await clic(q('[data-testid="proveedor-registrar-primero"]'));
    await escribir('proveedor-nuevo-nombre', 'Leon');
    await elegir('#proveedor-nuevo-tipoDocumento', 'CC');
    await escribir('proveedor-nuevo-documento', '123');
    await clic(q('[data-testid="proveedor-nuevo-registrar"]'));
    expect(h.api.crear).not.toHaveBeenCalled();
    expect(q('#proveedor-nuevo-documento-error')?.textContent).toBe('Ese tipo de documento lleva entre 6 y 10 dígitos.');
    expect(q('#proveedor-nuevo-nombre-error')?.textContent).toBe('Escribe el nombre completo de la persona: nombre y apellido.');

    await escribir('proveedor-nuevo-nombre', 'Leon Restrepo');
    await escribir('proveedor-nuevo-documento', '71.234.567');
    await escribir('proveedor-nuevo-correo', 'LEON@Correo.co');
    await clic(q('[data-testid="proveedor-nuevo-registrar"]'));
    expect(h.api.crear).toHaveBeenCalledWith({
      nombre: 'Leon Restrepo',
      tipoDocumento: 'CC',
      documento: '71234567',
      correo: 'leon@correo.co',
      especialidades: ['PLUMBING'],
    });
    expect(onCambiar).toHaveBeenLastCalledWith('p-nuevo');
    expect(q('[data-testid="proveedor-nuevo"]')).toBeNull();
  });

  it('un Enter en el registro registra y NO envía la solicitud', async () => {
    h.api.listar.mockResolvedValue([]);
    h.api.crear.mockResolvedValue({ ...PLOMERO, id: 'p-nuevo' });
    await montar();
    await clic(q('[data-testid="proveedor-registrar-primero"]'));
    await escribir('proveedor-nuevo-nombre', 'Plomería El Rayo');
    await elegir('#proveedor-nuevo-tipoDocumento', 'NIT');
    await escribir('proveedor-nuevo-documento', '900123456');
    await act(async () => {
      q('#proveedor-nuevo-documento')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(h.api.crear).toHaveBeenCalledWith(expect.objectContaining({ documento: '900123456-8', tipoDocumento: 'NIT' }));
  });

  it('si ya estaba registrado con ese documento (409), se elige ése', async () => {
    h.api.listar.mockResolvedValue([PLOMERO]);
    h.api.crear.mockRejectedValue(new ApiError(409, 'Ya tienes un proveedor con el documento 900123456-8', 'PROVEEDOR_DUPLICADO'));
    await montar();
    await elegir('[data-testid="lista"]', '__nuevo__');
    await escribir('proveedor-nuevo-nombre', 'Plomería El Rayo');
    await elegir('#proveedor-nuevo-tipoDocumento', 'NIT');
    await escribir('proveedor-nuevo-documento', '900123456-8');
    await clic(q('[data-testid="proveedor-nuevo-registrar"]'));
    expect(onCambiar).toHaveBeenLastCalledWith('p-plomero');
    expect(h.toast.info).toHaveBeenCalledWith('Plomería El Rayo ya estaba en Proveedores', expect.anything());
  });
});
