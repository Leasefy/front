/**
 * El menú «Compartir» del estado de cuenta (auditoría de casos de error 13-09).
 *
 * El menú de Radix no se monta en pruebas (necesita eventos de puntero
 * reales), así que se reemplaza por botones llanos que llaman a `onSelect`: lo
 * que se prueba es qué hace cada ítem, no cómo se despliega.
 *
 *   · E1 — sin el permiso de VER ese documento, las acciones salen apagadas.
 *   · E2 — correo y WhatsApp no salen sin confirmar a quién y por dónde.
 *   · E3 — «Enlaces compartidos…» abre la lista.
 *   · E4 — con filtros, se dice que el enlace va entero.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api, toastMock, permisos } = vi.hoisted(() => ({
  api: { enviar: vi.fn(), compartir: vi.fn(), enlaces: vi.fn(), revocarEnlace: vi.fn() },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  permisos: {
    valor: { canAccess: vi.fn((_m: string, _a: string) => true) } as {
      canAccess: (m: string, a: string) => boolean;
    } | null,
  },
}));

vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: api }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}));
vi.mock('./textos', () => ({
  useTextoDelEstado: () => (clave: string) => clave,
  texto: (clave: string) => clave,
}));
vi.mock('./usar-pdf', () => ({
  useDescargarPdfDelEstado: () => ({ descargar: vi.fn(), armando: false }),
}));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownList: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownListTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownListContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownListSeparator: () => <hr />,
  DropdownListItem: ({
    children,
    onSelect,
    disabled,
    ...resto
  }: {
    children?: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onSelect?.()} {...resto}>
      {children}
    </button>
  ),
}));

import { CompartirEstadoDeCuenta } from './CompartirEstadoDeCuenta';

const DOC = {
  cliente: { nombre: 'JYC Inversiones', documento: '900123456', tipo: 'PROPIETARIO' },
  inmobiliaria: {},
  fecha: '2026-09-13',
  contratos: [],
  totales: {},
} as unknown as EstadoDeCuenta;

let host: HTMLDivElement;
let root: Root;

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function montar(props: Partial<React.ComponentProps<typeof CompartirEstadoDeCuenta>> = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(
      <CompartirEstadoDeCuenta
        doc={DOC}
        hoy="2026-09-13"
        tipo="propietario"
        id="prop-1"
        personaId="user-9"
        {...props}
      />,
    );
  });
}

const $ = (s: string) => document.querySelector<HTMLElement>(s);

async function clic(s: string) {
  const el = $(s);
  if (!el) throw new Error(`no encontré ${s}`);
  await act(async () => {
    el.click();
  });
  await esperar();
}

beforeEach(() => {
  api.enviar.mockReset().mockResolvedValue({
    enviado: true,
    destino: 'papas@jyc.co',
    canal: 'CORREO',
    enlace: { url: 'https://x', venceEl: '2026-10-13' },
  });
  api.enlaces.mockReset().mockResolvedValue([]);
  permisos.valor = { canAccess: vi.fn(() => true) };
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = '';
});

describe('<CompartirEstadoDeCuenta>', () => {
  it('🔴 E2: «Por correo» NO manda: pregunta a quién y por dónde', async () => {
    await montar();
    await clic('[data-testid="compartir-correo"]');

    expect(api.enviar).not.toHaveBeenCalled();
    const dialogo = $('[data-testid="confirmar-envio-dialogo"]')!;
    expect(dialogo.textContent).toContain('por correo a JYC Inversiones');
    expect($('[data-testid="confirmar-envio-detalle"]')!.textContent).toContain('900123456');
  });

  it('E2: confirmar manda por el canal pedido', async () => {
    await montar();
    await clic('[data-testid="compartir-whatsapp"]');
    expect($('[data-testid="confirmar-envio-dialogo"]')!.textContent).toContain('por WhatsApp');

    await clic('[data-testid="confirmar-envio"]');
    expect(api.enviar).toHaveBeenCalledWith('propietario', 'prop-1', 'WHATSAPP');
  });

  it('E2: cancelar no manda', async () => {
    await montar();
    await clic('[data-testid="compartir-correo"]');
    const cancelar = Array.from(
      $('[data-testid="confirmar-envio-dialogo"]')!.querySelectorAll('button'),
    ).find((b) => b.textContent === 'Cancelar')!;
    await act(async () => {
      cancelar.click();
    });
    await esperar();

    expect(api.enviar).not.toHaveBeenCalled();
    expect($('[data-testid="confirmar-envio-dialogo"]')).toBeNull();
  });

  it('🔴 E4: con filtros, los ítems del enlace y el diálogo dicen que va el documento entero', async () => {
    await montar({ nota: 'Filtrado: pendiente' });
    expect($('[data-testid="compartir-correo"]')!.textContent).toContain('Va el documento entero');
    expect($('[data-testid="compartir-enlace"]')!.textContent).toContain('Va el documento entero');
    // El PDF sí sale filtrado: no lleva la aclaración.
    expect($('[data-testid="compartir-pdf"]')!.textContent).not.toContain('entero');

    await clic('[data-testid="compartir-correo"]');
    expect($('[data-testid="confirmar-envio-filtros"]')!.textContent).toContain(
      'no la vista filtrada',
    );
  });

  it('E4: sin filtros no se agrega la aclaración', async () => {
    await montar();
    expect($('[data-testid="compartir-correo"]')!.textContent).not.toContain('entero');
  });

  it('🔴 E1: el del propietario pide `dispersiones:view`; sin él, las acciones salen apagadas y dicen por qué', async () => {
    const canAccess = vi.fn((modulo: string) => modulo !== 'dispersiones');
    permisos.valor = { canAccess };
    await montar();

    expect(canAccess).toHaveBeenCalledWith('dispersiones', 'view');
    for (const testid of ['compartir-correo', 'compartir-whatsapp', 'compartir-enlace', 'compartir-enlaces']) {
      const item = $(`[data-testid="${testid}"]`) as HTMLButtonElement;
      expect(item.disabled).toBe(true);
    }
    expect($('[data-testid="compartir-correo"]')!.textContent).toContain('Tu rol no puede compartir');
    // Bajar el PDF de lo que ya se ve en pantalla no pasa por el back.
    expect(($('[data-testid="compartir-pdf"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('E1: el del inquilino pide `cobros:view`', async () => {
    const canAccess = vi.fn(() => true);
    permisos.valor = { canAccess };
    await montar({ tipo: 'inquilino', id: 'tenant-1' });
    expect(canAccess).toHaveBeenCalledWith('cobros', 'view');
    expect(($('[data-testid="compartir-correo"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('E3: «Enlaces compartidos…» abre la lista de ese cliente', async () => {
    await montar();
    await clic('[data-testid="compartir-enlaces"]');
    await esperar();
    expect($('[data-testid="enlaces-compartidos"]')).not.toBeNull();
    expect(api.enlaces).toHaveBeenCalledWith('propietario', 'prop-1');
  });
});
